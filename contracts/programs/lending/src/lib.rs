use anchor_lang::prelude::*;

declare_id!("frB7oL8YJrNL9uo2oPjQHfFcuNiuGboGvyVMNhTS6uM");

#[program]
pub mod lending {
    use super::*; // <- récupère ce qui est défini au-dessus, donc anchor_lang::prelude::* inclus

    pub fn initialize_lending_pool(ctx: Context<InitializeLendingPool>) -> Result<()> {
        let lending_pool = &mut ctx.accounts.pool;
        lending_pool.owner = *ctx.accounts.creator.key;
        lending_pool.total_deposits = 0;
        Ok(())
    }

}

#[derive(Accounts)]
pub struct InitializeLendingPool<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        init,
        seeds = [b"lending", creator.key().as_ref()],
        bump,
        payer = creator,
        space = Pool::INIT_SPACE
    )]
    pub pool: Account<'info, Pool>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Pool {
    pub owner: Pubkey,
    pub total_deposits: u64,
}

impl Pool {
    const INIT_SPACE: usize = 8 + 32 + 8; // 8 bytes for discriminator + 32 bytes for Pubkey + 8 bytes for u64
}