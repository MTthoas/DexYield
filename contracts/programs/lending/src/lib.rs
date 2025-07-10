use anchor_lang::prelude::*;
use anchor_lang::prelude::Program;
use anchor_spl::token::{Mint, Token, TokenAccount, MintTo, mint_to, Transfer, transfer, Burn, burn};
const MIN_DEPOSIT: u64 = 1_000_000; // 1 USDC minimum

pub mod error;
use error::ErrorCode;

declare_id!("GBhdq8ypCAdTEqPLm4ZQA4mSUjHik7U43FMoou3qwLxo");

#[program]
pub mod lending {
    use super::*;
    
    pub fn initialize_lending_pool(ctx: Context<InitializeLendingPool>) -> Result<()> {
        let lending_pool = &mut ctx.accounts.pool;
        lending_pool.owner = *ctx.accounts.creator.key;
        lending_pool.total_deposits = 0;
        lending_pool.total_yield_distributed = 0;
        lending_pool.vault_account = ctx.accounts.vault_account.key();
        lending_pool.yt_mint = ctx.accounts.yt_mint.key(); // Stocker l'adresse du mint YT
        lending_pool.created_at = Clock::get()?.unix_timestamp;
        lending_pool.active = true;

        // Le mint YT est automatiquement initialisé par Anchor grâce aux attributs mint::
        Ok(())
    }

    pub fn initialize_user_deposit(ctx: Context<InitializeUserDeposit>) -> Result<()> {
        let user_deposit = &mut ctx.accounts.user_deposit;
        user_deposit.user = *ctx.accounts.user.key;
        user_deposit.pool = ctx.accounts.pool.key();
        user_deposit.strategy = ctx.accounts.strategy.key();
        user_deposit.amount = 0;
        user_deposit.yield_earned = 0;
        user_deposit.deposit_time = Clock::get()?.unix_timestamp;
        user_deposit.last_yield_calculation = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount >= MIN_DEPOSIT, ErrorCode::InsufficientDepositAmount);
        require!(ctx.accounts.pool.active, ErrorCode::PoolInactive);
        
        let pool = &mut ctx.accounts.pool;
        let user_deposit = &mut ctx.accounts.user_deposit;
        let strategy = &ctx.accounts.strategy;

        // Vérifie que la stratégie du compte correspond à celle passée
        require_keys_eq!(user_deposit.strategy, strategy.key(), ErrorCode::InvalidStrategy);

        // Calcule le yield accumulé avant d'ajouter le nouveau dépôt
        let current_time = Clock::get()?.unix_timestamp;
        let time_elapsed = current_time - user_deposit.last_yield_calculation;
        if time_elapsed > 0 && user_deposit.amount > 0 {
            let yield_earned = user_deposit.amount
                .checked_mul(strategy.reward_apy)
                .ok_or(ErrorCode::CalculationError)?
                .checked_mul(time_elapsed as u64)
                .ok_or(ErrorCode::CalculationError)?
                / (365 * 24 * 3600 * 10000);
            
            user_deposit.yield_earned = user_deposit.yield_earned
                .checked_add(yield_earned)
                .ok_or(ErrorCode::CalculationError)?;
        }

        // Transfert des tokens du user vers le vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        transfer(transfer_ctx, amount)?;

        pool.total_deposits = pool.total_deposits.checked_add(amount).ok_or(ErrorCode::CalculationError)?;
        user_deposit.amount = user_deposit.amount.checked_add(amount).ok_or(ErrorCode::CalculationError)?;
        user_deposit.deposit_time = current_time;
        user_deposit.last_yield_calculation = current_time;

