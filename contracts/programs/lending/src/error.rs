use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient funds in the user's deposit.")]
    InsufficientFunds,
}
