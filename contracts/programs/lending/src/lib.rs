use anchor_lang::prelude::*;

pub mod account_structs;
pub mod error;
pub mod instructions;

use account_structs::*;

declare_id!("B7eNrb1uJR9risFgqTQhnxKQt18itfVdoz4XYufEAEX8");

#[program]
pub mod lending {
    use super::*;

    pub fn initialize_user_deposit(ctx: Context<InitializeUserDeposit>) -> Result<()> {
        instructions::initialize_user_deposit(ctx)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit(ctx, amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw(ctx, amount)
    }

    pub fn get_user_balance(ctx: Context<GetUserBalance>) -> Result<u64> {
        instructions::get_user_balance(ctx)
    }

    pub fn calculate_pending_yield(ctx: Context<CalculatePendingYield>) -> Result<u64> {
        instructions::calculate_pending_yield(ctx)
    }

    pub fn redeem(ctx: Context<Redeem>, yt_amount: u64) -> Result<()> {
        instructions::redeem(ctx, yt_amount)
    }

    pub fn create_strategy(
        ctx: Context<CreateStrategy>,
        strategy_id: u64,
        token_address: Pubkey,
        reward_apy: u64,
    ) -> Result<()> {
        instructions::create_strategy(ctx, strategy_id, token_address, reward_apy)
    }

    pub fn toggle_strategy_status(
        ctx: Context<ToggleStrategyStatus>,
        strategy_id: u64,
    ) -> Result<()> {
        instructions::toggle_strategy_status(ctx, strategy_id)
    }

    pub fn reset_user_yield(ctx: Context<ResetUserYield>) -> Result<()> {
        instructions::reset_user_yield(ctx)
    }
}