        // Mint des Yield Tokens équivalents au montant déposé
        let pool_owner = pool.owner;
        let mint_seeds = &[
            b"authority",
            pool_owner.as_ref(),
            &[ctx.bumps.pool_authority],
        ];
        let mint_signer = &[&mint_seeds[..]];

        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.yt_mint.to_account_info(),
                to: ctx.accounts.user_yt_account.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
            mint_signer,
        );
        mint_to(mint_ctx, amount)?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(ctx.accounts.pool.active, ErrorCode::PoolInactive);
        require!(amount > 0, ErrorCode::InvalidAmount);
        
        let user_deposit = &mut ctx.accounts.user_deposit;
        let strategy = &ctx.accounts.strategy;

        require!(user_deposit.amount >= amount, ErrorCode::InsufficientFunds);

        // Calcule le yield accumulé avant le retrait
        let current_time = Clock::get()?.unix_timestamp;
        let time_elapsed = current_time - user_deposit.last_yield_calculation;
        if time_elapsed > 0 {
            let yield_earned = user_deposit.amount
                .checked_mul(strategy.reward_apy)
                .ok_or(ErrorCode::CalculationError)?
                .checked_mul(time_elapsed as u64)
                .ok_or(ErrorCode::CalculationError)?
                / (365 * 24 * 3600 * 10000);
            
            user_deposit.yield_earned = user_deposit.yield_earned
                .checked_add(yield_earned)
                .ok_or(ErrorCode::CalculationError)?;
        }

        // Transfert depuis le vault vers l'utilisateur
        let pool_owner = ctx.accounts.pool.owner;
        let authority_seeds = &[
            b"authority",
            pool_owner.as_ref(),
            &[ctx.bumps.pool_authority],
        ];
        let signer_seeds = [&authority_seeds[..]];
        
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
            &signer_seeds,
        );
        transfer(transfer_ctx, amount)?;

        // Mise à jour après avoir utilisé pool.key()
        let pool = &mut ctx.accounts.pool;
        pool.total_deposits = pool.total_deposits.checked_sub(amount).ok_or(ErrorCode::CalculationError)?;
        user_deposit.amount = user_deposit.amount.checked_sub(amount).ok_or(ErrorCode::CalculationError)?;
        user_deposit.last_yield_calculation = current_time;

        // Burn les YT correspondants
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.yt_mint.to_account_info(),
                from: ctx.accounts.user_yt_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        burn(burn_ctx, amount)?;

        Ok(())
    }

    pub fn get_user_balance(ctx: Context<GetUserBalance>) -> Result<u64> {
        Ok(ctx.accounts.user_deposit.amount)
    }

    pub fn get_total_deposits(ctx: Context<GetTotalDeposits>) -> Result<u64> {
        Ok(ctx.accounts.pool.total_deposits)
    }

    pub fn calculate_pending_yield(ctx: Context<CalculatePendingYield>) -> Result<u64> {
        let user_deposit = &ctx.accounts.user_deposit;
        let strategy = &ctx.accounts.strategy;
        let current_time = Clock::get()?.unix_timestamp;
        
        let time_elapsed = current_time - user_deposit.last_yield_calculation;
        if time_elapsed <= 0 || user_deposit.amount == 0 {
            return Ok(user_deposit.yield_earned);
        }

        let pending_yield = user_deposit.amount
            .checked_mul(strategy.reward_apy)
            .ok_or(ErrorCode::CalculationError)?
            .checked_mul(time_elapsed as u64)
            .ok_or(ErrorCode::CalculationError)?
            / (365 * 24 * 3600 * 10000);

        Ok(user_deposit.yield_earned.checked_add(pending_yield).ok_or(ErrorCode::CalculationError)?)
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
        let pool_owner = ctx.accounts.pool.owner;
        let seeds = &[
            b"authority",
            pool_owner.as_ref(),
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

    pub fn redeem(ctx: Context<Redeem>, yt_amount: u64) -> Result<()> {
        require!(ctx.accounts.pool.active, ErrorCode::PoolInactive);
        require!(yt_amount > 0, ErrorCode::InvalidAmount);
        
        let user_deposit = &mut ctx.accounts.user_deposit;
        let current_time = Clock::get()?.unix_timestamp;
        let min_duration: i64 = 60 * 60 * 24 * 7; // 7 jours

        // Vérifie que la stratégie passée correspond à celle du dépôt
        require_keys_eq!(user_deposit.strategy, ctx.accounts.strategy.key(), ErrorCode::InvalidStrategy);

        // Vérifie que l'utilisateur a suffisamment de YT
        require!(ctx.accounts.user_token_account.amount >= yt_amount, ErrorCode::InsufficientYieldTokens);

        if current_time - user_deposit.deposit_time < min_duration {
            return Err(ErrorCode::TooEarlyToRedeem.into());
        }

        // Calcule le yield accumulé total
        let time_elapsed = current_time - user_deposit.last_yield_calculation;
        let mut total_yield_earned = user_deposit.yield_earned;
        
        if time_elapsed > 0 && user_deposit.amount > 0 {
            let pending_yield = user_deposit.amount
                .checked_mul(ctx.accounts.strategy.reward_apy)
                .ok_or(ErrorCode::CalculationError)?
                .checked_mul(time_elapsed as u64)
                .ok_or(ErrorCode::CalculationError)?
                / (365 * 24 * 3600 * 10000);
            
            total_yield_earned = total_yield_earned
                .checked_add(pending_yield)
                .ok_or(ErrorCode::CalculationError)?;
        }

        // Burn les YT
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.yt_mint.to_account_info(),
                from: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        burn(burn_ctx, yt_amount)?;

        // Calcule le montant à transférer : principal + yield proportionnel
        let yield_ratio = if user_deposit.amount > 0 {
            yt_amount.checked_mul(10000).ok_or(ErrorCode::CalculationError)? / user_deposit.amount
        } else {
            10000 // 100% si pas de dépôt restant
        };

        let principal_amount = yt_amount; // 1:1 ratio with original deposit
        let yield_amount = total_yield_earned
            .checked_mul(yield_ratio)
            .ok_or(ErrorCode::CalculationError)?
            / 10000;

        let total_redeem_amount = principal_amount
            .checked_add(yield_amount)
            .ok_or(ErrorCode::CalculationError)?;

        // Transfert du vault vers l'utilisateur
        let pool_owner = ctx.accounts.pool.owner;
        let authority_seeds = &[
            b"authority",
            pool_owner.as_ref(),
            &[ctx.bumps.pool_authority],
        ];
        let signer_seeds = [&authority_seeds[..]];
        
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_account.to_account_info(),
                to: ctx.accounts.user_usdc_account.to_account_info(),
                authority: ctx.accounts.pool_authority.to_account_info(),
            },
            &signer_seeds,
        );
        transfer(transfer_ctx, total_redeem_amount)?;

        // Met à jour les comptes après avoir utilisé pool.key()
        let pool = &mut ctx.accounts.pool;
        user_deposit.amount = user_deposit.amount.checked_sub(yt_amount).ok_or(ErrorCode::CalculationError)?;
        user_deposit.yield_earned = total_yield_earned.checked_sub(yield_amount).ok_or(ErrorCode::CalculationError)?;
        user_deposit.last_yield_calculation = current_time;
        
        pool.total_deposits = pool.total_deposits.checked_sub(yt_amount).ok_or(ErrorCode::CalculationError)?;
        pool.total_yield_distributed = pool.total_yield_distributed.checked_add(yield_amount).ok_or(ErrorCode::CalculationError)?;

        Ok(())
    }

    pub fn create_strategy(
        ctx: Context<CreateStrategy>,
        reward_apy: u64, // 10_000 = 10.00%
        name: String,
        description: String,
    ) -> Result<()> {
        require!(reward_apy <= 100_000, ErrorCode::InvalidAPY);
        require!(reward_apy >= 100, ErrorCode::InvalidAPY); // Minimum 0.01%
        require!(name.len() <= 50, ErrorCode::NameTooLong);
        require!(description.len() <= 200, ErrorCode::DescriptionTooLong);

        let strategy = &mut ctx.accounts.strategy;
        strategy.token_address = ctx.accounts.token_address.key();
        strategy.reward_apy = reward_apy;
        strategy.name = name;
        strategy.description = description;
        strategy.created_at = Clock::get()?.unix_timestamp;
        strategy.active = true;
        strategy.total_deposited = 0;
        Ok(())
    }

    pub fn toggle_strategy_status(ctx: Context<ToggleStrategyStatus>) -> Result<()> {
        let strategy = &mut ctx.accounts.strategy;
        strategy.active = !strategy.active;
        Ok(())
    }

    pub fn toggle_pool_status(ctx: Context<TogglePoolStatus>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.active = !pool.active;
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
        space = 8 + Pool::INIT_SPACE
    )]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub vault_account: Account<'info, TokenAccount>,

    /// Mint YT (Yield Token) - PDA séparé utilisant creator.key() pour éviter la dépendance circulaire
    #[account(
        init,
        payer = creator,
        seeds = [b"yt_mint", creator.key().as_ref()],
        bump,
        mint::decimals = 6,
        mint::authority = pool_authority,
        mint::freeze_authority = pool_authority,
    )]
    pub yt_mint: Account<'info, Mint>,

    /// CHECK: Cette PDA est utilisée comme autorité du mint YT
    #[account(
        seeds = [b"authority", creator.key().as_ref()],
        bump
    )]
    pub pool_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
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
        seeds = [b"strategy", strategy.token_address.as_ref()],
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
        seeds = [b"strategy", strategy.token_address.as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_yt_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"yt_mint", pool.owner.as_ref()],
        bump
    )]
    pub yt_mint: Account<'info, Mint>,

    /// CHECK: Cette PDA est utilisée uniquement comme signer du vault
    #[account(
        seeds = [b"authority", pool.owner.as_ref()],
        bump
    )]
    pub pool_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
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
        seeds = [b"strategy", strategy.token_address.as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_yt_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"yt_mint", pool.owner.as_ref()],
        bump
    )]
    pub yt_mint: Account<'info, Mint>,

    /// CHECK: Cette PDA est utilisée uniquement comme signer du vault
    #[account(
        seeds = [b"authority", pool.owner.as_ref()],
        bump
    )]
    pub pool_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
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
        seeds = [b"strategy", strategy.token_address.as_ref()],
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

