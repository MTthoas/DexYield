import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

export interface TokenAccountInfo {
  address: PublicKey;
  exists: boolean;
  balance?: bigint;
}

export class TokenAccountManager {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async getOrCreateTokenAccount(
    mint: PublicKey,
    owner: PublicKey,
    payer: PublicKey,
    allowOwnerOffCurve = false
  ): Promise<{ address: PublicKey; instruction?: any }> {
    const associatedToken = await getAssociatedTokenAddress(
      mint,
      owner,
      allowOwnerOffCurve
    );

    try {
      await getAccount(this.connection, associatedToken);
      return { address: associatedToken };
    } catch (error: unknown) {
      if (
        error instanceof TokenAccountNotFoundError ||
        error instanceof TokenInvalidAccountOwnerError
      ) {
        const instruction = createAssociatedTokenAccountInstruction(
          payer,
          associatedToken,
          owner,
          mint
        );
        return { address: associatedToken, instruction };
      }
      throw error;
    }
  }

  async getTokenAccountInfo(
    mint: PublicKey,
    owner: PublicKey
  ): Promise<TokenAccountInfo> {
    const associatedToken = await getAssociatedTokenAddress(mint, owner);

    try {
      const account = await getAccount(this.connection, associatedToken);
      return {
        address: associatedToken,
        exists: true,
        balance: account.amount,
      };
    } catch (error: unknown) {
      if (
        error instanceof TokenAccountNotFoundError ||
        error instanceof TokenInvalidAccountOwnerError
      ) {
        return {
          address: associatedToken,
          exists: false,
        };
      }
      throw error;
    }
  }

  async createTokenAccountsInstructions(
    accounts: Array<{
      mint: PublicKey;
      owner: PublicKey;
      payer: PublicKey;
    }>
  ): Promise<Array<{ address: PublicKey; instruction?: any }>> {
    const results = [];
    
    for (const { mint, owner, payer } of accounts) {
      const result = await this.getOrCreateTokenAccount(mint, owner, payer);
      results.push(result);
    }
    
    return results;
  }

  async getMultipleTokenAccountsInfo(
    accounts: Array<{ mint: PublicKey; owner: PublicKey }>
  ): Promise<TokenAccountInfo[]> {
    const results = [];
    
    for (const { mint, owner } of accounts) {
      const info = await this.getTokenAccountInfo(mint, owner);
      results.push(info);
    }
    
    return results;
  }
}

export const formatTokenAmount = (amount: bigint, decimals: number): string => {
  const divisor = BigInt(10 ** decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;
  
  if (fractionalPart === 0n) {
    return wholePart.toString();
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.replace(/0+$/, '');
  
  return `${wholePart}.${trimmedFractional}`;
};

export const parseTokenAmount = (amount: string, decimals: number): bigint => {
  const [wholePart, fractionalPart = ''] = amount.split('.');
  const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
  const fullAmount = wholePart + paddedFractional;
  return BigInt(fullAmount);
};