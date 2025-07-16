import { PublicKey } from '@solana/web3.js';

// Program IDs (matching the deployed contracts)
export const LENDING_PROGRAM_ID = new PublicKey('GBhdq8ypCAdTEqPLm4ZQA4mSUjHik7U43FMoou3qwLxo');
export const MARKETPLACE_PROGRAM_ID = new PublicKey('Gju2aAZ2WnbEnEgGZK5fzxj2fevfwexYL5d411ZyY7tv');

// Token addresses (devnet)
export const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
export const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

// Default pool owner (from deployed devnet configuration)
export const DEFAULT_POOL_OWNER = new PublicKey('6xKr3QyuZ2SY2egretDk9WYfnFzpae3njD8pjpXynqcR');

// Devnet deployed addresses
export const DEVNET_CONFIG = {
  lending: {
    programId: new PublicKey('GBhdq8ypCAdTEqPLm4ZQA4mSUjHik7U43FMoou3qwLxo'),
    pool: new PublicKey('A84c4123zxFKZUXgPRSvsfsr8EZTiv61HgGd9zZux1cP'),
    ytMint: new PublicKey('BqbZQSqgfyD9h6wFePtEAGsJX4efQoqe9VCrAX2WA2PC'),
    strategy: new PublicKey('6W3aXpenbuLywon1ZCwUwVEA3BjNEqpt61PWzCFucYgS'),
    userDeposit: new PublicKey('D5XCjQY3REYBLEGrsz8gVT4DgmSp7UVcCVK3D56RxDD6'),
    vaultAta: new PublicKey('4Zmnf8fDvWkyvfDwkNMtHsm8whVRbdLf2eS8H4PbHRgj'),
    authority: new PublicKey('CxpdhJdTRRbJFjwj7uoUF69XjeoThmvirar3CgpgXQda'),
  },
  marketplace: {
    programId: new PublicKey('Gju2aAZ2WnbEnEgGZK5fzxj2fevfwexYL5d411ZyY7tv'),
    strategy: new PublicKey('EtQQo2D2NbyjLE22Rm4Zoj18YHaRxDcS9NyyHGKWWtqM'),
    listing: new PublicKey('AYyihgcAZcvFBpy12ZchpZ4bFr5vhZFspBf5a32nm5X2'),
    escrowAuthority: new PublicKey('G4AEgwaTpLQvj1CXhVFNm5oKof2UP5qAbexo9stHNHUi'),
    escrowYtAta: new PublicKey('Gyv91uj9tLHJqdqNGw5Xx5LM7vYbK2Wz9L6ckjjMd6Ea'),
  },
  tokens: {
    userUsdcAta: new PublicKey('7SiymjEuLcATNEVoBcWf4bTckPPUMUD8fgyfjg5FCxM8'),
    userYtAta: new PublicKey('cKA5EHKXHUjvnSKfQchhrvV8tcJaKqZoxgUGn5xMBkk'),
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
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
} as const;