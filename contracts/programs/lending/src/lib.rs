use anchor_lang::prelude::*;
use anchor_lang::prelude::Program;
use anchor_lang::ToAccountInfos;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::{Mint, Token, TokenAccount, MintTo, mint_to, Transfer, transfer};
const YIELD_RATE: u64 = 10; // 10% de rendement pour l'exemple

pub mod error;
use error::ErrorCode;

declare_id!("BZUEgp9psZegJarKqAH5WC6HSYCQ4fY2XphuCd5RsyeF");

#[program]
pub mod lending {
    use super::*;
    
    pub fn initialize_lending_pool(ctx: Context<InitializeLendingPool>) -> Result<()> {
        let lending_pool = &mut ctx.accounts.pool;
        lending_pool.owner = *ctx.accounts.creator.key;
        lending_pool.total_deposits = 0;
        lending_pool.vault_account = ctx.accounts.vault_account.key();
        Ok(())
    }

    pub fn initialize_user_deposit(ctx: Context<InitializeUserDeposit>) -> Result<()> {
        let user_deposit = &mut ctx.accounts.user_deposit;
        user_deposit.user = *ctx.accounts.user.key;
        user_deposit.pool = ctx.accounts.pool.key();
        user_deposit.strategy = ctx.accounts.strategy.key();
        user_deposit.amount = 0;
        user_deposit.deposit_time = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let user_deposit = &mut ctx.accounts.user_deposit;
        let strategy = &ctx.accounts.strategy;

        // Vérifie que la stratégie du compte correspond à celle passée
        require_keys_eq!(user_deposit.strategy, strategy.key(), ErrorCode::InvalidStrategy);

        pool.total_deposits += amount;
        user_deposit.amount += amount;
        // Met à jour le timestamp à chaque dépôt
        user_deposit.deposit_time = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let user_deposit = &mut ctx.accounts.user_deposit;

        if user_deposit.amount < amount {
            return Err(ErrorCode::InsufficientFunds.into());
        }

        pool.total_deposits -= amount;
        user_deposit.amount -= amount;

        Ok(())
    }

    pub fn get_user_balance(ctx: Context<GetUserBalance>) -> Result<u64> {
        Ok(ctx.accounts.user_deposit.amount)
    }

    pub fn get_total_deposits(ctx: Context<GetTotalDeposits>) -> Result<u64> {
        Ok(ctx.accounts.pool.total_deposits)
    }

    /// Mint des Yield Tokens (YT) à l'utilisateur à partir du dépôt.
    pub fn mint_yield_token(ctx: Context<MintYieldToken>, amount: u64) -> Result<()> {
        // Appel à l'instruction standard pour mint un token SPL
        let cpi_accounts = MintTo {
            mint: ctx.accounts.yt_mint.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };

        // Génère les seeds pour la PDA d'autorité du mint
        let pool_key = ctx.accounts.pool.key();
        let seeds = &[
            b"authority",
            pool_key.as_ref(),
            &[ctx.bumps.mint_authority],
        ];
        let signer = &[&seeds[..]];

        // Crée le contexte CPI avec le signer PDA
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );

