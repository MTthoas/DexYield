import { useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useContracts } from './useContracts';
import { useLending } from './useLending';
import { USDC_MINT, DEFAULT_POOL_OWNER, TOKEN_DECIMALS } from '../lib/constants';

export const useLendingSimplified = () => {
  const { publicKey } = useWallet();
  const contractService = useContracts();
  const { initializeLendingPool: initPool, createStrategy } = useLending();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simplified deposit function using our helper
  const deposit = useCallback(async (
    tokenMint: PublicKey,
    amount: number,
    poolOwner: PublicKey = DEFAULT_POOL_OWNER
  ) => {
    if (!contractService || !publicKey) {
      throw new Error('Wallet not connected or contract service not available');
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting simplified deposit...');
      console.log('Token mint:', tokenMint.toString());
      console.log('Amount:', amount);
      console.log('Pool owner:', poolOwner.toString());

      // Build all required accounts using our helper
      const accounts = await contractService.buildLendingAccounts(
        publicKey,
        poolOwner,
        tokenMint
      );

      console.log('📋 Built accounts:', {
        poolPDA: accounts.poolPDA.toString(),
        strategyPDA: accounts.strategyPDA.toString(),
        userDepositPDA: accounts.userDepositPDA.toString(),
        ytMintPDA: accounts.ytMintPDA.toString(),
        userTokenAccount: accounts.userTokenAccount.toString(),
        userYtAccount: accounts.userYtAccount.toString(),
        vaultAccount: accounts.vaultAccount.toString(),
      });

      // Convert amount to proper decimals
      const decimals = tokenMint.equals(USDC_MINT) ? TOKEN_DECIMALS.USDC : TOKEN_DECIMALS.SOL;
      const amountBN = Math.floor(amount * Math.pow(10, decimals));

      console.log('💰 Amount with decimals:', amountBN);

      // Check and initialize pool if needed
      try {
        console.log('🔧 Checking pool status...');
        await contractService.getPool(accounts.poolPDA);
        console.log('✅ Pool exists');
      } catch (poolError) {
        console.log('🔧 Pool not found, initializing...');
        try {
          await initPool(poolOwner, accounts.vaultAccount);
          console.log('✅ Pool initialized');
        } catch (poolInitError) {
          console.log('ℹ️ Pool initialization error:', poolInitError);
        }
      }

      // Check and initialize strategy if needed
      try {
        console.log('🔧 Checking strategy status...');
        await contractService.getStrategy(accounts.strategyPDA);
        console.log('✅ Strategy exists');
      } catch (strategyError) {
        console.log('🔧 Strategy not found, initializing...');
        try {
          await createStrategy(
            tokenMint,
            500, // 5% APY in basis points
            `${tokenMint.toString().slice(0, 4)}... Strategy`,
            `Strategy for ${tokenMint.toString()}`
          );
          console.log('✅ Strategy initialized');
        } catch (strategyInitError) {
          console.log('ℹ️ Strategy initialization error:', strategyInitError);
        }
      }

      // Try to initialize user deposit if needed
      try {
        console.log('🔧 Initializing user deposit...');
        await contractService.initializeUserDeposit(
          publicKey,
          poolOwner,
          accounts.strategyPDA
        );
        console.log('✅ User deposit initialized');
      } catch (initError) {
        console.log('ℹ️ User deposit may already exist:', initError);
      }

      // Perform the deposit
      console.log('💸 Executing deposit...');
      const txId = await contractService.deposit(
        publicKey,
        poolOwner,
        accounts.strategyPDA,
        amountBN,
        accounts.userTokenAccount,
        accounts.userYtAccount,
        accounts.vaultAccount,
        accounts.ytMintPDA
      );

      console.log('✅ Deposit successful! TX:', txId);
      return txId;

    } catch (err) {
      console.error('❌ Deposit failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  // Simplified withdraw function
  const withdraw = useCallback(async (
    tokenMint: PublicKey,
    amount: number,
    poolOwner: PublicKey = DEFAULT_POOL_OWNER
  ) => {
    if (!contractService || !publicKey) {
      throw new Error('Wallet not connected or contract service not available');
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting simplified withdraw...');

      // Build all required accounts using our helper
      const accounts = await contractService.buildLendingAccounts(
        publicKey,
        poolOwner,
        tokenMint
      );

      // Convert amount to proper decimals
      const decimals = tokenMint.equals(USDC_MINT) ? TOKEN_DECIMALS.USDC : TOKEN_DECIMALS.SOL;
      const amountBN = Math.floor(amount * Math.pow(10, decimals));

      // Perform the withdrawal
      const txId = await contractService.withdraw(
        publicKey,
        poolOwner,
        accounts.strategyPDA,
        amountBN,
        accounts.userTokenAccount,
        accounts.userYtAccount,
        accounts.vaultAccount,
        accounts.ytMintPDA
      );

      console.log('✅ Withdraw successful! TX:', txId);
      return txId;

    } catch (err) {
      console.error('❌ Withdraw failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  // Initialize strategy
  const initializeStrategy = useCallback(async (
    tokenMint: PublicKey,
    rewardApy: number,
    name: string,
    description: string
  ) => {
    if (!contractService || !publicKey) {
      throw new Error('Wallet not connected or contract service not available');
    }

    setLoading(true);
    setError(null);

    try {
      const txId = await contractService.createStrategy(
        publicKey,
        tokenMint,
        rewardApy,
        name,
        description
      );

      console.log('✅ Strategy initialized! TX:', txId);
      return txId;

    } catch (err) {
      console.error('❌ Strategy initialization failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  // Initialize lending pool
  const initializeLendingPool = useCallback(async (
    tokenMint: PublicKey,
    poolOwner: PublicKey = DEFAULT_POOL_OWNER
  ) => {
    if (!contractService || !publicKey) {
      throw new Error('Wallet not connected or contract service not available');
    }

    setLoading(true);
    setError(null);

    try {
      // Build accounts to get vault address
      const accounts = await contractService.buildLendingAccounts(
        publicKey,
        poolOwner,
        tokenMint
      );

      const txId = await contractService.initializeLendingPool(
        poolOwner,
        accounts.vaultAccount
      );

      console.log('✅ Lending pool initialized! TX:', txId);
      return txId;

    } catch (err) {
      console.error('❌ Pool initialization failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  const redeem = useCallback(async (
    tokenMint: PublicKey,
    ytAmount: number,
    poolOwner: PublicKey = DEFAULT_POOL_OWNER
  ) => {
    if (!contractService || !publicKey) {
      throw new Error('Wallet not connected or contract service not available');
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting simplified redeem...');
      console.log('Token mint:', tokenMint.toString());
      console.log('YT Amount:', ytAmount);
      console.log('Pool owner:', poolOwner.toString());

      // Build tous les comptes nécessaires
      const accounts = await contractService.buildLendingAccounts(
        publicKey,
        poolOwner,
        tokenMint
      );

      console.log('📋 Built accounts for redeem:', {
        poolPDA: accounts.poolPDA.toString(),
        strategyPDA: accounts.strategyPDA.toString(),
        userDepositPDA: accounts.userDepositPDA.toString(),
        ytMintPDA: accounts.ytMintPDA.toString(),
        userTokenAccount: accounts.userTokenAccount.toString(),
        userYtAccount: accounts.userYtAccount.toString(),
        vaultAccount: accounts.vaultAccount.toString(),
      });

      // Convertir les Ytoken en décimales
      const decimals = tokenMint.equals(USDC_MINT) ? TOKEN_DECIMALS.USDC : TOKEN_DECIMALS.SOL;
      const ytAmountBN = Math.floor(ytAmount * Math.pow(10, decimals));

      console.log('💰 YT Amount with decimals:', ytAmountBN);

      // Appel de la redeem
      const txId = await contractService.redeem(
        publicKey,
        poolOwner,
        accounts.strategyPDA,
        ytAmountBN,
        accounts.ytMintPDA,
        accounts.userYtAccount,
        accounts.userTokenAccount, // pour récupérer les tokens
        accounts.vaultAccount
      );

      console.log('✅ Redeem successful! TX:', txId);
      return txId;

    } catch (err) {
      console.error('❌ Redeem failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  return {
    loading,
    error,
    deposit,
    withdraw,
    redeem,
    initializeStrategy,
    initializeLendingPool,
  };
};