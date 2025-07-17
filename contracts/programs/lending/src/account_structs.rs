use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct InitializeUserDeposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = 8 + UserDeposit::INIT_SPACE,
        seeds = [b"user_deposit", user.key().as_ref(), strategy.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,

    #[account(
        seeds = [b"strategy", strategy.token_address.as_ref(), strategy.admin.as_ref(), strategy.strategy_id.to_le_bytes().as_ref()],
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
        init_if_needed,
        payer = user,
        space = 8 + UserDeposit::INIT_SPACE,
        seeds = [b"user_deposit", user.key().as_ref(), strategy.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,

    #[account(
        seeds = [b"strategy", strategy.token_address.as_ref(), strategy.admin.as_ref(), strategy.strategy_id.to_le_bytes().as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_yt_account: Account<'info, TokenAccount>,

    #[account()]
    pub token_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = user,
        token::mint = token_mint,
        token::authority = strategy,
        seeds = [b"vault_account", token_mint.key().as_ref(), strategy.strategy_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"yt_mint", strategy.token_address.as_ref(), strategy.admin.as_ref(), &strategy.strategy_id.to_le_bytes()],
        bump
    )]
    pub yt_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user_deposit", user.key().as_ref(), strategy.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,

    #[account(
        seeds = [b"strategy", strategy.token_address.as_ref(), strategy.admin.as_ref(), strategy.strategy_id.to_le_bytes().as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_yt_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault_account", strategy.token_address.as_ref(), strategy.strategy_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"yt_mint", strategy.token_address.as_ref(), strategy.admin.as_ref(), &strategy.strategy_id.to_le_bytes()],
        bump
    )]
    pub yt_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct GetUserBalance<'info> {
    pub user: Signer<'info>,

    #[account(
        seeds = [b"user_deposit", user.key().as_ref(), strategy.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,

    #[account(
        seeds = [b"strategy", strategy.token_address.as_ref(), strategy.admin.as_ref(), strategy.strategy_id.to_le_bytes().as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,
}

#[derive(Accounts)]
pub struct CalculatePendingYield<'info> {
    pub user: Signer<'info>,

    #[account(
        seeds = [b"user_deposit", user.key().as_ref(), strategy.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,

    #[account(
        seeds = [b"strategy", strategy.token_address.as_ref(), strategy.admin.as_ref(), strategy.strategy_id.to_le_bytes().as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,
}

#[derive(Accounts)]
#[instruction(strategy_id: u64)]
pub struct ToggleStrategyStatus<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"strategy", strategy.token_address.as_ref(), admin.key().as_ref(), strategy_id.to_le_bytes().as_ref()],
        bump,
        constraint = admin.key() == strategy.admin @ ErrorCode::Unauthorized
    )]
    pub strategy: Account<'info, Strategy>,
}

#[derive(Accounts)]
#[instruction(strategy_id: u64, token_address: Pubkey)]
pub struct CreateStrategy<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + 8 + 32 + 32 + 32 + 8 + 8 + 1 + 8,
        seeds = [b"strategy", token_address.key().as_ref(), admin.key().as_ref(), &strategy_id.to_le_bytes()],
        bump,
    )]
    pub strategy: Account<'info, Strategy>,

    #[account(
        init,
        payer = admin,
        mint::decimals = 6,
        mint::authority = strategy
    )]
    pub token_yield_address: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user_deposit", user.key().as_ref(), strategy.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,

    #[account(
        seeds = [b"strategy", strategy.token_address.as_ref(), strategy.admin.as_ref(), strategy.strategy_id.to_le_bytes().as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,

    #[account(
        mut,
        seeds = [b"yt_mint", strategy.token_address.as_ref(), strategy.admin.as_ref(), &strategy.strategy_id.to_le_bytes()],
        bump
    )]
    pub yt_mint: Account<'info, Mint>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_usdc_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault_account", strategy.token_address.as_ref(), strategy.strategy_id.to_le_bytes().as_ref()],
        bump
    )]
    pub vault_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResetUserYield<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user_deposit", user.key().as_ref(), strategy.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,

    #[account(
        seeds = [b"strategy", strategy.token_address.as_ref(), strategy.admin.as_ref(), strategy.strategy_id.to_le_bytes().as_ref()],
        bump
    )]
    pub strategy: Account<'info, Strategy>,
}

// Structures de données simplifiées
#[account]
pub struct UserDeposit {
    pub user: Pubkey,
    pub strategy: Pubkey,
    pub amount: u64,
    pub yield_earned: u64,
    pub deposit_time: i64,
    pub last_yield_calculation: i64,
}

impl UserDeposit {
    pub const INIT_SPACE: usize = 32 + 32 + 8 + 8 + 8 + 8;
}

#[account]
pub struct Strategy {
    pub strategy_id: u64,
    pub admin: Pubkey,
    pub token_address: Pubkey,
    pub token_yield_address: Pubkey,
    pub reward_apy: u64,
    pub created_at: i64,
    pub active: bool,
    pub total_deposited: u64,
}

impl Strategy {
    pub const INIT_SPACE: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1 + 8;
}
