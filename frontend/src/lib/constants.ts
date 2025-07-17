import { PublicKey } from '@solana/web3.js';

// Program IDs - NEW DEPLOYMENT V3
export const LENDING_PROGRAM_ID = new PublicKey('B1rfivNAWF6tG4yiKR1fZZoxDcdapFYS9JNDMJDGy7zo');
export const MARKETPLACE_PROGRAM_ID = new PublicKey('39GPqWvAfHSWXBeKtjb5ZYk6bimu9LKjLM385Z4GeD8g');

// Token addresses (devnet)
export const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
export const NATIVE_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
export const SOL_MINT = new PublicKey('AvfZJvfYHRANjq8s1mdjRDQYeHt8U7YvAWBMjSaBphQ7'); // SPL Token representing SOL for lending pools

// Default pool owner - NEW DEPLOYMENT (your wallet)
export const DEFAULT_POOL_OWNER = new PublicKey('9JNZJADgviPnQWKz6sCrXiqvwVwRWcCKmicGYUD2hkdZ');

// Devnet deployed addresses - UPDATED WITH V3 DEPLOYMENT
export const DEVNET_CONFIG = {
  lending: {
    programId: new PublicKey('B1rfivNAWF6tG4yiKR1fZZoxDcdapFYS9JNDMJDGy7zo'),
    pool: new PublicKey('11111111111111111111111111111111'), // Will be updated after deployment
    ytMint: new PublicKey('11111111111111111111111111111111'), // Will be updated after deployment
    strategy: new PublicKey('11111111111111111111111111111111'), // Will be updated after deployment
    userDeposit: new PublicKey('11111111111111111111111111111111'), // Will be updated after deployment
    vaultAta: new PublicKey('11111111111111111111111111111111'), // Will be updated after deployment
    authority: new PublicKey('11111111111111111111111111111111'), // Will be updated after deployment
  },
  marketplace: {
    programId: new PublicKey('39GPqWvAfHSWXBeKtjb5ZYk6bimu9LKjLM385Z4GeD8g'),
    strategy: new PublicKey('11111111111111111111111111111111'), // Will be updated after deployment
    listing: new PublicKey('11111111111111111111111111111111'), // Will be updated after deployment
    escrowAuthority: new PublicKey('11111111111111111111111111111111'), // Will be updated after deployment
    escrowYtAta: new PublicKey('11111111111111111111111111111111'), // Will be updated after deployment
  },
  tokens: {
    userUsdcAta: new PublicKey('11111111111111111111111111111111'), // Will be updated after deployment
    userYtAta: new PublicKey('11111111111111111111111111111111'), // Will be updated after deployment
  },
};

// Token configuration
export const TOKEN_DECIMALS = {
  USDC: 6,
  SOL: 9,
  mSOL: 9,
} as const;

// Token symbol mapping
export const TOKEN_SYMBOLS = {
  [USDC_MINT.toString()]: 'USDC',
  [SOL_MINT.toString()]: 'SOL',
  [NATIVE_SOL_MINT.toString()]: 'SOL',
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
} as const;

// Helper function to get token info dynamically
export const getTokenInfo = (mintAddress: string) => {
  const symbol = TOKEN_SYMBOLS[mintAddress] || 'UNKNOWN';
  const decimals = symbol === 'USDC' ? TOKEN_DECIMALS.USDC : TOKEN_DECIMALS.SOL;
  
  return {
    symbol,
    decimals,
    mint: mintAddress,
    isNative: mintAddress === NATIVE_SOL_MINT.toString()
  };
};