// Importation des modules Anchor nécessaires
use anchor_lang::prelude::*;
use anchor_spl::token::{
    burn, mint_to, transfer, Burn, MintTo, Transfer,
};
use crate::account_structs::*;
use crate::error::ErrorCode;

// Montant minimum de dépôt (1 USDC)
const MIN_DEPOSIT: u64 = 1_000_000;

/// Initialise le compte de dépôt utilisateur pour une stratégie donnée
pub fn initialize_user_deposit(ctx: Context<InitializeUserDeposit>) -> Result<()> {
    let user_deposit = &mut ctx.accounts.user_deposit;
    let clock = Clock::get()?;

    // Vérifie que la stratégie est active
    require!(ctx.accounts.strategy.active, ErrorCode::InvalidStrategy);

    // Initialise les champs du compte de dépôt utilisateur
    user_deposit.user = ctx.accounts.user.key();
    user_deposit.strategy = ctx.accounts.strategy.key();
    user_deposit.amount = 0;
    user_deposit.yield_earned = 0;
    user_deposit.deposit_time = clock.unix_timestamp;
    user_deposit.last_yield_calculation = clock.unix_timestamp;

    // Log d'initialisation
    msg!(
        "User deposit account initialized for user: {}",
        ctx.accounts.user.key()
    );
    Ok(())
}

/// Permet à l'utilisateur de déposer des tokens dans une stratégie
pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    // Vérifie le montant minimum et que la stratégie est active
    require!(amount >= MIN_DEPOSIT, ErrorCode::InsufficientDepositAmount);
    require!(ctx.accounts.strategy.active, ErrorCode::InvalidStrategy);

    let user_deposit = &mut ctx.accounts.user_deposit;

    // Initialise le compte de dépôt si c'est la première fois
    if user_deposit.user == Pubkey::default() {
        let current_time = Clock::get()?.unix_timestamp;
        user_deposit.user = ctx.accounts.user.key();
        user_deposit.strategy = ctx.accounts.strategy.key();
        user_deposit.amount = 0;
        user_deposit.yield_earned = 0;
        user_deposit.deposit_time = current_time;
        user_deposit.last_yield_calculation = current_time;
    }

    // Vérifie que la stratégie du compte correspond à celle passée
    require_keys_eq!(
        user_deposit.strategy,
        ctx.accounts.strategy.key(),
        ErrorCode::InvalidStrategy
    );

    // Calcule le rendement accumulé avant d'ajouter le nouveau dépôt
    let current_time = Clock::get()?.unix_timestamp;
    let time_elapsed = current_time - user_deposit.last_yield_calculation;
    if time_elapsed > 0 && user_deposit.amount > 0 {
        let yield_earned = user_deposit
            .amount
            .checked_mul(ctx.accounts.strategy.reward_apy)
            .ok_or(ErrorCode::CalculationError)?
            .checked_mul(time_elapsed as u64)
            .ok_or(ErrorCode::CalculationError)?
            / (31536000 * 10000); // Conversion annuelle

        user_deposit.yield_earned = user_deposit
            .yield_earned
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

    // Mise à jour du montant déposé
    user_deposit.amount = user_deposit
        .amount
        .checked_add(amount)
        .ok_or(ErrorCode::CalculationError)?;
    user_deposit.deposit_time = current_time;
    user_deposit.last_yield_calculation = current_time;

    // Mise à jour du total déposé dans la stratégie
    ctx.accounts.strategy.total_deposited = ctx
        .accounts
        .strategy
        .total_deposited
        .checked_add(amount)
        .ok_or(ErrorCode::CalculationError)?;

    // Mint des YT tokens pour l'utilisateur
    let strategy_seeds = &[
        b"strategy",
        ctx.accounts.strategy.token_address.as_ref(),
        ctx.accounts.strategy.admin.as_ref(),
        &ctx.accounts.strategy.strategy_id.to_le_bytes(),
        &[ctx.bumps.strategy],
    ];
    let signer_seeds = &[&strategy_seeds[..]];

    let mint_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.yt_mint.to_account_info(),
            to: ctx.accounts.user_yt_account.to_account_info(),
            authority: ctx.accounts.strategy.to_account_info(),
        },
        signer_seeds,
    );
    mint_to(mint_ctx, amount)?;

    // Log du dépôt
    msg!(
        "Deposited {} tokens for user: {}",
        amount,
        ctx.accounts.user.key()
    );
    Ok(())
}