        // Mint le même montant de YT que l'utilisateur a déposé
        mint_to(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn redeem(ctx: Context<Redeem>) -> Result<()> {
        let user_deposit = &mut ctx.accounts.user_deposit;
        let current_time = Clock::get()?.unix_timestamp;
        let min_duration: i64 = 60 * 60 * 24 * 7; // 7 jours

        // Vérifie que la stratégie passée correspond à celle du dépôt
        require_keys_eq!(user_deposit.strategy, ctx.accounts.strategy.key(), ErrorCode::InvalidStrategy);

        if current_time - user_deposit.deposit_time < min_duration {
            return Err(ErrorCode::TooEarlyToRedeem.into());
        }

        let amount = user_deposit.amount;

        // Burn les YT
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Burn {
                mint: ctx.accounts.yt_mint.to_account_info(),
                from: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        anchor_spl::token::burn(burn_ctx, amount)?;

        // Calcul du montant à transférer avec un rendement dynamique basé sur la stratégie
        let time_elapsed = current_time - user_deposit.deposit_time;
        let reward = amount
            .checked_mul(ctx.accounts.strategy.reward_apy)
            .ok_or(ErrorCode::CalculationError)?
            .checked_mul(time_elapsed as u64)
            .ok_or(ErrorCode::CalculationError)?
            / (365 * 24 * 3600 * 10000);
        let yield_amount = amount + reward;

        // Transfert du vault vers l'utilisateur
        let pool_key = ctx.accounts.pool.key();
        let authority_seeds = &[
            b"authority",
            pool_key.as_ref(),
            &[ctx.bumps.pool_authority],
        ];
            
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_account.to_account_info(),
                to: ctx.accounts.user_usdc_account.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
        );
        let signer_seeds = [&authority_seeds[..]];
        let transfer_ctx = transfer_ctx.with_signer(&signer_seeds);
        transfer(transfer_ctx, yield_amount)?;

        user_deposit.amount = 0;

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
}


#[derive(Accounts)]
pub struct InitializeLendingPool<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        seeds = [b"lending_pool", creator.key().as_ref()],
        bump,
        space = Pool::INIT_SPACE
    )]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub vault_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeUserDeposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"lending_pool", pool.owner.as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        init,
        payer = user,
        space = UserDeposit::INIT_SPACE,
        seeds = [b"user_deposit", user.key().as_ref(), pool.key().as_ref(), strategy.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,

    #[account(
        seeds = [b"strategy", strategy.key().as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"lending_pool", pool.owner.as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"user_deposit", user.key().as_ref(), pool.key().as_ref(), strategy.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,

    #[account(
        seeds = [b"strategy", strategy.key().as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"lending_pool", pool.owner.as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"user_deposit", user.key().as_ref(), pool.key().as_ref(), strategy.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,

    #[account(
        seeds = [b"strategy", strategy.key().as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,
}

#[derive(Accounts)]
pub struct GetUserBalance<'info> {
    pub user: Signer<'info>,

    #[account(
        seeds = [b"lending_pool", pool.owner.as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    #[account(
        seeds = [b"user_deposit", user.key().as_ref(), pool.key().as_ref(), strategy.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,

    #[account(
        seeds = [b"strategy", strategy.key().as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,
}

#[derive(Accounts)]
pub struct GetTotalDeposits<'info> {
    #[account(
        seeds = [b"lending_pool", pool.owner.as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,
}

#[account]
pub struct Pool {
    pub owner: Pubkey,
    pub total_deposits: u64,
    pub vault_account: Pubkey,
}

impl Pool {
    pub const INIT_SPACE: usize = 8 + 32 + 8 + 32;
}

#[account]
pub struct UserDeposit {
    pub user: Pubkey,
    pub pool: Pubkey,
    pub strategy: Pubkey, // Ajout du lien explicite à la stratégie
    pub amount: u64,
    pub deposit_time: i64,
}

impl UserDeposit {
    pub const INIT_SPACE: usize = 8 + 32 + 32 + 32 + 8 + 8; // Ajout 32 pour strategy
}

// Nouvelle struct de stratégie
#[account]
pub struct Strategy {
    pub token_address: Pubkey,
    pub reward_apy: u64, // 5% = 5000 (2 décimales)
    pub created_at: i64,
}

impl Strategy {
    pub const INIT_SPACE: usize = 32 + 8 + 8;
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

// Contexte pour mint des Yield Tokens à un utilisateur
#[derive(Accounts)]
pub struct MintYieldToken<'info> {
    #[account(
        mut,
        seeds = [b"lending_pool", pool.owner.as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    // Compte représentant le mint des Yield Tokens
    #[account(mut)]
    pub yt_mint: Account<'info, Mint>,

    // Autorité qui a le droit de mint (PDA)
    /// CHECK: Ce compte est une PDA utilisée uniquement comme signer
    #[account(
        seeds = [b"authority", pool.key().as_ref()],
        bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    // Compte token SPL de l'utilisateur où envoyer les YT
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
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
    pub pool: Account<'info, Pool>,

    #[account(
        mut,
        seeds = [b"user_deposit", user.key().as_ref(), pool.key().as_ref(), strategy.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,

    #[account(
        seeds = [b"strategy", strategy.key().as_ref()],
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