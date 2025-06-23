use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Too early to redeem.")]
    TooEarlyToRedeem,
    #[msg("Insufficient funds in the user's deposit.")]
    InsufficientFunds,
    #[msg("Erreur de calcul.")]
    CalculationError,
    #[msg("APY invalide.")]
    InvalidAPY,
}

