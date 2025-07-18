import { useState, useCallback } from 'react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { BN } from '@coral-xyz/anchor';
import { 
  getAssociatedTokenAddress, 
  TOKEN_PROGRAM_ID, 
  createAssociatedTokenAccountInstruction, 
  getAccount,
  createSyncNativeInstruction,
  NATIVE_MINT,
  createCloseAccountInstruction
} from '@solana/spl-token';
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
      const { ytMint, strategy } = await getStrategyData(strategyAddress);
      
      // Pour le vault PDA, utiliser l'adresse token de la stratégie (pas l'adresse corrigée)
      const strategyTokenMint = new PublicKey(strategy.tokenAddress);
      
      // 1. Compte token de l'utilisateur
      let userTokenAccount: PublicKey;
      if (tokenMint.toString() === "So11111111111111111111111111111111111111112") {
        // Pour SOL natif, créer un compte wSOL (Wrapped SOL)
        userTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          publicKey
        );
        
        // Vérifier si le compte wSOL existe, sinon le créer
        try {
          await getAccount(connection, userTokenAccount);
        } catch (error) {
          // Le compte n'existe pas, le créer dans la transaction
          console.log('🔄 Compte wSOL non trouvé, il sera créé dans la transaction');
        }
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

      // 3. Vault PDA - IMPORTANT: utiliser l'adresse token de la stratégie
      const [vaultPda] = await findVaultPDA(strategyTokenMint, strategyId);

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
        tokenMint: strategyTokenMint.toString(), // Utiliser l'adresse de la stratégie
        correctedTokenMint: tokenMint.toString(), // Pour debug
        vaultAccount: vaultPda.toString(),
        ytMint: ytMintAddress.toString(),
      });

      let txId: string;

      // Gérer différemment SOL natif et SPL tokens
      if (tokenMint.toString() === "So11111111111111111111111111111111111111112") {
        // Pour SOL natif, créer une transaction complexe avec wSOL
        console.log('🔄 Handling native SOL deposit with wSOL...');
        
        const transaction = new Transaction();
        
        // 1. Créer le compte wSOL associé si nécessaire
        try {
          await getAccount(connection, userTokenAccount);
          console.log('✅ Compte wSOL existe déjà');
        } catch (error) {
          console.log('🔧 Création du compte wSOL...');
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              userTokenAccount, // associatedToken
              publicKey, // owner
              tokenMint // mint (SOL natif)
            )
          );
        }

        // 2. Transférer SOL vers le compte wSOL
        const lamports = amountBN.toNumber(); // amountBN est déjà en lamports
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: userTokenAccount,
            lamports: lamports,
          })
        );

        // 3. Synchroniser le compte wSOL
        transaction.add(
          createSyncNativeInstruction(userTokenAccount)
        );

        // 4. Ajouter l'instruction de dépôt du programme lending
        const depositInstruction = await lendingProgram.methods
          .deposit(amountBN)
          .accounts({
            user: publicKey,
            userDeposit: userDepositPda,
            strategy: strategyPubkey,
            userTokenAccount: userTokenAccount,
            userYtAccount: userYtAccount,
            tokenMint: strategyTokenMint, // Utiliser l'adresse de la stratégie
            vaultAccount: vaultPda,
            ytMint: ytMintAddress,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .instruction();
        
        transaction.add(depositInstruction);

        // 5. Envoyer la transaction complète
        if (!sendTransaction) {
          throw new Error('Wallet sendTransaction not available');
        }

        txId = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(txId, 'confirmed');
        
      } else {
        // Pour les SPL tokens, utiliser la méthode normale
        txId = await lendingProgram.methods
          .deposit(amountBN)
          .accounts({
            user: publicKey,
            userDeposit: userDepositPda,
            strategy: strategyPubkey,
            userTokenAccount: userTokenAccount,
            userYtAccount: userYtAccount,
            tokenMint: strategyTokenMint, // Utiliser l'adresse de la stratégie
            vaultAccount: vaultPda,
            ytMint: ytMintAddress,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      }

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
      const { ytMint, strategy } = await getStrategyData(strategyAddress);
      
      // Pour le vault PDA, utiliser l'adresse token de la stratégie (pas l'adresse corrigée)
      const strategyTokenMint = new PublicKey(strategy.tokenAddress);
      
      // 1. Compte token de l'utilisateur - IMPORTANT: utiliser le même mint que la stratégie
      let userTokenAccount: PublicKey;
      if (tokenMint.toString() === "So11111111111111111111111111111111111111112") {
        // Pour SOL natif, le smart contract stocke la stratégie avec NATIVE_MINT (wSOL)
        // Donc on doit utiliser le compte wSOL associé avec le strategyTokenMint
        userTokenAccount = await getAssociatedTokenAddress(
          strategyTokenMint, // Utiliser le mint de la stratégie (NATIVE_MINT pour SOL)
          publicKey
        );
        
        console.log('🔧 Using wSOL account for SOL withdraw:', {
          userTokenAccount: userTokenAccount.toString(),
          strategyTokenMint: strategyTokenMint.toString(),
          tokenMint: tokenMint.toString()
        });
        
        // Vérifier si le compte wSOL existe, le créer si nécessaire
        try {
          await getAccount(connection, userTokenAccount);
          console.log('✅ Compte wSOL existe déjà pour withdraw');
        } catch (error) {
          console.log('🔧 Compte wSOL non trouvé, il sera créé pour le withdraw...');
          // Le compte sera créé dans la transaction de withdraw
        }
      } else {
        // Pour les SPL tokens, utiliser le mint de la stratégie
        const userTokenAccounts = await connection.getTokenAccountsByOwner(
          publicKey, 
          { mint: strategyTokenMint } // Utiliser le mint de la stratégie, pas le mint corrigé
        );
        if (!userTokenAccounts.value.length) {
          throw new Error(`Aucun compte ${strategyTokenMint.toString()} trouvé pour ce wallet`);
        }
        userTokenAccount = userTokenAccounts.value[0].pubkey;
      }

      // 2. Compte YT de l'utilisateur (s'assurer qu'il existe)
      const ytMintAddress = new PublicKey(ytMint);
      const userYtAccount = await ensureYtAccountExists(ytMintAddress, publicKey);

      // 3. Vault PDA - IMPORTANT: utiliser l'adresse token de la stratégie
      const [vaultPda] = await findVaultPDA(strategyTokenMint, strategyId);

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
        tokenMint: strategyTokenMint.toString(), // Utiliser l'adresse de la stratégie
        correctedTokenMint: tokenMint.toString(), // Pour debug
        vaultAccount: vaultPda.toString(),
        ytMint: ytMintAddress.toString(),
        amountBN: amountBN.toString(),
      });

      // Vérification supplémentaire pour SOL : s'assurer que tous les comptes utilisent le bon mint
      if (tokenMint.toString() === "So11111111111111111111111111111111111111112") {
        console.log('🔍 SOL Withdraw Verification:', {
          strategyTokenMintIsNative: strategyTokenMint.toString() === "So11111111111111111111111111111111111111112",
          expectedWSOLAccount: userTokenAccount.toString(),
          vaultAccountForMint: vaultPda.toString()
        });
      }

      let txId: string;

      // Gérer différemment SOL natif et SPL tokens pour le withdraw aussi
      if (tokenMint.toString() === "So11111111111111111111111111111111111111112") {
        // Pour SOL natif, créer une transaction avec création du compte wSOL si nécessaire
        console.log('🔄 Handling native SOL withdraw with automatic wSOL account creation...');
        
        const transaction = new Transaction();
        
        // 1. Créer le compte wSOL associé si nécessaire
        try {
          await getAccount(connection, userTokenAccount);
          console.log('✅ Compte wSOL existe déjà pour withdraw');
        } catch (error) {
          console.log('🔧 Création du compte wSOL pour withdraw...');
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              userTokenAccount, // associatedToken
              publicKey, // owner
              strategyTokenMint // mint (NATIVE_MINT pour SOL)
            )
          );
        }

        // 2. Ajouter l'instruction de withdraw du programme lending
        const withdrawInstruction = await lendingProgram.methods
          .withdraw(amountBN)
          .accounts({
            user: publicKey,
            userDeposit: userDepositPda,
            strategy: strategyPubkey,
            userTokenAccount: userTokenAccount,
            userYtAccount: userYtAccount,
            tokenMint: strategyTokenMint,  // CRITIQUE: Utiliser exactement le mint de la stratégie
            vaultAccount: vaultPda,
            ytMint: ytMintAddress,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .instruction();
        
        transaction.add(withdrawInstruction);

        // 3. Envoyer la transaction complète
        if (!sendTransaction) {
          throw new Error('Wallet sendTransaction not available');
        }

        txId = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(txId, 'confirmed');
        
        // TODO: Ajouter plus tard la logique pour unwrap le wSOL si l'utilisateur le souhaite
        
      } else {
        // Pour les SPL tokens, utiliser la méthode normale
        txId = await lendingProgram.methods
          .withdraw(amountBN)
          .accounts({
            user: publicKey,
            userDeposit: userDepositPda,
            strategy: strategyPubkey,
            userTokenAccount: userTokenAccount,
            userYtAccount: userYtAccount,
            tokenMint: strategyTokenMint,  // CRITIQUE: Utiliser exactement le mint de la stratégie
            vaultAccount: vaultPda,
            ytMint: ytMintAddress,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      }

      console.log("✅ Retrait effectué avec succès !", txId);
      return txId;

    } catch (err) {
      console.error('❌ Erreur lors du retrait:', err);
      
      // Log détaillé pour les erreurs de transaction
      if (err && typeof err === 'object' && 'transactionLogs' in err) {
        console.error('📋 Transaction logs:', (err as any).transactionLogs);
        console.error('📋 Transaction message:', (err as any).transactionMessage);
        console.error('📋 Program error stack:', (err as any).programErrorStack);
      }
      
      setError(err instanceof Error ? err.message : 'Failed to withdraw');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey, connection, findVaultPDA, getStrategyData, ensureYtAccountExists]);

  // Fonction redeem simplifiée basée sur les strategies (pas les pools)
  const redeem = useCallback(async (
    strategyAddress: string,
    tokenMint: PublicKey,
    strategyId: number,
    ytAmount: number,
    tokenDecimals: number = 6
  ) => {
    if (!contractService || !publicKey) {
      throw new Error('Wallet not connected or contract service not available');
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🎁 Starting redeem...');
      console.log('🔍 Redeem parameters:', {
        strategyAddress,
        tokenMint: tokenMint.toString(),
        strategyId,
        ytAmount,
        tokenDecimals
      });

      const strategyPubkey = new PublicKey(strategyAddress);
      
      // Récupérer les données de la stratégie pour obtenir le YT mint
      const { ytMint, strategy } = await getStrategyData(strategyAddress);
      
      // Pour le vault PDA, utiliser l'adresse token de la stratégie
      const strategyTokenMint = new PublicKey(strategy.tokenAddress);
      
      // 1. Compte token de l'utilisateur - utiliser le même mint que la stratégie
      let userTokenAccount: PublicKey;
      if (tokenMint.toString() === "So11111111111111111111111111111111111111112") {
        // Pour SOL natif, utiliser le compte wSOL
        userTokenAccount = await getAssociatedTokenAddress(
          strategyTokenMint,
          publicKey
        );
        
        console.log('🔧 Using wSOL account for SOL redeem:', {
          userTokenAccount: userTokenAccount.toString(),
          strategyTokenMint: strategyTokenMint.toString(),
          tokenMint: tokenMint.toString()
        });
        
        // Vérifier si le compte wSOL existe, le créer si nécessaire
        try {
          await getAccount(connection, userTokenAccount);
          console.log('✅ Compte wSOL existe déjà pour redeem');
        } catch (error) {
          console.log('🔧 Compte wSOL non trouvé, il sera créé pour le redeem...');
        }
      } else {
        // Pour les SPL tokens, utiliser le mint de la stratégie
        const userTokenAccounts = await connection.getTokenAccountsByOwner(
          publicKey, 
          { mint: strategyTokenMint }
        );
        if (!userTokenAccounts.value.length) {
          throw new Error(`Aucun compte ${strategyTokenMint.toString()} trouvé pour ce wallet`);
        }
        userTokenAccount = userTokenAccounts.value[0].pubkey;
      }

      // 2. Compte YT de l'utilisateur
      const ytMintAddress = new PublicKey(ytMint);
      const userYtAccount = await getAssociatedTokenAddress(ytMintAddress, publicKey);
      
      // Vérifier que l'utilisateur a des YTokens à redeem
      try {
        const ytAccountInfo = await getAccount(connection, userYtAccount);
        const balance = Number(ytAccountInfo.amount) / Math.pow(10, 6); // 6 décimales pour YT
        
        console.log(`💰 Real YT balance for ${ytMintAddress.slice(0, 8)}...${ytMintAddress.slice(-8)}:`, balance);
        
        if (balance === 0) {
          throw new Error('No YT tokens found. After making a deposit, you should receive YT tokens. Please check if your deposit was successful.');
        }
        
        if (balance < ytAmount) {
          throw new Error(`Insufficient YT tokens. You have ${balance.toFixed(6)} but trying to redeem ${ytAmount}`);
        }
      } catch (error) {
        if (error instanceof Error && (error.message.includes('Insufficient YT tokens') || error.message.includes('No YT tokens found'))) {
          throw error;
        }
        
        console.log('🔍 YT Account does not exist or is empty, checking if user has made any deposits...');
        
        // Vérifier si l'utilisateur a fait des dépôts
        try {
          const [userDepositPda] = await findUserDepositPDA(publicKey, strategyPubkey);
          const lendingProgram = await getLendingProgram();
          const userDepositAccount = await lendingProgram.account.userDeposit.fetch(userDepositPda);
          
          console.log('💰 Info sur le dépôt utilisateur:', {
            amount: userDepositAccount.amount.toString(),
            yieldEarned: userDepositAccount.yieldEarned.toString(),
            user: userDepositAccount.user.toString()
          });
          
          if (userDepositAccount.amount.toNumber() === 0) {
            throw new Error('No deposits found. Please make a deposit first to earn YT tokens.');
          } else {
            throw new Error(`You have a deposit of ${userDepositAccount.amount.toNumber()} but no YT tokens. This might indicate an issue with YT token minting during deposit.`);
          }
        } catch (fetchError) {
          throw new Error('No YT tokens found and unable to verify deposit status. Please make a deposit first to earn yield tokens.');
        }
      }

      // 3. Vault PDA - utiliser l'adresse token de la stratégie
      const [vaultPda] = await findVaultPDA(strategyTokenMint, strategyId);

      // 4. Conversion du montant YT avec les décimales (YT tokens ont 6 decimals)
      const ytAmountBN = new BN(ytAmount * Math.pow(10, 6));

      // 5. UserDeposit PDA
      const [userDepositPda] = await findUserDepositPDA(publicKey, strategyPubkey);

      // Utiliser directement le programme Anchor
      const lendingProgram = await getLendingProgram();
      
      console.log('📋 Comptes utilisés pour redeem:', {
        user: publicKey.toString(),
        userDeposit: userDepositPda.toString(),
        strategy: strategyPubkey.toString(),
        ytMint: ytMintAddress.toString(),
        userTokenAccount: userTokenAccount.toString(),
        userUsdcAccount: userTokenAccount.toString(), // Same as userTokenAccount pour le redeem
        vaultAccount: vaultPda.toString(),
        ytAmountBN: ytAmountBN.toString(),
      });

      let txId: string;

      // Gérer différemment SOL natif et SPL tokens pour le redeem
      if (tokenMint.toString() === "So11111111111111111111111111111111111111112") {
        // Pour SOL natif, créer une transaction avec création du compte wSOL si nécessaire
        console.log('🔄 Handling native SOL redeem with automatic wSOL account creation...');
        
        const transaction = new Transaction();
        
        // 1. Créer le compte wSOL associé si nécessaire
        try {
          await getAccount(connection, userTokenAccount);
          console.log('✅ Compte wSOL existe déjà pour redeem');
        } catch (error) {
          console.log('🔧 Création du compte wSOL pour redeem...');
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey,
              userTokenAccount,
              publicKey,
              strategyTokenMint
            )
          );
        }

        // 2. Ajouter l'instruction de redeem du programme lending
        const redeemInstruction = await lendingProgram.methods
          .redeem(ytAmountBN)
          .accounts({
            user: publicKey,
            userDeposit: userDepositPda,
            strategy: strategyPubkey,
            ytMint: ytMintAddress,
            userTokenAccount: userTokenAccount,
            userUsdcAccount: userTokenAccount, // Same account for SOL
            vaultAccount: vaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction();
        
        transaction.add(redeemInstruction);

        // 3. Envoyer la transaction complète
        if (!sendTransaction) {
          throw new Error('Wallet sendTransaction not available');
        }

        txId = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(txId, 'confirmed');
        
      } else {
        // Pour les SPL tokens, utiliser la méthode normale
        txId = await lendingProgram.methods
          .redeem(ytAmountBN)
          .accounts({
            user: publicKey,
            userDeposit: userDepositPda,
            strategy: strategyPubkey,
            ytMint: ytMintAddress,
            userTokenAccount: userTokenAccount,
            userUsdcAccount: userTokenAccount, // Same account for other tokens
            vaultAccount: vaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
      }

      console.log("✅ Redeem effectué avec succès !", txId);
      return txId;

    } catch (err) {
      console.error('❌ Erreur lors du redeem:', err);
      
      // Log détaillé pour les erreurs de transaction
      if (err && typeof err === 'object' && 'transactionLogs' in err) {
        console.error('📋 Transaction logs:', (err as any).transactionLogs);
        console.error('📋 Transaction message:', (err as any).transactionMessage);
        console.error('📋 Program error stack:', (err as any).programErrorStack);
      }
      
      setError(err instanceof Error ? err.message : 'Failed to redeem');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey, connection, findVaultPDA, getStrategyData]);

  // Fonction pour récupérer le vrai solde YT de l'utilisateur
  const getUserYTBalance = useCallback(async (ytMintAddress: string, userPublicKey: PublicKey) => {
    try {
      const ytMint = new PublicKey(ytMintAddress);
      const userYtAccount = await getAssociatedTokenAddress(ytMint, userPublicKey);
      
      try {
        const ytAccountInfo = await getAccount(connection, userYtAccount);
        const balance = Number(ytAccountInfo.amount) / Math.pow(10, 6); // 6 decimals for YT
        console.log(`💰 Real YT balance for ${ytMintAddress}:`, balance);
        return balance;
      } catch (accountError) {
        console.log(`📭 No YT account found for ${ytMintAddress}`);
        return 0;
      }
    } catch (error) {
      console.error('Error getting YT balance:', error);
      return 0;
    }
  }, [connection]);

  return {
    deposit,
    withdraw,
    redeem,
    loading,
    error,
    getUserYTBalance,
  };
};
