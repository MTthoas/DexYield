use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer, transfer, Mint};
use lending;

declare_id!("Ch5VcDt2E84VZXpH6oeAhK9c5ordEpdCUvyT6GSvJseg");

#[program]
pub mod marketplace {
    use super::*;

    pub fn list_yt(
        ctx: Context<ListYT>,
        price: u64,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(price > 0, ErrorCode::InvalidPrice);
        require!(ctx.accounts.yt_token_account.amount >= amount, ErrorCode::InsufficientFunds);

        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.seller.key();
        listing.yt_mint = ctx.accounts.yt_token_account.mint;
        listing.amount = amount;
        listing.price = price;
        listing.active = true;
        listing.created_at = Clock::get()?.unix_timestamp;

        // Transfert des YT vers l'escrow
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.yt_token_account.to_account_info(),
                to: ctx.accounts.escrow_account.to_account_info(),
                authority: ctx.accounts.seller.to_account_info(),
            },
        );
        transfer(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn buy_yt(ctx: Context<BuyYT>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.active, ErrorCode::ListingNotActive);
        require!(ctx.accounts.buyer_token_account.amount >= listing.price, ErrorCode::InsufficientPayment);
        require!(ctx.accounts.buyer.key() != listing.seller, ErrorCode::CannotBuyOwnListing);

        // Vérifier que la liste est toujours valide (protection contre les front-running)
        let current_time = Clock::get()?.unix_timestamp;
        let listing_duration = 7 * 24 * 60 * 60; // 7 jours en secondes
        require!(current_time - listing.created_at <= listing_duration, ErrorCode::ListingExpired);

        listing.active = false;

        let pool_key = ctx.accounts.pool.key();
        let seeds = &[
            b"authority",
            pool_key.as_ref(),
            &[ctx.bumps.pool_authority],
        ];
        let signer = &[&seeds[..]];

        // Transfert des YT du compte escrow vers l'acheteur
        let yt_transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_account.to_account_info(),
                to: ctx.accounts.buyer_yt_account.to_account_info(),
                authority: ctx.accounts.escrow_authority.to_account_info(),
            },
            signer,
        );
        transfer(yt_transfer_ctx, listing.amount)?;

        // Transfert du paiement en USDC vers le vendeur
        let usdc_transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer_token_account.to_account_info(),
                to: ctx.accounts.seller_token_account.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        );
        transfer(usdc_transfer_ctx, listing.price)?;

        Ok(())
    }

    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.active, ErrorCode::ListingNotActive);
        listing.active = false;

        let escrow_seeds: &[&[u8]] = &[
            b"escrow",
            listing.seller.as_ref(),
            &[ctx.bumps.escrow_authority],
        ];
        let signer_seeds: &[&[&[u8]]] = &[escrow_seeds];

        // Transfert des YT du compte escrow vers le vendeur
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_account.to_account_info(),
                to: ctx.accounts.seller_token_account.to_account_info(),
                authority: ctx.accounts.escrow_authority.to_account_info(),
            },
            signer_seeds,
        );
        transfer(transfer_ctx, listing.amount)?;

        Ok(())
    }

    pub fn create_strategy(
        ctx: Context<CreateStrategy>,
        reward_apy: u64, // 10_000 = 10.00%
    ) -> Result<()> {
        require!(reward_apy <= 100_000, ErrorCode::InvalidAPY);

        let strategy = &mut ctx.accounts.strategy;
        strategy.token_address = ctx.accounts.token_address.key();
        strategy.reward_apy = reward_apy;
        strategy.created_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn redeem(ctx: Context<Redeem>, amount: u64) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp;
        let user_deposit = &mut ctx.accounts.user_deposit;
        require!(user_deposit.amount >= amount, ErrorCode::InsufficientFunds);

        let time_elapsed = current_time - user_deposit.deposit_time;
        let reward = amount
            .checked_mul(ctx.accounts.strategy.reward_apy)
            .unwrap()
            .checked_mul(time_elapsed as u64)
            .unwrap()
            / (365 * 24 * 3600 * 10000);

        // Transfert du YT depuis le vault vers l'utilisateur
        let pool_key = ctx.accounts.pool.key();
        let signer_seeds: &[&[u8]] = &[
            b"authority",
            pool_key.as_ref(),
            &[ctx.bumps.pool_authority],
        ];
        let signer: &[&[&[u8]]] = &[signer_seeds];

        let transfer_yt_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
            signer,
        );
        transfer(transfer_yt_ctx, amount)?;

        // Transfert du paiement en USDC vers l'utilisateur
        let transfer_usdc_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_account.to_account_info(),
                to: ctx.accounts.user_usdc_account.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
            signer,
        );
        transfer(transfer_usdc_ctx, reward)?;

        user_deposit.amount = user_deposit.amount.checked_sub(amount).unwrap();

        Ok(())
    }
}

