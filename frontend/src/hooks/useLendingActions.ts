import { useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { useContracts } from './useContracts';
import { LENDING_PROGRAM_ID } from '../lib/constants';

export const useLendingActions = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const contractService = useContracts();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour dériver le vault PDA basée sur la logique du script
  const findVaultPDA = useCallback(async (tokenMint: PublicKey, strategyId: number) => {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from("vault_account"),
        tokenMint.toBuffer(),
        Buffer.from(new BN(strategyId).toArray("le", 8)),
      ],
      LENDING_PROGRAM_ID
    );
  }, []);

  // Fonction pour récupérer la stratégie et obtenir le YT mint
  const getStrategyData = useCallback(async (strategyAddress: string) => {
    if (!contractService) {
      throw new Error('Contract service not available');
    }

    try {
      // Utiliser la méthode publique pour récupérer toutes les stratégies
      const allStrategies = await contractService.getAllStrategies();
      const strategy = allStrategies.find((s: any) => s.publicKey.toString() === strategyAddress);
      
      if (!strategy) {
        throw new Error('Strategy not found');
      }

      return {
        strategy: strategy.account,
        ytMint: strategy.account.tokenYieldAddress || strategy.account.token_yield_address
      };
    } catch (error) {
      console.error('Error getting strategy data:', error);
      throw error;
    }
  }, [contractService]);

  // Fonction deposit simplifiée basée sur fetch-all-strategies.js
  const deposit = useCallback(async (
    strategyAddress: string,
    tokenMint: PublicKey,
    strategyId: number,
    amount: number,
    tokenDecimals: number = 6
  ) => {
    if (!contractService || !publicKey) {
      throw new Error('Wallet not connected or contract service not available');
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting deposit...');
      const strategyPubkey = new PublicKey(strategyAddress);
      
      // Récupérer les données de la stratégie pour obtenir le YT mint
      const { ytMint } = await getStrategyData(strategyAddress);
      
      // 1. Compte token de l'utilisateur
      const userTokenAccounts = await connection.getTokenAccountsByOwner(
        publicKey, 
        { mint: tokenMint }
      );
      if (!userTokenAccounts.value.length) {
        throw new Error(`Aucun compte ${tokenMint.toString()} trouvé pour ce wallet`);
      }
      const userTokenAccount = userTokenAccounts.value[0].pubkey;

      // 2. Compte YT de l'utilisateur
      const userYtAccount = await getAssociatedTokenAddress(new PublicKey(ytMint), publicKey);

      // 3. Vault PDA
      const [vaultPda] = await findVaultPDA(tokenMint, strategyId);

      // 4. YT mint address
      const ytMintAddress = new PublicKey(ytMint);

      // 5. Conversion du montant avec les décimales
      const amountBN = new BN(amount * Math.pow(10, tokenDecimals));

      // Utiliser la méthode deposit du contractService
      const txId = await contractService.deposit(
        publicKey,
        publicKey, // poolOwner - utiliser l'utilisateur comme pool owner
        strategyPubkey,
        amountBN.toNumber(),
        userTokenAccount,
        userYtAccount,
        vaultPda,
        ytMintAddress
      );

      console.log("✅ Dépôt effectué avec succès !", txId);
      return txId;

    } catch (err) {
      console.error('❌ Erreur lors du dépôt:', err);
      setError(err instanceof Error ? err.message : 'Failed to deposit');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey, connection, findVaultPDA, getStrategyData]);

  // Fonction withdraw simplifiée basée sur fetch-all-strategies.js
  const withdraw = useCallback(async (
    strategyAddress: string,
    tokenMint: PublicKey,
    strategyId: number,
    amount: number,
    tokenDecimals: number = 6
  ) => {
    if (!contractService || !publicKey) {
      throw new Error('Wallet not connected or contract service not available');
    }

    setLoading(true);
    setError(null);

    try {
      console.log('💸 Starting withdraw...');
      const strategyPubkey = new PublicKey(strategyAddress);
      
      // Récupérer les données de la stratégie pour obtenir le YT mint
      const { ytMint } = await getStrategyData(strategyAddress);
      
      // 1. Compte token de l'utilisateur
      const userTokenAccounts = await connection.getTokenAccountsByOwner(
        publicKey, 
        { mint: tokenMint }
      );
      if (!userTokenAccounts.value.length) {
        throw new Error(`Aucun compte ${tokenMint.toString()} trouvé pour ce wallet`);
      }
      const userTokenAccount = userTokenAccounts.value[0].pubkey;

      // 2. Compte YT de l'utilisateur
      const userYtAccount = await getAssociatedTokenAddress(new PublicKey(ytMint), publicKey);

      // 3. Vault PDA
      const [vaultPda] = await findVaultPDA(tokenMint, strategyId);

      // 4. YT mint address
      const ytMintAddress = new PublicKey(ytMint);

      // 5. Conversion du montant avec les décimales
      const amountBN = new BN(amount * Math.pow(10, tokenDecimals));

      // Utiliser la méthode withdraw du contractService
      const txId = await contractService.withdraw(
        publicKey,
        publicKey, // poolOwner - utiliser l'utilisateur comme pool owner
        strategyPubkey,
        amountBN.toNumber(),
        userTokenAccount,
        userYtAccount,
        vaultPda,
        ytMintAddress
      );

      console.log("✅ Retrait effectué avec succès !", txId);
      return txId;

    } catch (err) {
      console.error('❌ Erreur lors du retrait:', err);
      setError(err instanceof Error ? err.message : 'Failed to withdraw');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey, connection, findVaultPDA, getStrategyData]);

  return {
    deposit,
    withdraw,
    loading,
    error,
  };
};
