import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useContracts } from './useContracts';
import { findLendingPoolPDA, findUserDepositPDA, findStrategyPDA } from '../lib/contracts';
import { TOKEN_SYMBOLS, DEVNET_CONFIG } from '@/lib/constants';

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
    strategy: PublicKey,
    amount: number,
    userTokenAccount: PublicKey,
    userYtAccount: PublicKey,
    vaultAccount: PublicKey,
    ytMint: PublicKey,
    tokenMint: PublicKey
  ) => {
    if (!contractService || !publicKey) return;

    setLoading(true);
    setError(null);

    try {
      const txId = await contractService.deposit(
        publicKey,
        strategy,
        amount,
        userTokenAccount,
        userYtAccount,
        vaultAccount,
        ytMint,
        tokenMint
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
    strategyId: number,
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
        strategyId,
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

  // Get user deposit data - simplified version that matches script logic
  const getUserDeposit = useCallback(async (
    user: PublicKey,
    strategy: PublicKey
  ) => {
    if (!contractService || !user) return { amount: 0, yieldEarned: 0, strategy };

    try {
      // Use the simplified method that matches script logic
      const depositData = await contractService.getUserDepositSimplified(user, strategy);
      if (depositData.exists) {
        return {
          amount: depositData.data.amount,
          yieldEarned: depositData.data.yieldEarned,
          depositTime: depositData.data.depositTime,
          strategy: strategy.toBase58()
        };
      }
      return { amount: 0, yieldEarned: 0, strategy: strategy.toBase58() };
    } catch (err) {
      console.error('Error fetching user deposit:', err);
      return { amount: 0, yieldEarned: 0, strategy: strategy.toBase58() };
    }
  }, [contractService]);

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

  // Fetch all strategies with user deposits
  const fetchStrategies = useCallback(async () => {
    console.log("fetchStrategies called");
    console.log("contractService:", contractService);
    console.log("contractService.getAllStrategies:", typeof contractService?.getAllStrategies);
    
    if (!contractService) {
      console.warn("No contractService available");
      return;
    }
    
    if (typeof contractService.getAllStrategies !== 'function') {
      console.warn("getAllStrategies is not a function");
      return;
    }
    
    setLoading(true);
    try {
      // Utilisation de la méthode publique du service
      const strategiesRaw = await contractService.getAllStrategies();
      
      // Correction : mapping Anchor avec récupération des dépôts utilisateur et soldes des vaults
      const allStrategies = await Promise.all(strategiesRaw.map(async (s: any) => {
        const account = s.account || {};
        const mintStr = account.tokenAddress?.toBase58();
        const strategyPubkey = s.publicKey;
        const strategyId = account.strategyId?.toNumber() || 0;
        const tokenAddress = account.tokenAddress;
        
        // Récupérer le dépôt utilisateur pour cette stratégie si connecté
        let userDepositInfo = null;
        if (publicKey && contractService.getUserDepositSimplified) {
          try {
            userDepositInfo = await contractService.getUserDepositSimplified(publicKey, strategyPubkey);
            console.log(`User deposit for strategy ${strategyPubkey.toBase58()}:`, userDepositInfo);
          } catch (err) {
            console.log(`No user deposit found for strategy ${strategyPubkey.toBase58()}`);
          }
        }
        
        // Récupérer le solde du vault comme dans le script
        let vaultInfo = null;
        if (contractService.getVaultBalance && tokenAddress && strategyId) {
          try {
            vaultInfo = await contractService.getVaultBalance(tokenAddress, strategyId);
            console.log(`Vault balance for strategy ${strategyPubkey.toBase58()}:`, vaultInfo);
          } catch (err) {
            console.log(`Failed to get vault balance for strategy ${strategyPubkey.toBase58()}`);
          }
        }
        
        return {
          id: s.publicKey?.toBase58(),
          strategyId,
          tokenAddress: mintStr,
          rewardApy: account.rewardApy?.toNumber(),
          name: account.name,
          description: account.description,
          createdAt: account.createdAt?.toNumber(),
          active: account.active,
          totalDeposited: account.totalDeposited?.toNumber() || 0,
          // Récupère enfin le vrai symbole depuis ta constante avec fallback amélioré
          tokenSymbol: TOKEN_SYMBOLS[mintStr] || (mintStr?.includes('So1') || mintStr?.includes('111111111111111111111111111111111') ? 'SOL' : 'SOL'),
          // Ajouter les informations de dépôt utilisateur
          userDeposit: userDepositInfo?.exists ? {
            amount: userDepositInfo.data.amount?.toNumber() || 0,
            yieldEarned: userDepositInfo.data.yieldEarned?.toNumber() || 0,
            depositTime: userDepositInfo.data.depositTime?.toNumber() || 0,
            strategy: s.publicKey?.toBase58()
          } : null,
          // Ajouter les informations du vault
          vaultBalance: vaultInfo?.balance || 0,
          vaultPda: vaultInfo?.pda?.toBase58() || null,
          // Ajouter le YT mint address depuis les données du contract
          tokenYieldAddress: account.tokenYieldAddress?.toBase58() || account.token_yield_address?.toBase58() || null
        };
      }));
      
      console.log("Fetched strategies from contract with user deposits and vault balances:", allStrategies);
      
      // Log detailed information for debugging
      allStrategies.forEach((strategy, index) => {
        console.log(`Strategy ${index + 1}:`, {
          id: strategy.id,
          name: strategy.name,
          tokenSymbol: strategy.tokenSymbol,
          strategyId: strategy.strategyId,
          vaultBalance: strategy.vaultBalance,
          userDeposit: strategy.userDeposit,
          active: strategy.active
        });
      });
      
      setStrategies(allStrategies);
      setError(null);
      return allStrategies;
    } catch (err) {
      console.error('Error fetching strategies:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch strategies');
      setStrategies([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  // Get user token balance
  const getUserTokenBalance = useCallback(async (tokenMint: PublicKey) => {
    if (!contractService || !publicKey) return null;

    try {
      console.log('getUserTokenBalance: mint', tokenMint.toString(), 'owner', publicKey.toString());
      const tokenAccountInfo = await contractService.getTokenAccountInfo(tokenMint, publicKey);
      console.log('Résultat getTokenAccountInfo:', tokenAccountInfo);
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

  // Toggle strategy status
  const toggleStrategyStatus = useCallback(async (
    tokenAddress: PublicKey,
    strategyId: number
  ) => {
    if (!contractService || !publicKey) {
      throw new Error('Wallet not connected or contract service not available');
    }

    setLoading(true);
    setError(null);

    try {
      const txId = await contractService.toggleStrategyStatus(
        publicKey,
        tokenAddress,
        strategyId
      );
      console.log('Strategy status toggled:', txId);
      
      // Refresh strategies after toggle
      await fetchStrategies();
      
      return txId;
    } catch (err) {
      console.error('Error toggling strategy status:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle strategy status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey, fetchStrategies]);

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
    toggleStrategyStatus,
  };
};