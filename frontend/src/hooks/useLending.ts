import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useContracts } from './useContracts';
import { findLendingPoolPDA, findUserDepositPDA, findStrategyPDA } from '../lib/contracts';

export const useLending = () => {
  const { publicKey } = useWallet();
  const contractService = useContracts();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userDeposits, setUserDeposits] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [pools, setPools] = useState<any[]>([]);

  // Initialize user deposit account
  const initializeUserDeposit = useCallback(async (
    poolOwner: PublicKey,
    strategy: PublicKey
  ) => {
    if (!contractService || !publicKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const txId = await contractService.initializeUserDeposit(
        publicKey,
        poolOwner,
        strategy
      );
      console.log('User deposit initialized:', txId);
      return txId;
    } catch (err) {
      console.error('Error initializing user deposit:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize user deposit');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  // Deposit tokens
  const deposit = useCallback(async (
    poolOwner: PublicKey,
    strategy: PublicKey,
    amount: number,
    userTokenAccount: PublicKey,
    userYtAccount: PublicKey,
    vaultAccount: PublicKey,
    ytMint: PublicKey
  ) => {
    if (!contractService || !publicKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const txId = await contractService.deposit(
        publicKey,
        poolOwner,
        strategy,
        amount,
        userTokenAccount,
        userYtAccount,
        vaultAccount,
        ytMint
      );
      console.log('Deposit successful:', txId);
      return txId;
    } catch (err) {
      console.error('Error depositing:', err);
      setError(err instanceof Error ? err.message : 'Failed to deposit');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  // Withdraw tokens
  const withdraw = useCallback(async (
    poolOwner: PublicKey,
    strategy: PublicKey,
    amount: number,
    userTokenAccount: PublicKey,
    userYtAccount: PublicKey,
    vaultAccount: PublicKey,
    ytMint: PublicKey
  ) => {
    if (!contractService || !publicKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const txId = await contractService.withdraw(
        publicKey,
        poolOwner,
        strategy,
        amount,
        userTokenAccount,
        userYtAccount,
        vaultAccount,
        ytMint
      );
      console.log('Withdrawal successful:', txId);
      return txId;
    } catch (err) {
      console.error('Error withdrawing:', err);
      setError(err instanceof Error ? err.message : 'Failed to withdraw');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  // Redeem yield tokens
  const redeem = useCallback(async (
    poolOwner: PublicKey,
    strategy: PublicKey,
    ytAmount: number,
    ytMint: PublicKey,
    userTokenAccount: PublicKey,
    userUsdcAccount: PublicKey,
    vaultAccount: PublicKey
  ) => {
    if (!contractService || !publicKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const txId = await contractService.redeem(
        publicKey,
        poolOwner,
        strategy,
        ytAmount,
        ytMint,
        userTokenAccount,
        userUsdcAccount,
        vaultAccount
      );
      console.log('Redemption successful:', txId);
      return txId;
    } catch (err) {
      console.error('Error redeeming:', err);
      setError(err instanceof Error ? err.message : 'Failed to redeem');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  // Create strategy
  const createStrategy = useCallback(async (
    tokenAddress: PublicKey,
    rewardApy: number,
    name: string,
    description: string
  ) => {
    if (!contractService || !publicKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const txId = await contractService.createStrategy(
        publicKey,
        tokenAddress,
        rewardApy,
        name,
        description
      );
      console.log('Strategy created:', txId);
      return txId;
    } catch (err) {
      console.error('Error creating strategy:', err);
      setError(err instanceof Error ? err.message : 'Failed to create strategy');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  // Get user deposit data
  const getUserDeposit = useCallback(async (
    poolOwner: PublicKey,
    strategy: PublicKey
  ) => {
    if (!contractService || !publicKey) return null;
    
    try {
      const [poolPDA] = findLendingPoolPDA(poolOwner);
      const depositData = await contractService.getUserDeposit(publicKey, poolPDA, strategy);
      return depositData;
    } catch (err) {
      console.error('Error fetching user deposit:', err);
      return null;
    }
  }, [contractService, publicKey]);

  // Get strategy data
  const getStrategy = useCallback(async (tokenAddress: PublicKey) => {
    if (!contractService) return null;
    
    try {
      const strategyData = await contractService.getStrategy(tokenAddress);
      return strategyData;
    } catch (err) {
      console.error('Error fetching strategy:', err);
      return null;
    }
  }, [contractService]);

  // Get pool data
  const getPool = useCallback(async (poolOwner: PublicKey) => {
    if (!contractService) return null;
    
    try {
      const poolData = await contractService.getPool(poolOwner);
      return poolData;
    } catch (err) {
      console.error('Error fetching pool:', err);
      return null;
    }
  }, [contractService]);

  // Fetch all strategies
  const fetchStrategies = useCallback(async () => {
    if (!contractService) return;
    
    setLoading(true);
    try {
      const allStrategies = await contractService.getAllStrategies();
      console.log("Fetched strategies from contract:", allStrategies);
      setStrategies(allStrategies);
      setError(null);
    } catch (err) {
      console.error('Error fetching strategies:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch strategies');
      setStrategies([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [contractService]);

  // Load initial data
  useEffect(() => {
    if (contractService) {
      fetchStrategies();
    }
  }, [contractService, fetchStrategies]);

  // Get user token balance
  const getUserTokenBalance = useCallback(async (tokenMint: PublicKey) => {
    if (!contractService || !publicKey) return null;
    
    try {
      const tokenAccountInfo = await contractService.getTokenAccountInfo(tokenMint, publicKey);
      return tokenAccountInfo;
    } catch (err) {
      console.error('Error fetching user token balance:', err);
      return null;
    }
  }, [contractService, publicKey]);

  // Initialize lending pool
  const initializeLendingPool = useCallback(async (
    creator: PublicKey,
    vaultAccount: PublicKey
  ) => {
    if (!contractService || !publicKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const txId = await contractService.initializeLendingPool(creator, vaultAccount);
      console.log('Lending pool initialized:', txId);
      return txId;
    } catch (err) {
      console.error('Error initializing lending pool:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize lending pool');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  return {
    loading,
    error,
    userDeposits,
    strategies,
    pools,
    initializeUserDeposit,
    initializeLendingPool,
    deposit,
    withdraw,
    redeem,
    createStrategy,
    getUserDeposit,
    getStrategy,
    getPool,
    fetchStrategies,
    getUserTokenBalance,
  };
};