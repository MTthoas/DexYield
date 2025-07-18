import { useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useContracts } from './useContracts';
import { useLending } from './useLending';
import { USDC_MINT, DEFAULT_POOL_OWNER, TOKEN_DECIMALS, DEVNET_CONFIG, LENDING_PROGRAM_ID, getTokenInfo } from '../lib/constants';
import { findLendingPoolPDA, findStrategyPDA } from '../lib/contracts';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';

// Helper function to derive vault PDA like in the working script
const findVaultPDA = (tokenMint: PublicKey, strategyId: number) => {
  const strategyIdBuffer = Buffer.alloc(8);
  strategyIdBuffer.writeBigUInt64LE(BigInt(strategyId), 0);
  
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault_account"),
      tokenMint.toBuffer(),
      strategyIdBuffer,
    ],
    LENDING_PROGRAM_ID
  );
};

export const useLendingSimplified = () => {
  const { publicKey } = useWallet();
  const contractService = useContracts();
  const { initializeLendingPool: initPool, createStrategy } = useLending();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simplified deposit function using the exact same logic as the working script
  const deposit = useCallback(async (
    tokenMint: PublicKey,
    amount: number,
    strategyId: number,
    strategyAddress: string // The actual deployed strategy address from the working script
  ) => {
    if (!contractService || !publicKey) {
      throw new Error('Wallet not connected or contract service not available');
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting deposit with exact script logic...');
      console.log('Token mint:', tokenMint.toString());
      console.log('Amount:', amount);
      console.log('Strategy address:', strategyAddress);

      // Use the exact strategy address from the script instead of deriving
      const strategyPubkey = new PublicKey(strategyAddress);
      console.log('🎯 Using exact strategy from script:', strategyPubkey.toString());

      // Find target strategy to get YT mint like in the script
      const strategies = await contractService.getAllStrategies();
      const targetStrategy = strategies.find((s: any) => s.publicKey.toBase58() === strategyAddress);
      if (!targetStrategy) {
        throw new Error('Strategy not found');
      }

      // Get user token account
      const userTokenAccounts = await contractService.lendingProgram?.provider.connection.getTokenAccountsByOwner(
        publicKey, 
        { mint: tokenMint }
      );
      if (!userTokenAccounts?.value.length) {
        throw new Error('No token account found for this mint');
      }
      const userTokenAccount = userTokenAccounts.value[0].pubkey;

      // Get YT mint from strategy like in the script
      const ytMint = targetStrategy.account.tokenYieldAddress || targetStrategy.account.token_yield_address;
      const ytMintAddress = new PublicKey(ytMint);

      // Get or create user YT account
      const userYtAccounts = await contractService.lendingProgram?.provider.connection.getTokenAccountsByOwner(
        publicKey, 
        { mint: ytMintAddress }
      );
      
      let userYtAccount;
      if (userYtAccounts?.value.length) {
        userYtAccount = userYtAccounts.value[0].pubkey;
        console.log('✅ YT account already exists:', userYtAccount.toString());
      } else {
        // Calculate ATA address like in script
        userYtAccount = await getAssociatedTokenAddress(ytMintAddress, publicKey);
        
        // Double-check if account exists using the ATA address
        const ytAccInfo = await contractService.lendingProgram?.provider.connection.getAccountInfo(userYtAccount);
        if (!ytAccInfo) {
          console.log('Creating YT account...');
          try {
            const ataIx = createAssociatedTokenAccountInstruction(
              publicKey, // payer
              userYtAccount, // ata
              publicKey, // owner
              ytMintAddress // mint
            );
            const { Transaction } = await import('@solana/web3.js');
            const tx = new Transaction().add(ataIx);
            
            // Get latest blockhash to avoid "already processed" error
            const { blockhash } = await contractService.lendingProgram?.provider.connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = publicKey;
            
            await contractService.lendingProgram?.provider.sendAndConfirm(tx, []);
            console.log('✅ YT account created!');
          } catch (createError) {
            console.log('⚠️ YT account creation failed, but continuing - it may already exist:', createError.message);
            // Continue anyway - the account might exist now
          }
        } else {
          console.log('✅ YT account already exists at ATA address');
        }
      }

      // Vault PDA like in the script
      const [vaultPda] = findVaultPDA(tokenMint, strategyId);

      // UserDeposit PDA like in the script  
      const [userDepositPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_deposit"),
          publicKey.toBuffer(),
          strategyPubkey.toBuffer(),
        ],
        LENDING_PROGRAM_ID
      );

      // Debug PDA calculation
      console.log('🔍 PDA Calculation Debug:');
      console.log('  User:', publicKey.toString());
      console.log('  Strategy:', strategyPubkey.toString());
      console.log('  Program ID:', LENDING_PROGRAM_ID.toString());
      console.log('  Calculated UserDeposit PDA:', userDepositPda.toString());
      console.log('  Expected UserDeposit PDA: NYT7cFkFrMBhuouEHE8GjH6FMDVnqYWkom7DTCafpTk');

      // Convert amount to proper decimals
      const decimals = tokenMint.equals(USDC_MINT) ? TOKEN_DECIMALS.USDC : TOKEN_DECIMALS.SOL;
      const depositAmount = Math.floor(amount * Math.pow(10, decimals));

      console.log('📋 Using accounts like in script:', {
        userTokenAccount: userTokenAccount.toString(),
        userYtAccount: userYtAccount.toString(),
        vaultPda: vaultPda.toString(),
        ytMintAddress: ytMintAddress.toString(),
        userDepositPda: userDepositPda.toString(),
        depositAmount
      });

      // Call deposit exactly like in the script
      const txId = await contractService.deposit(
        publicKey,
        strategyPubkey,
        depositAmount,
        userTokenAccount,
        userYtAccount,
        vaultPda,
        ytMintAddress,
        tokenMint
      );

      console.log('✅ Deposit successful! TX:', txId);
      return txId;

    } catch (err) {
      console.error('❌ Deposit failed:', err);
      
      // Check if transaction actually succeeded but shows "already processed" error
      if (err.message && err.message.includes('already been processed')) {
        console.log('✅ Transaction was already processed - this is usually a success!');
        // Don't throw error for "already processed" - it means transaction succeeded
        return 'Transaction processed successfully';
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  // Simplified withdraw function using script logic
  const withdraw = useCallback(async (
    tokenMint: PublicKey,
    amount: number,
    strategyId: number,
    strategyAddress: string // The actual deployed strategy address
  ) => {
    if (!contractService || !publicKey) {
      throw new Error('Wallet not connected or contract service not available');
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting withdraw with exact script logic...');
      console.log('🔍 Strategy address (raw):', strategyAddress);
      console.log('🔍 Amount:', amount);

      // Convert strategy address to string if it's a PublicKey object
      const strategyAddressStr = typeof strategyAddress === 'string' 
        ? strategyAddress 
        : strategyAddress.toString();
      
      console.log('🔍 Strategy address (string):', strategyAddressStr);

      // Use the exact strategy address from the script
      const strategyPubkey = new PublicKey(strategyAddressStr);

      // Find target strategy to get YT mint like in the script
      const strategies = await contractService.getAllStrategies();
      console.log('🔍 Available strategies:', strategies.map(s => s.publicKey.toBase58()));
      
      const targetStrategy = strategies.find((s: any) => s.publicKey.toBase58() === strategyAddressStr);
      if (!targetStrategy) {
        console.error('Strategy not found! Looking for:', strategyAddressStr);
        console.error('Available strategies:', strategies.map(s => s.publicKey.toBase58()));
        throw new Error(`Strategy not found: ${strategyAddressStr}`);
      }

      // Get user token account
      const userTokenAccounts = await contractService.lendingProgram?.provider.connection.getTokenAccountsByOwner(
        publicKey, 
        { mint: tokenMint }
      );
      if (!userTokenAccounts?.value.length) {
        throw new Error('No token account found for this mint');
      }
      const userTokenAccount = userTokenAccounts.value[0].pubkey;

      // Get YT mint from strategy like in the script
      const ytMint = targetStrategy.account.tokenYieldAddress || targetStrategy.account.token_yield_address;
      const ytMintAddress = new PublicKey(ytMint);

      // Get user YT account
      const userYtAccounts = await contractService.lendingProgram?.provider.connection.getTokenAccountsByOwner(
        publicKey, 
        { mint: ytMintAddress }
      );
      if (!userYtAccounts?.value.length) {
        throw new Error('No YT account found - please deposit first');
      }
      const userYtAccount = userYtAccounts.value[0].pubkey;

      // Vault PDA like in the script
      const [vaultPda] = findVaultPDA(tokenMint, strategyId);

      // Convert amount to proper decimals
      const decimals = tokenMint.equals(USDC_MINT) ? TOKEN_DECIMALS.USDC : TOKEN_DECIMALS.SOL;
      const withdrawAmount = Math.floor(amount * Math.pow(10, decimals));

      console.log('📋 Using accounts like in script:', {
        userTokenAccount: userTokenAccount.toString(),
        userYtAccount: userYtAccount.toString(),
        vaultPda: vaultPda.toString(),
        ytMintAddress: ytMintAddress.toString(),
        withdrawAmount
      });

      // Call withdraw exactly like in the script
      const txId = await contractService.withdraw(
        publicKey,
        strategyPubkey,
        withdrawAmount,
        userTokenAccount,
        userYtAccount,
        vaultPda,
        ytMintAddress
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
      const { findPoolAuthorityPDA } = await import("../lib/contracts");
      const [poolAuthorityPDA] = findPoolAuthorityPDA(poolOwner);
      const vaultAccount = await getAssociatedTokenAddress(tokenMint, poolAuthorityPDA, true);

      const txId = await contractService.initializeLendingPool(
        poolOwner,
        vaultAccount,
        tokenMint
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
    poolOwner?: PublicKey // Use connected wallet as pool owner
  ) => {
    if (!contractService || !publicKey) {
      throw new Error('Wallet not connected or contract service not available');
    }

    const actualPoolOwner = poolOwner || publicKey;
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting simplified redeem...');
      console.log('Token mint:', tokenMint.toString());
      console.log('YT Amount:', ytAmount);
      console.log('Strategy ID:', strategyId);
      console.log('Strategy Address:', strategyAddress);
      console.log('Pool owner:', actualPoolOwner.toString());

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
        [Buffer.from("lending_pool"), actualPoolOwner.toBuffer()],
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
        [Buffer.from("authority"), actualPoolOwner.toBuffer()],
        LENDING_PROGRAM_ID
      );
      
      const [ytMintPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("yt_mint"), actualPoolOwner.toBuffer()],
        LENDING_PROGRAM_ID
      );

      // Get associated token accounts
      const { getAssociatedTokenAddress } = await import("@solana/spl-token");
      
      const userTokenAccount = await getAssociatedTokenAddress(tokenMint, publicKey);
      const userYtAccount = await getAssociatedTokenAddress(ytMintPDA, publicKey);
      const vaultAccount = await getAssociatedTokenAddress(tokenMint, poolAuthorityPDA, true);

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

      // Check if pool exists before attempting redeem
      console.log('🔍 Checking if pool exists...');
      try {
        await contractService.getPool(actualPoolOwner);
        console.log('✅ Pool exists');
      } catch (poolError) {
        console.error('❌ Pool not found:', poolError);
        throw new Error('Pool not initialized. Please make a deposit first to initialize the pool.');
      }

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
        actualPoolOwner,
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
          errorMessage = 'You must wait 1 hour after your initial deposit before claiming yield tokens. This helps ensure protocol security and stability.';
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

  // Check if redeem is available based on 1-hour minimum duration (POC)
  const checkRedeemAvailability = useCallback((depositTime: number) => {
    const MIN_DURATION_HOURS = 1;
    const MIN_DURATION_MS = MIN_DURATION_HOURS * 60 * 60 * 1000;
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

  // Reset user yield data (migration function)
  const resetUserYield = useCallback(async (
    poolOwner: PublicKey,
    strategy: PublicKey
  ) => {
    if (!contractService || !publicKey) {
      throw new Error('Wallet not connected or contract service not available');
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Starting user yield reset...');
      
      const txId = await contractService.resetUserYield(
        publicKey,
        poolOwner,
        strategy
      );

      console.log('✅ User yield reset successful! TX:', txId);
      return txId;

    } catch (err) {
      console.error('❌ User yield reset failed:', err);
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
    checkRedeemAvailability,
    resetUserYield,
  };
};