#[derive(Accounts)]
pub struct CalculatePendingYield<'info> {
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
        seeds = [b"strategy", strategy.token_address.as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,
}

#[derive(Accounts)]
pub struct ToggleStrategyStatus<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"strategy", strategy.token_address.as_ref()],
        bump,
        constraint = admin.key() == strategy.token_address @ ErrorCode::Unauthorized
    )]
    pub strategy: Account<'info, Strategy>,
}

#[derive(Accounts)]
pub struct TogglePoolStatus<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"lending_pool", admin.key().as_ref()],
        bump,
        constraint = admin.key() == pool.owner @ ErrorCode::Unauthorized
    )]
    pub pool: Account<'info, Pool>,
}

#[account]
pub struct Pool {
    pub owner: Pubkey,
    pub total_deposits: u64,
    pub total_yield_distributed: u64,
    pub vault_account: Pubkey,
    pub yt_mint: Pubkey, // Ajout du champ pour le mint YT
    pub created_at: i64,
    pub active: bool,
}

impl Pool {
    pub const INIT_SPACE: usize = 8 + 32 + 8 + 8 + 32 + 32 + 8 + 1; // +32 pour yt_mint
}

#[account]
pub struct UserDeposit {
    pub user: Pubkey,
    pub pool: Pubkey,
    pub strategy: Pubkey, // Ajout du lien explicite à la stratégie
    pub amount: u64,
    pub yield_earned: u64,
    pub deposit_time: i64,
    pub last_yield_calculation: i64,
}

