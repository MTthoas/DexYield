// Importation des modules Anchor nécessaires
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer, transfer};

// Identifiant du programme marketplace
declare_id!("9B1oveu4aVQjxboVRa4FYB9iqtbBoQhHy9FNrKNzSM8c");

#[program]
pub mod marketplace {
    use super::*;

    /// Liste des YT tokens à vendre sur le marketplace
    pub fn list_yt(
        ctx: Context<ListYT>,
        price: u64,
        amount: u64,
    ) -> Result<()> {
        // Vérifie les paramètres
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(price > 0, ErrorCode::InvalidPrice);
        require!(ctx.accounts.yt_token_account.amount >= amount, ErrorCode::InsufficientFunds);

        // Remplit la structure Listing
        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.seller.key();
        listing.yt_mint = ctx.accounts.yt_token_account.mint;
        listing.amount = amount;
        listing.price = price;
        listing.active = true;
        listing.created_at = Clock::get()?.unix_timestamp;

        // Transfert des YT vers le compte escrow
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

    /// Permet d'acheter des YT listés
    pub fn buy_yt(ctx: Context<BuyYT>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        // Vérifie que la vente est active et que l'acheteur a assez de fonds
        require!(listing.active, ErrorCode::ListingNotActive);
        require!(ctx.accounts.buyer_token_account.amount >= listing.price, ErrorCode::InsufficientPayment);
        require!(ctx.accounts.buyer.key() != listing.seller, ErrorCode::CannotBuyOwnListing);

        // Vérifie que la vente n'a pas expiré
        let current_time = Clock::get()?.unix_timestamp;
        let listing_duration = 7 * 24 * 60 * 60; // 7 jours
        require!(current_time - listing.created_at <= listing_duration, ErrorCode::ListingExpired);

        // Désactive la vente
        listing.active = false;

        // Prépare les seeds pour signer le transfert depuis l'escrow
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

    /// Permet au vendeur d'annuler sa vente et de récupérer ses YT
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

/// Comptes nécessaires pour lister des YT
#[derive(Accounts)]
pub struct ListYT<'info> {
    #[account(mut)]
    pub seller: Signer<'info>, // Vendeur

    #[account(mut)]
    pub yt_token_account: Account<'info, TokenAccount>, // Compte YT du vendeur

    #[account(
        init,
        payer = seller,
        seeds = [b"listing", seller.key().as_ref()],
        bump,
        space = 8 + Listing::INIT_SPACE,
    )]
    pub listing: Account<'info, Listing>, // Compte d'annonce

    #[account(mut)]
    pub escrow_account: Account<'info, TokenAccount>, // Compte escrow pour YT

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// Comptes nécessaires pour acheter des YT
#[derive(Accounts)]
pub struct BuyYT<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>, // Acheteur

    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>, // Compte USDC de l'acheteur

    #[account(mut)]
    pub buyer_yt_account: Account<'info, TokenAccount>, // Compte YT de l'acheteur

    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>, // Compte USDC du vendeur

    #[account(mut, seeds = [b"listing", listing.seller.as_ref()], bump)]
    pub listing: Account<'info, Listing>, // Compte d'annonce

    #[account(mut)]
    pub escrow_account: Account<'info, TokenAccount>, // Compte escrow YT

    /// CHECK: PDA utilisée uniquement comme signer
    #[account(seeds = [b"escrow", listing.seller.as_ref()], bump)]
    pub escrow_authority: UncheckedAccount<'info>, // Autorité escrow

    pub token_program: Program<'info, Token>,
}

/// Comptes nécessaires pour annuler une vente YT
#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(mut)]
    pub seller: Signer<'info>, // Vendeur

    #[account(mut, seeds = [b"listing", seller.key().as_ref()], bump)]
    pub listing: Account<'info, Listing>, // Compte d'annonce

    #[account(mut)]
    pub escrow_account: Account<'info, TokenAccount>, // Compte escrow YT

    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>, // Compte YT du vendeur

    /// CHECK: PDA utilisée uniquement comme signer
    #[account(seeds = [b"escrow", seller.key().as_ref()], bump)]
    pub escrow_authority: UncheckedAccount<'info>, // Autorité escrow

    pub token_program: Program<'info, Token>,
}

/// Structure représentant une annonce de vente YT
#[account]
pub struct Listing {
    pub seller: Pubkey,      // Adresse du vendeur
    pub yt_mint: Pubkey,    // Mint du token YT
    pub amount: u64,        // Quantité de YT à vendre
    pub price: u64,         // Prix en USDC
    pub active: bool,       // Statut actif/inactif
    pub created_at: i64,    // Timestamp de création
}

impl Listing {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 8 + 1 + 8;
}

/// Enumération des erreurs du programme marketplace
#[error_code]
pub enum ErrorCode {
    #[msg("La vente n'est plus active.")]
    ListingNotActive,
    #[msg("Le compte de paiement de l'acheteur est insuffisant.")]
    InsufficientPayment,
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