/// Permet à l'utilisateur de retirer des tokens de la stratégie
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    // Vérifie que la stratégie est active et le montant > 0
    require!(ctx.accounts.strategy.active, ErrorCode::InvalidStrategy);
    require!(amount > 0, ErrorCode::InvalidAmount);

    let user_deposit = &mut ctx.accounts.user_deposit;
    let strategy = &ctx.accounts.strategy;

    // Vérifie que l'utilisateur a assez de fonds
    require!(user_deposit.amount >= amount, ErrorCode::InsufficientFunds);

    // Calcule le rendement accumulé avant le retrait
    let current_time = Clock::get()?.unix_timestamp;
    let time_elapsed = current_time - user_deposit.last_yield_calculation;
    if time_elapsed > 0 {
        let yield_earned = user_deposit
            .amount
            .checked_mul(strategy.reward_apy)
            .ok_or(ErrorCode::CalculationError)?
            .checked_mul(time_elapsed as u64)
            .ok_or(ErrorCode::CalculationError)?
            / (31536000 * 10000);

        user_deposit.yield_earned = user_deposit
            .yield_earned
            .checked_add(yield_earned)
            .ok_or(ErrorCode::CalculationError)?;
    }

    // Transfert du vault vers l'utilisateur
    let strategy_seeds = &[
        b"strategy",
        strategy.token_address.as_ref(),
        strategy.admin.as_ref(),
        &strategy.strategy_id.to_le_bytes(),
        &[ctx.bumps.strategy],
    ];
    let signer_seeds = &[&strategy_seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.strategy.to_account_info(),
        },
        signer_seeds,
    );
    transfer(transfer_ctx, amount)?;

    // Mise à jour des montants
    user_deposit.amount = user_deposit
        .amount
        .checked_sub(amount)
        .ok_or(ErrorCode::CalculationError)?;
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

/// Retourne le solde du dépôt utilisateur
pub fn get_user_balance(ctx: Context<GetUserBalance>) -> Result<u64> {
    Ok(ctx.accounts.user_deposit.amount)
}

/// Calcule le rendement en attente pour l'utilisateur
pub fn calculate_pending_yield(ctx: Context<CalculatePendingYield>) -> Result<u64> {
    let user_deposit = &ctx.accounts.user_deposit;
    let strategy = &ctx.accounts.strategy;
    let current_time = Clock::get()?.unix_timestamp;

    let time_elapsed = current_time - user_deposit.last_yield_calculation;
    if time_elapsed <= 0 || user_deposit.amount == 0 {
        return Ok(user_deposit.yield_earned);
    }

    let pending_yield = user_deposit
        .amount
        .checked_mul(strategy.reward_apy)
        .ok_or(ErrorCode::CalculationError)?
        .checked_mul(time_elapsed as u64)
        .ok_or(ErrorCode::CalculationError)?
        / (31536000 * 10000);

    Ok(user_deposit
        .yield_earned
        .checked_add(pending_yield)
        .ok_or(ErrorCode::CalculationError)?)
}

