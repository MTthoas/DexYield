use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer, transfer};

declare_id!("Ch5VcDt2E84VZXpH6oeAhK9c5ordEpdCUvyT6GSvJseg");

#[program]
pub mod marketplace {
    use super::*;

    pub fn list_yt(
        ctx: Context<ListYT>,
        price: u64,
        amount: u64,
    ) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.seller.key();
        listing.yt_mint = ctx.accounts.yt_token_account.mint;
        listing.amount = amount;
        listing.price = price;
        listing.active = true;

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

        listing.active = false;

        let escrow_seeds: &[&[u8]] = &[
            b"escrow",
            listing.seller.as_ref(),
            &[ctx.bumps.escrow_authority],
        ];
        let signer_seeds: &[&[&[u8]]] = &[escrow_seeds];

        // Transfert des YT du compte escrow vers l'acheteur
        let yt_transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_account.to_account_info(),
                to: ctx.accounts.buyer_yt_account.to_account_info(),
                authority: ctx.accounts.escrow_authority.to_account_info(),
            },
            signer_seeds,
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

    pub token_program: Program<'info, Token>,
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

#[account]
pub struct Listing {
    pub seller: Pubkey,
    pub yt_mint: Pubkey,
    pub amount: u64,
    pub price: u64,
    pub active: bool,
}

impl Listing {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 8 + 1;
}

#[error_code]
pub enum ErrorCode {
    #[msg("La vente n'est plus active.")]
    ListingNotActive,
    #[msg("Le compte de paiement de l'acheteur est insuffisant.")]
    InsufficientPayment,
}