impl UserDeposit {
    pub const INIT_SPACE: usize = 8 + 32 + 32 + 32 + 8 + 8 + 8 + 8; // Ajout 32 pour strategy
}

// Nouvelle struct de stratégie
#[account]
pub struct Strategy {
    pub token_address: Pubkey,
    pub reward_apy: u64,
    pub name: String,
    pub description: String,
    pub created_at: i64,
    pub active: bool,
    pub total_deposited: u64,
}

impl Strategy {
    pub const INIT_SPACE: usize = 32 + 8 + (4 + 50) + (4 + 200) + 8 + 1 + 8;
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
    #[account(
        mut,
        seeds = [b"yt_mint", pool.owner.as_ref()],
        bump
    )]
    pub yt_mint: Account<'info, Mint>,

    // Autorité qui a le droit de mint (PDA)
    /// CHECK: Ce compte est une PDA utilisée uniquement comme signer
    #[account(
        seeds = [b"authority", pool.owner.as_ref()],
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
        seeds = [b"strategy", strategy.token_address.as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,

    #[account(
        mut,
        seeds = [b"yt_mint", pool.owner.as_ref()],
        bump
    )]
    pub yt_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_usdc_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_account: Account<'info, TokenAccount>,

    /// CHECK: Cette PDA est utilisée uniquement comme signer du vault
    #[account(
        seeds = [b"authority", pool.owner.as_ref()],
        bump
    )]
    pub pool_authority: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}