/// Permet à l'utilisateur de retirer ses fonds et le rendement associé
pub fn redeem(ctx: Context<Redeem>, yt_amount: u64) -> Result<()> {
    // Vérifie que la stratégie est active et le montant > 0
    require!(ctx.accounts.strategy.active, ErrorCode::InvalidStrategy);
    require!(yt_amount > 0, ErrorCode::InvalidAmount);

    let user_deposit = &mut ctx.accounts.user_deposit;
    let current_time = Clock::get()?.unix_timestamp;
    let min_duration: i64 = 60; // Durée minimale avant retrait (POC)

    // Vérifie que la stratégie passée correspond à celle du dépôt
    require_keys_eq!(
        user_deposit.strategy,
        ctx.accounts.strategy.key(),
        ErrorCode::InvalidStrategy
    );

    // Vérifie que l'utilisateur a suffisamment de YT
    require!(
        ctx.accounts.user_token_account.amount >= yt_amount,
        ErrorCode::InsufficientYieldTokens
    );

    // Vérifie la durée minimale de dépôt
    if current_time - user_deposit.deposit_time < min_duration {
        return Err(ErrorCode::TooEarlyToRedeem.into());
    }

    // Calcule le rendement total accumulé
    let time_elapsed = current_time - user_deposit.last_yield_calculation;
    let mut total_yield_earned = user_deposit.yield_earned;

    if time_elapsed > 0 && user_deposit.amount > 0 {
        let pending_yield = user_deposit
            .amount
            .checked_mul(ctx.accounts.strategy.reward_apy)
            .ok_or(ErrorCode::CalculationError)?
            .checked_mul(time_elapsed as u64)
            .ok_or(ErrorCode::CalculationError)?
            / (31536000 * 10000);

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

    // Calcule le montant à transférer : principal + rendement proportionnel
    let yield_ratio = if user_deposit.amount > 0 {
        yt_amount
            .checked_mul(10000)
            .ok_or(ErrorCode::CalculationError)?
            / user_deposit.amount
    } else {
        10000 // 100% si pas de dépôt restant
    };

    let principal_amount = yt_amount; // Ratio 1:1 avec le dépôt initial
    let yield_amount = total_yield_earned
        .checked_mul(yield_ratio)
        .ok_or(ErrorCode::CalculationError)?
        / 10000;

    let total_redeem_amount = principal_amount
        .checked_add(yield_amount)
        .ok_or(ErrorCode::CalculationError)?;

    // Transfert du vault vers l'utilisateur
    let strategy_seeds = &[
        b"strategy",
        ctx.accounts.strategy.token_address.as_ref(),
        ctx.accounts.strategy.admin.as_ref(),
        &ctx.accounts.strategy.strategy_id.to_le_bytes(),
        &[ctx.bumps.strategy],
    ];
    let signer_seeds = &[&strategy_seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_account.to_account_info(),
            to: ctx.accounts.user_usdc_account.to_account_info(),
            authority: ctx.accounts.strategy.to_account_info(),
        },
        signer_seeds,
    );
    transfer(transfer_ctx, total_redeem_amount)?;

    // Mise à jour des comptes utilisateur
    user_deposit.amount = user_deposit
        .amount
        .checked_sub(principal_amount)
        .ok_or(ErrorCode::CalculationError)?;
    user_deposit.yield_earned = total_yield_earned
        .checked_sub(yield_amount)
        .ok_or(ErrorCode::CalculationError)?;
    user_deposit.last_yield_calculation = current_time;

    Ok(())
}

/// Crée une nouvelle stratégie de rendement
pub fn create_strategy(
    ctx: Context<CreateStrategy>,
    strategy_id: u64,
    token_address: Pubkey,
    reward_apy: u64,
) -> Result<()> {
    // Vérifie que l'APY est dans les limites
    require!(reward_apy <= 100_000, ErrorCode::InvalidAPY);
    require!(reward_apy >= 100, ErrorCode::InvalidAPY); // Minimum 0.01%

    let strategy = &mut ctx.accounts.strategy;
    strategy.strategy_id = strategy_id;
    strategy.admin = ctx.accounts.admin.key();
    strategy.token_address = token_address;
    strategy.token_yield_address = ctx.accounts.token_yield_address.key();
    strategy.reward_apy = reward_apy;
    strategy.created_at = Clock::get()?.unix_timestamp;
    strategy.active = true;
    strategy.total_deposited = 0;
    Ok(())
}

/// Active ou désactive une stratégie
pub fn toggle_strategy_status(ctx: Context<ToggleStrategyStatus>, _strategy_id: u64) -> Result<()> {
    let strategy = &mut ctx.accounts.strategy;
    strategy.active = !strategy.active;
    Ok(())
}

/// Réinitialise le rendement accumulé pour l'utilisateur
pub fn reset_user_yield(ctx: Context<ResetUserYield>) -> Result<()> {
    let user_deposit = &mut ctx.accounts.user_deposit;
    let current_time = Clock::get()?.unix_timestamp;

    // Remet le rendement à zéro et met à jour le timestamp
    user_deposit.yield_earned = 0;
    user_deposit.last_yield_calculation = current_time;

    // Log de reset
    msg!("Reset yield for user: {}", ctx.accounts.user.key());
    Ok(())
}
