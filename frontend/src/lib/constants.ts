import { PublicKey } from '@solana/web3.js';

// Program IDs - CORRECTED TO MATCH WORKING SCRIPT
export const LENDING_PROGRAM_ID = new PublicKey('B7eNrb1uJR9risFgqTQhnxKQt18itfVdoz4XYufEAEX8');
export const MARKETPLACE_PROGRAM_ID = new PublicKey('9B1oveu4aVQjxboVRa4FYB9iqtbBoQhHy9FNrKNzSM8c');

// Token addresses (devnet)
export const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
export const NATIVE_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
export const SOL_MINT = new PublicKey('AvfZJvfYHRANjq8s1mdjRDQYeHt8U7YvAWBMjSaBphQ7'); // SPL Token representing SOL for lending pools

// Default pool owner - NEW DEPLOYMENT (your wallet)
export const DEFAULT_POOL_OWNER = new PublicKey('9JNZJADgviPnQWKz6sCrXiqvwVwRWcCKmicGYUD2hkdZ');

// Devnet deployed addresses - CORRECTED TO MATCH WORKING SCRIPT
export const DEVNET_CONFIG = {
  lending: {
    programId: new PublicKey('B7eNrb1uJR9risFgqTQhnxKQt18itfVdoz4XYufEAEX8'),
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
  // Add more common Solana tokens
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC', // USDC mainnet
  'Es9vMFrzaCERbZ6t2kF9Q6U6TzQbY4xXHzkwgZ4k6A9E': 'USDC', // USDC mainnet alternative
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
  'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk': 'WEN',
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': 'PYTH',
  'Saber2gLauYim4Mvftnrasomsv6NvAuncvMEZwcLpD1': 'SBR',
  'RLBxxFkseAZ4RgJH3Sqn8jXxhmGoz9jWxDNJMh8pL7a': 'RLB',
  'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE': 'ORCA',
  'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac': 'MNGO',
  'MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky': 'MERL',
  'TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6': 'TNSR',
  'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL': 'JTO',
  'DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ': 'DUST',
} as const;

// Helper function to get token info dynamically
export const getTokenInfo = (mintAddress: string) => {
  let symbol = TOKEN_SYMBOLS[mintAddress];
  
  // Better fallback logic instead of showing "UNKNOWN"
  if (!symbol) {
    // Check if it's a SOL-like address
    if (mintAddress.includes('So1') || mintAddress.includes('111111111111111111111111111111111')) {
      symbol = 'SOL';
    } 
    // Check if it's a USDC-like address
    else if (mintAddress.includes('USDC') || mintAddress.includes('USD') || mintAddress.includes('4zMM')) {
      symbol = 'USDC';
    }
    // Default to SOL for unrecognized tokens (better than "UNKNOWN")
    else {
      symbol = 'SOL';
    }
  }
  
  const decimals = symbol === 'USDC' ? TOKEN_DECIMALS.USDC : TOKEN_DECIMALS.SOL;
  
  return {
    symbol,
    decimals,
    mint: mintAddress,
    isNative: mintAddress === NATIVE_SOL_MINT.toString()
  };
};