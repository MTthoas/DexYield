use anchor_lang::prelude::*;

declare_id!("4WC4MDgPpPW3PY4idJT5ffX1NJpkYhLfRv2sDUsGCWLa");

#[program]
pub mod contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
