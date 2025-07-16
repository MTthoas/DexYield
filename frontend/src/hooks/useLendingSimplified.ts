import { useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useContracts } from './useContracts';
import { useLending } from './useLending';
import { USDC_MINT, DEFAULT_POOL_OWNER, TOKEN_DECIMALS, DEVNET_CONFIG } from '../lib/constants';

export const useLendingSimplified = () => {
  const { publicKey } = useWallet();
  const contractService = useContracts();
  const { initializeLendingPool: initPool, createStrategy } = useLending();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simplified deposit function using devnet deployed addresses
  const deposit = useCallback(async (
    tokenMint: PublicKey,
    amount: number,
    strategyId: number,
    strategyAddress: string, // Add the actual strategy address
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

      // Use the actual deployed strategy address instead of calculating PDA
      const strategyPDA = new PublicKey(strategyAddress);
      console.log('🎯 Using actual deployed strategy:', strategyPDA.toString());
      
      // Calculate other PDAs manually using the correct program ID
      const { LENDING_PROGRAM_ID } = await import("../lib/constants");
      
      const [poolPDA] = await PublicKey.findProgramAddress(
        [Buffer.from("lending_pool"), poolOwner.toBuffer()],
        LENDING_PROGRAM_ID
      );
      
      const [userDepositPDA] = await PublicKey.findProgramAddress(
        [
          Buffer.from("user_deposit"),
          publicKey.toBuffer(),
          poolPDA.toBuffer(),
          strategyPDA.toBuffer(),
        ],
        LENDING_PROGRAM_ID
      );
      
      const [poolAuthorityPDA] = await PublicKey.findProgramAddress(
        [Buffer.from("authority"), poolOwner.toBuffer()],
        LENDING_PROGRAM_ID
      );
      
      const [ytMintPDA] = await PublicKey.findProgramAddress(
        [Buffer.from("yt_mint"), poolOwner.toBuffer()],
        LENDING_PROGRAM_ID
      );

      // Get associated token accounts
      const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, NATIVE_MINT } = await import("@solana/spl-token");
      
      // Handle SOL native token vs SPL tokens
      const isNativeSOL = tokenMint.equals(NATIVE_MINT);
      console.log('🔍 Is native SOL:', isNativeSOL);
      
      let userTokenAccount;
      if (isNativeSOL) {
        // For native SOL, we need to create a wrapped SOL token account
        userTokenAccount = await getAssociatedTokenAddress(NATIVE_MINT, publicKey);
        console.log('🔧 Using wrapped SOL token account:', userTokenAccount.toString());
      } else {
        userTokenAccount = await getAssociatedTokenAddress(tokenMint, publicKey);
        console.log('🔧 Using SPL token account:', userTokenAccount.toString());
      }
      
      const userYtAccount = await getAssociatedTokenAddress(ytMintPDA, publicKey);
      const vaultAccount = await getAssociatedTokenAddress(tokenMint, poolPDA, true);

      const accounts = {
        poolPDA,
        strategyPDA,
        userDepositPDA,
        poolAuthorityPDA,
        ytMintPDA,
        userTokenAccount,
        userYtAccount,
        vaultAccount,
      };

      console.log('📋 Using deployed accounts:', {
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

      // Skip pool and strategy initialization since they're already deployed
      console.log('✅ Using deployed pool and strategy');

      // Check if user deposit account exists and initialize if needed
      console.log('🔍 Checking if user deposit account exists...');
      try {
        await contractService.getUserDeposit(publicKey, accounts.poolPDA, strategyPDA);
        console.log('✅ User deposit account already exists');
      } catch (error) {
        console.log('❌ User deposit account not found, initializing...');
        try {
          const initTxId = await contractService.initializeUserDeposit(
            publicKey,
            poolOwner,
            strategyPDA
          );
          console.log('✅ User deposit account initialized:', initTxId);
          
          // Wait a moment for the transaction to be confirmed
          console.log('⏳ Waiting for transaction confirmation...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (initError) {
          console.error('❌ Failed to initialize user deposit account:', initError);
          throw new Error('Failed to initialize user deposit account');
        }
      }

      // Check and create token accounts if needed
      console.log('🔍 Checking token accounts...');
      
      if (isNativeSOL) {
        console.log('🔧 Preparing wrapped SOL account...');
        
        try {
          // Check if wrapped SOL account exists
          const wsolAccountInfo = await contractService.getTokenAccountInfo(NATIVE_MINT, publicKey);
          
          if (!wsolAccountInfo.exists) {
            console.log('❌ Wrapped SOL account does not exist, will be created in transaction');
            
            // The wrapped SOL account will be created and funded automatically 
            // when we call the deposit function with the proper instructions
            console.log('✅ Wrapped SOL account will be handled by the contract');
          } else {
            console.log('✅ Wrapped SOL account already exists');
            console.log('💰 Current wrapped SOL balance:', wsolAccountInfo.balance);
            
            // Check if we need to add more SOL to the wrapped account
            const currentBalance = Number(wsolAccountInfo.balance) / 1e9;
            const requiredAmount = amount;
            
            if (currentBalance < requiredAmount) {
              console.log(`💸 Need to add ${requiredAmount - currentBalance} SOL to wrapped account`);
            }
          }
        } catch (error) {
          console.log('⚠️ Could not check wrapped SOL account, will be handled by contract:', error);
        }
      } else {
        try {
          // Check if SPL token account exists
          const tokenAccountInfo = await contractService.getTokenAccountInfo(tokenMint, publicKey);
          
          if (!tokenAccountInfo.exists) {
            console.log('❌ SPL token account does not exist - will be created automatically by contract');
          } else {
            console.log('✅ SPL token account exists');
          }
        } catch (error) {
          console.log('⚠️ Could not check SPL token account, proceeding anyway:', error);
        }
      }

      // YT token account will be created automatically by the deposit function if needed
      console.log('✅ YT token account will be handled automatically');

      // Check and create vault account if needed
      console.log('🔍 Checking vault account...');
      try {
        const vaultAccountInfo = await contractService.getTokenAccountInfo(tokenMint, poolPDA, true);
        
        if (!vaultAccountInfo.exists) {
          console.log('❌ Vault account does not exist, will be created in transaction');
          
          // The vault account will be created automatically by the contract when needed
          console.log('✅ Vault account will be handled by the contract');
        } else {
          console.log('✅ Vault account already exists');
          console.log('💰 Current vault balance:', vaultAccountInfo.balance);
        }
      } catch (error) {
        console.log('⚠️ Could not check vault account, will be handled by contract:', error);
      }

      // Handle wrapped SOL creation if needed
      if (isNativeSOL) {
        console.log('🔧 Preparing wrapped SOL transaction...');
        
        try {
          // Check if wrapped SOL account exists and create/fund it if needed
          const wsolAccountInfo = await contractService.getTokenAccountInfo(NATIVE_MINT, publicKey);
          
          if (!wsolAccountInfo.exists || Number(wsolAccountInfo.balance) < amountBN) {
            console.log('💸 Creating/funding wrapped SOL account...');
            
            // Import necessary functions
            const { Transaction, SystemProgram } = await import('@solana/web3.js');
            const { createAssociatedTokenAccountInstruction, createSyncNativeInstruction } = await import('@solana/spl-token');
            
            // Build the transaction
            const transaction = new Transaction();
            
            // Add create ATA instruction if account doesn't exist
            if (!wsolAccountInfo.exists) {
              const createATAInstruction = createAssociatedTokenAccountInstruction(
                publicKey, // payer
                userTokenAccount, // ata
                publicKey, // owner
                NATIVE_MINT // mint
              );
              transaction.add(createATAInstruction);
              console.log('➕ Added create wrapped SOL account instruction');
            }
            
            // Add transfer SOL to wrapped account instruction
            const transferInstruction = SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: userTokenAccount,
              lamports: Number(amountBN),
            });
            transaction.add(transferInstruction);
            console.log('➕ Added transfer SOL instruction');
            
            // Add sync native instruction to convert SOL to wrapped SOL
            const syncNativeInstruction = createSyncNativeInstruction(userTokenAccount);
            transaction.add(syncNativeInstruction);
            console.log('➕ Added sync native instruction');
            
            // Get connection and wallet
            const provider = contractService.lendingProgram?.provider;
            if (!provider || !provider.connection || !provider.wallet) {
              throw new Error('Provider not available');
            }
            
            // Send and confirm transaction
            console.log('📤 Sending wrapped SOL transaction...');
            transaction.feePayer = publicKey;
            transaction.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
            
            const signedTx = await provider.wallet.signTransaction(transaction);
            const wsolTxId = await provider.connection.sendRawTransaction(signedTx.serialize());
            await provider.connection.confirmTransaction(wsolTxId);
            
            console.log('✅ Wrapped SOL transaction confirmed:', wsolTxId);
            
            // Wait a moment for the next transaction to get a different blockhash
            console.log('⏳ Waiting for next blockhash...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.log('✅ Wrapped SOL account ready');
          }
        } catch (error) {
          console.error('❌ Failed to prepare wrapped SOL:', error);
          throw new Error('Failed to prepare wrapped SOL account');
        }
      }

      // Create vault account if needed
      console.log('🔍 Ensuring vault account exists...');
      try {
        const vaultAccountInfo = await contractService.getTokenAccountInfo(tokenMint, poolPDA, true);
        
        if (!vaultAccountInfo.exists) {
          console.log('💸 Creating vault account...');
          
          // Import necessary functions
          const { Transaction } = await import('@solana/web3.js');
          const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');
          
          // Build the transaction for vault account creation
          const vaultTransaction = new Transaction();
          
          // Add create vault account instruction
          const createVaultInstruction = createAssociatedTokenAccountInstruction(
            publicKey, // payer
            vaultAccount, // ata
            poolPDA, // owner (the pool PDA owns the vault)
            tokenMint // mint
          );
          vaultTransaction.add(createVaultInstruction);
          console.log('➕ Added create vault account instruction');
          
          // Get connection and wallet
          const provider = contractService.lendingProgram?.provider;
          if (!provider || !provider.connection || !provider.wallet) {
            throw new Error('Provider not available');
          }
          
          // Send and confirm transaction
          console.log('📤 Sending vault account creation transaction...');
          vaultTransaction.feePayer = publicKey;
          vaultTransaction.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
          
          const signedVaultTx = await provider.wallet.signTransaction(vaultTransaction);
          const vaultTxId = await provider.connection.sendRawTransaction(signedVaultTx.serialize());
          await provider.connection.confirmTransaction(vaultTxId);
          
          console.log('✅ Vault account creation transaction confirmed:', vaultTxId);
          
          // Wait a moment for the next transaction to get a different blockhash
          console.log('⏳ Waiting for next blockhash...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log('✅ Vault account already exists');
        }
      } catch (error) {
        console.error('❌ Failed to create vault account:', error);
        // Don't throw here, let the contract handle it
        console.log('⚠️ Proceeding with deposit, contract may handle vault creation');
      }

      // Perform the deposit
      console.log('💸 Executing deposit...');
      const txId = await contractService.deposit(
        publicKey,
        poolOwner,
        strategyPDA,
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
    strategyId: number,
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
        strategyId,
        rewardApy,
        name,
        description
      );

      console.log('✅ Strategy initialized! TX:', txId);
      return txId;

    } catch (err) {
      console.error('❌ Strategy initialization failed:', err);
      
      // Log detailed error information
      if (err && typeof err === 'object' && 'transactionLogs' in err) {
        console.error('Transaction logs:', (err as any).transactionLogs);
      }
      if (err && typeof err === 'object' && 'programErrorStack' in err) {
        console.error('Program error stack:', (err as any).programErrorStack);
      }
      
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
    strategyId: number,
    strategyAddress: string,
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
      console.log('Strategy ID:', strategyId);
      console.log('Strategy Address:', strategyAddress);
      console.log('Pool owner:', poolOwner.toString());

      // Validate input parameters
      if (!tokenMint || !strategyAddress) {
        throw new Error('Missing required parameters: tokenMint or strategyAddress');
      }

      if (typeof strategyId !== 'number' || isNaN(strategyId)) {
        throw new Error(`Invalid strategyId: expected number, got ${typeof strategyId}`);
      }

      if (ytAmount <= 0) {
        throw new Error('YT amount must be greater than 0');
      }

      // Use the actual deployed strategy address instead of building accounts
      const strategyPDA = new PublicKey(strategyAddress);
      console.log('🎯 Using actual deployed strategy:', strategyPDA.toString());
      
      // Calculate other PDAs manually using the correct program ID
      const { LENDING_PROGRAM_ID } = await import("../lib/constants");
      
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("lending_pool"), poolOwner.toBuffer()],
        LENDING_PROGRAM_ID
      );
      
      const [userDepositPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_deposit"),
          publicKey.toBuffer(),
          poolPDA.toBuffer(),
          strategyPDA.toBuffer(),
        ],
        LENDING_PROGRAM_ID
      );
      
      const [poolAuthorityPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("authority"), poolOwner.toBuffer()],
        LENDING_PROGRAM_ID
      );
      
      const [ytMintPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("yt_mint"), poolOwner.toBuffer()],
        LENDING_PROGRAM_ID
      );

      // Get associated token accounts
      const { getAssociatedTokenAddress } = await import("@solana/spl-token");
      
      const userTokenAccount = await getAssociatedTokenAddress(tokenMint, publicKey);
      const userYtAccount = await getAssociatedTokenAddress(ytMintPDA, publicKey);
      const vaultAccount = await getAssociatedTokenAddress(tokenMint, poolPDA, true);

      const accounts = {
        poolPDA,
        strategyPDA,
        userDepositPDA,
        poolAuthorityPDA,
        ytMintPDA,
        userTokenAccount,
        userYtAccount,
        vaultAccount,
      };

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

      // Verify contract service is available
      if (!contractService.isInitialized()) {
        throw new Error('Contract service not properly initialized');
      }

      // Appel de la redeem
      console.log('💸 Executing redeem transaction...');
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
      
      // Handle specific error cases
      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        if (err.message.includes('TooEarlyToRedeem') || err.message.includes('Trop tôt pour récupérer')) {
          errorMessage = 'You must wait 7 days after your initial deposit before claiming yield tokens. This helps ensure protocol security and stability.';
        } else if (err.message.includes('InsufficientYieldTokens')) {
          errorMessage = 'Insufficient yield tokens available for redemption.';
        } else if (err.message.includes('PoolInactive')) {
          errorMessage = 'This lending pool is currently inactive.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  // Check if redeem is available based on 7-day minimum duration
  const checkRedeemAvailability = useCallback((depositTime: number) => {
    const MIN_DURATION_DAYS = 7;
    const MIN_DURATION_MS = MIN_DURATION_DAYS * 24 * 60 * 60 * 1000;
    const currentTime = Date.now();
    const depositTimeMs = depositTime * 1000; // Convert from Unix timestamp to milliseconds
    
    const timeElapsed = currentTime - depositTimeMs;
    const isAvailable = timeElapsed >= MIN_DURATION_MS;
    
    if (isAvailable) {
      return {
        available: true,
        timeRemaining: 0,
        availableAt: null,
      };
    }
    
    const timeRemaining = MIN_DURATION_MS - timeElapsed;
    const availableAt = new Date(depositTimeMs + MIN_DURATION_MS);
    
    return {
      available: false,
      timeRemaining,
      availableAt,
    };
  }, []);

  return {
    loading,
    error,
    deposit,
    withdraw,
    redeem,
    initializeStrategy,
    initializeLendingPool,
    checkRedeemAvailability,
  };
};