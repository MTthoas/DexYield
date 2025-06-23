use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Trop tôt pour récupérer le yield.")]
    TooEarlyToRedeem,
    #[msg("Fonds insuffisants dans le dépôt de l'utilisateur.")]
    InsufficientFunds,
    #[msg("Erreur de calcul.")]
    CalculationError,
    #[msg("APY invalide.")]
    InvalidAPY,
    #[msg("Stratégie du dépôt invalide.")]
    InvalidStrategy,
    #[msg("Montant de dépôt insuffisant.")]
    InsufficientDepositAmount,
    #[msg("Pool inactif.")]
    PoolInactive,
    #[msg("Montant invalide.")]
    InvalidAmount,
    #[msg("Tokens de yield insuffisants.")]
    InsufficientYieldTokens,
    #[msg("Nom trop long.")]
    NameTooLong,
    #[msg("Description trop longue.")]
    DescriptionTooLong,
    #[msg("Non autorisé.")]
    Unauthorized,
}

