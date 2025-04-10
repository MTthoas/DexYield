use anchor_lang::prelude::*;

pub mod error;
use error::ErrorCode;

declare_id!("frB7oL8YJrNL9uo2oPjQHfFcuNiuGboGvyVMNhTS6uM");

#[program]
pub mod lending {
    use super::*; // Import all items from the current module

    pub fn initialize_lending_pool(ctx: Context<InitializeLendingPool>) -> Result<()> {
        let lending_pool = &mut ctx.accounts.pool;
        lending_pool.owner = *ctx.accounts.creator.key;
        lending_pool.total_deposits = 0;
        Ok(())
    }

    pub fn initialize_user_deposit(ctx: Context<InitializeUserDeposit>) -> Result<()> {
        let user_deposit = &mut ctx.accounts.user_deposit;
        user_deposit.user = *ctx.accounts.user.key;
        user_deposit.pool = ctx.accounts.pool.key();
        user_deposit.amount = 0;
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let user_deposit = &mut ctx.accounts.user_deposit;

        pool.total_deposits += amount;
        user_deposit.amount += amount;

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
        seeds = [b"user_deposit", user.key().as_ref(), pool.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,

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
        seeds = [b"user_deposit", user.key().as_ref(), pool.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,
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
        seeds = [b"user_deposit", user.key().as_ref(), pool.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,
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
        seeds = [b"user_deposit", user.key().as_ref(), pool.key().as_ref()],
        bump
    )]
    pub user_deposit: Account<'info, UserDeposit>,
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
#[derive(InitSpace)]
pub struct Pool {
    pub owner: Pubkey,
    pub total_deposits: u64,
}

impl Pool {
    pub const INIT_SPACE: usize = 8 + 32 + 8;
}

#[account]
#[derive(InitSpace)]
pub struct UserDeposit {
    pub user: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
}

impl UserDeposit {
    pub const INIT_SPACE: usize = 8 + 32 + 32 + 8; // 8 bytes for account header, 32 bytes for user, 32 bytes for pool, and 8 bytes for amount
}