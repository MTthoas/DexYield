use anchor_lang::prelude::*;
use anchor_spl::token::{
    burn, mint_to, transfer, Burn, MintTo, Transfer,
};
use crate::account_structs::*;
use crate::error::ErrorCode;

const MIN_DEPOSIT: u64 = 1_000_000; // 1 USDC minimum

pub fn initialize_user_deposit(ctx: Context<InitializeUserDeposit>) -> Result<()> {
    let user_deposit = &mut ctx.accounts.user_deposit;
    let clock = Clock::get()?;

    // Vérifier que la stratégie est active
    require!(ctx.accounts.strategy.active, ErrorCode::InvalidStrategy);

    user_deposit.user = ctx.accounts.user.key();
    user_deposit.strategy = ctx.accounts.strategy.key();
    user_deposit.amount = 0;
    user_deposit.yield_earned = 0;
    user_deposit.deposit_time = clock.unix_timestamp;
    user_deposit.last_yield_calculation = clock.unix_timestamp;

    msg!(
        "User deposit account initialized for user: {}",
        ctx.accounts.user.key()
    );
    Ok(())
}

pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    require!(amount >= MIN_DEPOSIT, ErrorCode::InsufficientDepositAmount);
    require!(ctx.accounts.strategy.active, ErrorCode::InvalidStrategy);

    let user_deposit = &mut ctx.accounts.user_deposit;

    // Initialiser le compte si c'est la première fois
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

    // Calcule le yield accumulé avant d'ajouter le nouveau dépôt
    let current_time = Clock::get()?.unix_timestamp;
    let time_elapsed = current_time - user_deposit.last_yield_calculation;
    if time_elapsed > 0 && user_deposit.amount > 0 {
        let yield_earned = user_deposit
            .amount
            .checked_mul(ctx.accounts.strategy.reward_apy)
            .ok_or(ErrorCode::CalculationError)?
            .checked_mul(time_elapsed as u64)
            .ok_or(ErrorCode::CalculationError)?
            / (31536000 * 10000); // 31536000 = secondes dans une année

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

    // Mise à jour des totaux de la stratégie
    ctx.accounts.strategy.total_deposited = ctx
        .accounts
        .strategy
        .total_deposited
        .checked_add(amount)
        .ok_or(ErrorCode::CalculationError)?;

    // Mint des YT tokens avec la stratégie comme autorité
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

    msg!(
        "Deposited {} tokens for user: {}",
        amount,
        ctx.accounts.user.key()
    );
    Ok(())
}

pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    require!(ctx.accounts.strategy.active, ErrorCode::InvalidStrategy);
    require!(amount > 0, ErrorCode::InvalidAmount);

    let user_deposit = &mut ctx.accounts.user_deposit;
    let strategy = &ctx.accounts.strategy;

    require!(user_deposit.amount >= amount, ErrorCode::InsufficientFunds);

    // Calcule le yield accumulé avant le retrait
    let current_time = Clock::get()?.unix_timestamp;
    let time_elapsed = current_time - user_deposit.last_yield_calculation;
    if time_elapsed > 0 {
        let yield_earned = user_deposit
            .amount
            .checked_mul(strategy.reward_apy)
            .ok_or(ErrorCode::CalculationError)?
            .checked_mul(time_elapsed as u64)
            .ok_or(ErrorCode::CalculationError)?
            / (31536000 * 10000); // 31536000 = secondes dans une année

        user_deposit.yield_earned = user_deposit
            .yield_earned
            .checked_add(yield_earned)
            .ok_or(ErrorCode::CalculationError)?;
    }

    // Transfert depuis le vault vers l'utilisateur avec la stratégie comme autorité
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

pub fn get_user_balance(ctx: Context<GetUserBalance>) -> Result<u64> {
    Ok(ctx.accounts.user_deposit.amount)
}

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
        / (31536000 * 10000); // 31536000 = secondes dans une année

    Ok(user_deposit
        .yield_earned
        .checked_add(pending_yield)
        .ok_or(ErrorCode::CalculationError)?)
}

pub fn redeem(ctx: Context<Redeem>, yt_amount: u64) -> Result<()> {
    require!(ctx.accounts.strategy.active, ErrorCode::InvalidStrategy);
    require!(yt_amount > 0, ErrorCode::InvalidAmount);

    let user_deposit = &mut ctx.accounts.user_deposit;
    let current_time = Clock::get()?.unix_timestamp;
    let min_duration: i64 = 60; // 1 minute pour POC

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

    if current_time - user_deposit.deposit_time < min_duration {
        return Err(ErrorCode::TooEarlyToRedeem.into());
    }

    // Calcule le yield accumulé total
    let time_elapsed = current_time - user_deposit.last_yield_calculation;
    let mut total_yield_earned = user_deposit.yield_earned;

    if time_elapsed > 0 && user_deposit.amount > 0 {
        let pending_yield = user_deposit
            .amount
            .checked_mul(ctx.accounts.strategy.reward_apy)
            .ok_or(ErrorCode::CalculationError)?
            .checked_mul(time_elapsed as u64)
            .ok_or(ErrorCode::CalculationError)?
            / (31536000 * 10000); // 31536000 = secondes dans une année

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
        yt_amount
            .checked_mul(10000)
            .ok_or(ErrorCode::CalculationError)?
            / user_deposit.amount
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

    // Transfert du vault vers l'utilisateur avec la stratégie comme autorité
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

    // Met à jour les comptes
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

pub fn create_strategy(
    ctx: Context<CreateStrategy>,
    strategy_id: u64,
    token_address: Pubkey,
    reward_apy: u64,
) -> Result<()> {
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

pub fn toggle_strategy_status(ctx: Context<ToggleStrategyStatus>, _strategy_id: u64) -> Result<()> {
    let strategy = &mut ctx.accounts.strategy;
    strategy.active = !strategy.active;
    Ok(())
}

pub fn reset_user_yield(ctx: Context<ResetUserYield>) -> Result<()> {
    let user_deposit = &mut ctx.accounts.user_deposit;
    let current_time = Clock::get()?.unix_timestamp;

    // Réinitialiser le yield accumulé à 0
    user_deposit.yield_earned = 0;
    // Réinitialiser le timestamp de dernière calculation
    user_deposit.last_yield_calculation = current_time;

    msg!("Reset yield for user: {}", ctx.accounts.user.key());
    Ok(())
}