#[derive(Accounts)]
pub struct ListYT<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(mut)]
    pub yt_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = seller,
        seeds = [b"listing", seller.key().as_ref()],
        bump,
        space = 8 + Listing::INIT_SPACE,
    )]
    pub listing: Account<'info, Listing>,

    #[account(mut)]
    pub escrow_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyYT<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub buyer_yt_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"listing", listing.seller.as_ref()], bump)]
    pub listing: Account<'info, Listing>,

    #[account(mut)]
    pub escrow_account: Account<'info, TokenAccount>,

    /// CHECK: PDA utilisée uniquement comme signer
    #[account(seeds = [b"escrow", listing.seller.as_ref()], bump)]
    pub escrow_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub pool: Account<'info, lending::Pool>,

    #[account(mut)]
    pub yt_mint: Account<'info, Mint>,

    /// CHECK: PDA utilisée uniquement comme signer
    #[account(seeds = [b"authority", pool.key().as_ref()], bump)]
    pub pool_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,

    pub lending_program: Program<'info, lending::program::Lending>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(mut, seeds = [b"listing", seller.key().as_ref()], bump)]
    pub listing: Account<'info, Listing>,

    #[account(mut)]
    pub escrow_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA utilisée uniquement comme signer
    #[account(seeds = [b"escrow", seller.key().as_ref()], bump)]
    pub escrow_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CreateStrategy<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        seeds = [b"strategy", token_address.key().as_ref()],
        bump,
        space = 8 + Strategy::INIT_SPACE
    )]
    pub strategy: Account<'info, Strategy>,

    pub token_address: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"lending_pool", pool.owner.as_ref()],
        bump
    )]
    pub pool: Account<'info, lending::Pool>,

    #[account(
        mut,
        seeds = [b"user_deposit", user.key().as_ref(), pool.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, lending::UserDeposit>,

    #[account(
        seeds = [b"strategy", yt_mint.key().as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,

    #[account(mut)]
    pub yt_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_usdc_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_account: Account<'info, TokenAccount>,

    /// CHECK: Cette PDA est utilisée uniquement comme signer du vault
    #[account(
        seeds = [b"authority", pool.key().as_ref()],
        bump
    )]
    pub pool_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Listing {
    pub seller: Pubkey,
    pub yt_mint: Pubkey,
    pub amount: u64,
    pub price: u64,
    pub active: bool,
    pub created_at: i64,
}

impl Listing {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 8 + 1 + 8;
}

#[account]
pub struct Strategy {
    pub token_address: Pubkey,
    pub reward_apy: u64, // 5% = 5000 (2 décimales)
    pub created_at: i64,
}

impl Strategy {
    pub const INIT_SPACE: usize = 32 + 8 + 8;
}

#[error_code]
pub enum ErrorCode {
    #[msg("La vente n'est plus active.")]
    ListingNotActive,
    #[msg("Le compte de paiement de l'acheteur est insuffisant.")]
    InsufficientPayment,
    #[msg("APY invalide")]
    InvalidAPY,
    #[msg("Fonds insuffisants.")]
    InsufficientFunds,
    #[msg("Montant invalide.")]
    InvalidAmount,
    #[msg("Prix invalide.")]
    InvalidPrice,
    #[msg("Impossible d'acheter sa propre annonce.")]
    CannotBuyOwnListing,
    #[msg("L'annonce a expiré.")]
    ListingExpired,
}
