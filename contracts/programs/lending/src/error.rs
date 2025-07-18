use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Calcul impossible, débordement détecté")]
    CalculationError,

    #[msg("Fonds insuffisants pour cette opération")]
    InsufficientFunds,

    #[msg("Taux APY invalide")]
    InvalidAPY,

    #[msg("Montant invalide")]
    InvalidAmount,

    #[msg("Autorisation refusée")]
    Unauthorized,

    #[msg("Montant de dépôt insuffisant")]
    InsufficientDepositAmount,

    #[msg("Pool inactive")]
    PoolInactive,

    #[msg("Stratégie invalide")]
    InvalidStrategy,

    #[msg("Vault invalide")]
    InvalidVault,

    #[msg("Tokens de yield insuffisants")]
    InsufficientYieldTokens,

    #[msg("Trop tôt pour échanger")]
    TooEarlyToRedeem,

    #[msg("Pool déjà initialisé")]
    PoolAlreadyInitialized,

    #[msg("Compte utilisateur déjà initialisé")]
    UserDepositAlreadyInitialized,

    #[msg("Token yield invalide")]
    InvalidYieldToken,
}
