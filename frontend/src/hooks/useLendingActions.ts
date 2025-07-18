import { useState, useCallback } from 'react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token';
import { useContracts } from './useContracts';
import { LENDING_PROGRAM_ID } from '../lib/constants';

export const useLendingActions = () => {
  const { publicKey, sendTransaction } = useWallet();
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

  // Fonction pour dériver le user deposit PDA basée sur la logique du script (sans pool)
  const findUserDepositPDA = useCallback(async (user: PublicKey, strategy: PublicKey) => {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from("user_deposit"),
        user.toBuffer(),
        strategy.toBuffer(),
      ],
      LENDING_PROGRAM_ID
    );
  }, []);

  // Fonction pour obtenir le programme Anchor directement
  const getLendingProgram = useCallback(async () => {
    if (!contractService) {
      throw new Error('Contract service not available');
    }

    // Accéder au programme via les stratégies existantes (méthode indirecte)
    const allStrategies = await contractService.getAllStrategies();
    if (allStrategies.length === 0) {
      throw new Error('No strategies found to get lending program');
    }

    // Créer le programme directement avec le bon provider
    const { getLendingProgram, getProvider } = await import('../lib/contracts');
    const { useWallet } = await import('@solana/wallet-adapter-react');
    
    // On utilise une méthode pour accéder au programme depuis le contractService
    // Malheureusement, le lendingProgram est privé, donc on va contourner
    const lendingProgram = (contractService as any).lendingProgram;
    if (!lendingProgram) {
      throw new Error('Lending program not available');
    }
    
    return lendingProgram;
  }, [contractService]);
  // Fonction pour s'assurer que le compte YT existe
  const ensureYtAccountExists = useCallback(async (ytMint: PublicKey, userPublicKey: PublicKey) => {
    const userYtAccount = await getAssociatedTokenAddress(ytMint, userPublicKey);
    
    try {
      // Vérifier si le compte existe déjà
      await getAccount(connection, userYtAccount);
      console.log('✅ Compte YT existe déjà:', userYtAccount.toString());
      return userYtAccount;
    } catch (error) {
      // Le compte n'existe pas, il faut le créer
      console.log('🔨 Création du compte YT:', userYtAccount.toString());
      
      const transaction = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          userPublicKey, // payer
          userYtAccount, // associatedToken
          userPublicKey, // owner
          ytMint // mint
        )
      );

      // Envoyer la transaction pour créer le compte
      if (!sendTransaction) {
        throw new Error('Wallet sendTransaction not available');
      }

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log('✅ Compte YT créé avec succès:', signature);
      return userYtAccount;
    }
  }, [connection, sendTransaction]);

  const getStrategyData = useCallback(async (strategyAddress: string) => {
    if (!contractService) {
      throw new Error('Contract service not available');
    }

    try {
      console.log('🔍 Looking for strategy:', strategyAddress);
      
      // Utiliser la méthode publique pour récupérer toutes les stratégies
      const allStrategies = await contractService.getAllStrategies();
      console.log('🔍 Available strategies:', allStrategies.map((s: any) => ({
        publicKey: s.publicKey.toString(),
        account: s.account
      })));
      
      const strategy = allStrategies.find((s: any) => s.publicKey.toString() === strategyAddress);
      
      if (!strategy) {
        console.error('❌ Strategy not found!');
        console.error('Looking for:', strategyAddress);
        console.error('Available strategies:', allStrategies.map((s: any) => s.publicKey.toString()));
        throw new Error('Strategy not found');
      }

      console.log('✅ Found strategy:', strategy);
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
      let userTokenAccount: PublicKey;
      if (tokenMint.toString() === "So11111111111111111111111111111111111111112") {
        // Pour SOL natif, utiliser le wallet comme source
        userTokenAccount = publicKey;
      } else {
        // Pour les autres tokens, créer automatiquement l'ATA si nécessaire
        try {
          const userTokenAccounts = await connection.getTokenAccountsByOwner(
            publicKey, 
            { mint: tokenMint }
          );
          
          if (userTokenAccounts.value.length > 0) {
            userTokenAccount = userTokenAccounts.value[0].pubkey;
          } else {
            // Créer automatiquement l'ATA pour le token
            console.log(`🔨 Creating ATA for token ${tokenMint.toString()}`);
            const userTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
              connection,
              {
                publicKey,
                secretKey: null as any, // Pas utilisé pour getOrCreateAssociatedTokenAccount
                signTransaction: sendTransaction as any,
                signAllTransactions: null as any
              } as any,
              tokenMint,
              publicKey
            );
            userTokenAccount = userTokenAccountInfo.address;
            console.log(`✅ ATA created: ${userTokenAccount.toString()}`);
          }
        } catch (error) {
          console.error(`❌ Failed to create ATA for token ${tokenMint.toString()}:`, error);
          throw new Error(`Failed to create token account for ${tokenMint.toString()}. You may need to get this token first.`);
        }
      }

      // 2. Compte YT de l'utilisateur (créer s'il n'existe pas)
      const ytMintAddress = new PublicKey(ytMint);
      const userYtAccount = await ensureYtAccountExists(ytMintAddress, publicKey);

      // 3. Vault PDA
      const [vaultPda] = await findVaultPDA(tokenMint, strategyId);

      // 5. Conversion du montant avec les décimales
      const amountBN = new BN(amount * Math.pow(10, tokenDecimals));

      // 6. UserDeposit PDA (simplifié, basé sur le script)
      const [userDepositPda] = await findUserDepositPDA(publicKey, strategyPubkey);

      // Utiliser directement le programme Anchor avec la bonne signature de l'IDL
      const lendingProgram = await getLendingProgram();
      
      console.log('📋 Comptes utilisés:', {
        user: publicKey.toString(),
        userDeposit: userDepositPda.toString(),
        strategy: strategyPubkey.toString(),
        userTokenAccount: userTokenAccount.toString(),
        userYtAccount: userYtAccount.toString(),
        tokenMint: tokenMint.toString(),
        vaultAccount: vaultPda.toString(),
        ytMint: ytMintAddress.toString(),
      });

      const txId = await lendingProgram.methods
        .deposit(amountBN)
        .accounts({
          user: publicKey,
          userDeposit: userDepositPda,
          strategy: strategyPubkey,
          userTokenAccount: userTokenAccount,
          userYtAccount: userYtAccount,
          tokenMint: tokenMint,  // ← Le compte manquant !
          vaultAccount: vaultPda,
          ytMint: ytMintAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Dépôt effectué avec succès !", txId);
      return txId;

    } catch (err) {
      console.error('❌ Erreur lors du dépôt:', err);
      
      // Gestion d'erreurs spécifiques
      let errorMessage = 'Failed to deposit';
      if (err instanceof Error) {
        if (err.message.includes('InsufficientDepositAmount')) {
          errorMessage = 'Minimum deposit amount is 1 token. Please increase your deposit amount.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey, connection, findVaultPDA, getStrategyData, ensureYtAccountExists]);

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

      // 2. Compte YT de l'utilisateur (s'assurer qu'il existe)
      const ytMintAddress = new PublicKey(ytMint);
      const userYtAccount = await ensureYtAccountExists(ytMintAddress, publicKey);

      // 3. Vault PDA
      const [vaultPda] = await findVaultPDA(tokenMint, strategyId);

      // 5. Conversion du montant avec les décimales
      const amountBN = new BN(amount * Math.pow(10, tokenDecimals));

      // 6. UserDeposit PDA (simplifié, basé sur le script)
      const [userDepositPda] = await findUserDepositPDA(publicKey, strategyPubkey);

      // Utiliser directement le programme Anchor avec la bonne signature de l'IDL
      const lendingProgram = await getLendingProgram();
      
      console.log('📋 Comptes utilisés pour withdraw:', {
        user: publicKey.toString(),
        userDeposit: userDepositPda.toString(),
        strategy: strategyPubkey.toString(),
        userTokenAccount: userTokenAccount.toString(),
        userYtAccount: userYtAccount.toString(),
        tokenMint: tokenMint.toString(),
        vaultAccount: vaultPda.toString(),
        ytMint: ytMintAddress.toString(),
      });

      const txId = await lendingProgram.methods
        .withdraw(amountBN)
        .accounts({
          user: publicKey,
          userDeposit: userDepositPda,
          strategy: strategyPubkey,
          userTokenAccount: userTokenAccount,
          userYtAccount: userYtAccount,
          tokenMint: tokenMint,  // ← Le compte manquant !
          vaultAccount: vaultPda,
          ytMint: ytMintAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Retrait effectué avec succès !", txId);
      return txId;

    } catch (err) {
      console.error('❌ Erreur lors du retrait:', err);
      setError(err instanceof Error ? err.message : 'Failed to withdraw');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey, connection, findVaultPDA, getStrategyData, ensureYtAccountExists]);

  return {
    deposit,
    withdraw,
    loading,
    error,
  };
};
