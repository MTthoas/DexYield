import { PublicKey } from '@solana/web3.js';

// Program IDs (matching the deployed contracts)
export const LENDING_PROGRAM_ID = new PublicKey('GBhdq8ypCAdTEqPLm4ZQA4mSUjHik7U43FMoou3qwLxo');
export const MARKETPLACE_PROGRAM_ID = new PublicKey('Gju2aAZ2WnbEnEgGZK5fzxj2fevfwexYL5d411ZyY7tv');

// Token addresses (devnet)
export const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
export const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

// Default pool owner (from scripts setup)
export const DEFAULT_POOL_OWNER = new PublicKey('BZUEgp9psZegJarKqAH5WC6HSYCQ4fY2XphuCd5RsyeF');

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
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
} as const;