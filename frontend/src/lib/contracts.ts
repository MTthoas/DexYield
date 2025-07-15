import { AnchorProvider, Program, web3, BN } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';
import { PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Buffer } from 'buffer';
import { TokenAccountManager } from './tokenAccounts';
import { LENDING_PROGRAM_ID, MARKETPLACE_PROGRAM_ID } from './constants';
import lendingIdl from '../idl/lending.json';
import marketplaceIdl from '../idl/marketplace.json';

// Validate IDL structure
console.log('Lending IDL loaded:', lendingIdl);
console.log('Lending IDL address:', lendingIdl.address);
console.log('Lending IDL instructions:', lendingIdl.instructions?.length || 0);


export const getConnection = () => {
  return new Connection(clusterApiUrl('devnet'));
};

export const getProvider = (wallet: any) => {
  try {
    console.log('Creating provider with wallet:', wallet);
    const connection = getConnection();
    console.log('Connection created:', connection);
    
    if (!wallet || !wallet.publicKey) {
      throw new Error('Wallet not connected or invalid');
    }
    
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    console.log('Provider created successfully:', provider);
    return provider;
  } catch (error) {
    console.error('Error creating provider:', error);
    throw error;
  }
};

export const getLendingProgram = (provider: AnchorProvider) => {
  try {
    console.log('=== getLendingProgram START ===');
    console.log('Provider type:', typeof provider);
    console.log('Provider wallet:', provider?.wallet);
    console.log('Provider connection:', provider?.connection);
    console.log('Raw IDL:', lendingIdl);
    console.log('IDL type:', typeof lendingIdl);
    console.log('Program ID:', LENDING_PROGRAM_ID.toString());
    
    // Validate provider
    if (!provider) {
      throw new Error('Provider is null or undefined');
    }
    
    if (!provider.connection) {
      throw new Error('Provider connection is null or undefined');
    }
    
    if (!provider.wallet) {
      throw new Error('Provider wallet is null or undefined');
    }
    
    // Validate IDL structure
    if (!lendingIdl) {
      throw new Error('IDL is null or undefined');
    }
    
    if (typeof lendingIdl !== 'object') {
      throw new Error(`IDL is not an object, got: ${typeof lendingIdl}`);
    }
    
    if (!lendingIdl.address) {
      throw new Error('Invalid IDL structure: missing address');
    }
    
    if (!lendingIdl.instructions || !Array.isArray(lendingIdl.instructions)) {
      throw new Error('Invalid IDL structure: missing or invalid instructions');
    }
    
    console.log('All validations passed, creating Program...');
    
    // Transform IDL to be compatible with Anchor 0.31.1
    // Map account definitions to their types from the types section
    const typeMap = new Map();
    lendingIdl.types?.forEach(type => {
      typeMap.set(type.name, type.type);
    });
    
    const compatibleIdl = {
      ...lendingIdl,
      accounts: lendingIdl.accounts?.map(account => ({
        ...account,
        type: typeMap.get(account.name) || {
          kind: 'struct',
          fields: []
        }
      })) || []
    };
    
    console.log('Type map contents:', Object.fromEntries(typeMap));
    console.log('Compatible IDL accounts:', compatibleIdl.accounts);
    console.log('Compatible IDL structure:', {
      address: compatibleIdl.address,
      instructions: compatibleIdl.instructions?.length,
      accounts: compatibleIdl.accounts?.length,
      types: compatibleIdl.types?.length
    });
    
    // Try to create the program with the transformed IDL
    console.log('About to create Program with:', {
      idl: compatibleIdl,
      programId: LENDING_PROGRAM_ID.toString(),
      provider: provider
    });
    
    const program = new Program(compatibleIdl as Idl, provider);
    console.log('Program created successfully:', program);
    console.log('Program type:', typeof program);
    console.log('Program methods exists:', !!program.methods);
    console.log('Program methods:', Object.keys(program.methods || {}));
    console.log('Program account exists:', !!program.account);
    console.log('Program rpc exists:', !!program.rpc);
    console.log('=== getLendingProgram SUCCESS ===');
    return program;
  } catch (error) {
    console.error('=== getLendingProgram ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('=== END ERROR ===');
    throw new Error(`Failed to initialize lending program: ${error instanceof Error ? error.message : error}`);
  }
};

export const getMarketplaceProgram = (provider: AnchorProvider) => {
  try {
    return new Program(marketplaceIdl as Idl, provider);
  } catch (error) {
    console.error('Error creating marketplace program:', error);
    throw new Error('Failed to initialize marketplace program');
  }
};

// Helper functions for PDA derivation
export const findLendingPoolPDA = (owner: PublicKey | string) => {
  const ownerKey = owner instanceof PublicKey ? owner : new PublicKey(owner);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('lending_pool'), ownerKey.toBuffer()],
    LENDING_PROGRAM_ID
  );
};

export const findUserDepositPDA = (user: PublicKey | string, pool: PublicKey | string, strategy: PublicKey | string) => {
  const userKey = user instanceof PublicKey ? user : new PublicKey(user);
  const poolKey = pool instanceof PublicKey ? pool : new PublicKey(pool);
  const strategyKey = strategy instanceof PublicKey ? strategy : new PublicKey(strategy);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user_deposit'), userKey.toBuffer(), poolKey.toBuffer(), strategyKey.toBuffer()],
    LENDING_PROGRAM_ID
  );
};

export const findStrategyPDA = (tokenAddress: PublicKey | string) => {
  const tokenKey = tokenAddress instanceof PublicKey ? tokenAddress : new PublicKey(tokenAddress);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('strategy'), tokenKey.toBuffer()],
    LENDING_PROGRAM_ID
  );
};

export const findPoolAuthorityPDA = (poolOwner: PublicKey | string) => {
  const ownerKey = poolOwner instanceof PublicKey ? poolOwner : new PublicKey(poolOwner);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('authority'), ownerKey.toBuffer()],
    LENDING_PROGRAM_ID
  );
};

export const findYtMintPDA = (poolOwner: PublicKey | string) => {
  const ownerKey = poolOwner instanceof PublicKey ? poolOwner : new PublicKey(poolOwner);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('yt_mint'), ownerKey.toBuffer()],
    LENDING_PROGRAM_ID
  );
};

export const findListingPDA = (seller: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('listing'), seller.toBuffer()],
    MARKETPLACE_PROGRAM_ID
  );
};

export const findEscrowAuthorityPDA = (seller: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('escrow'), seller.toBuffer()],
    MARKETPLACE_PROGRAM_ID
  );
};

// Contract interaction functions
export class ContractService {
  private lendingProgram: Program | null = null;
  private marketplaceProgram: Program | null = null;
  private tokenAccountManager: TokenAccountManager;
  
  constructor(provider: AnchorProvider) {
    try {
      console.log('=== ContractService Constructor START ===');
      console.log('Initializing ContractService with provider:', provider);
      
      console.log('Calling getLendingProgram...');
      this.lendingProgram = getLendingProgram(provider);
      console.log('getLendingProgram returned:', this.lendingProgram);
      console.log('Lending program type:', typeof this.lendingProgram);
      console.log('Lending program methods exists:', !!this.lendingProgram?.methods);
      
      console.log('Calling getMarketplaceProgram...');
      this.marketplaceProgram = getMarketplaceProgram(provider);
      console.log('Marketplace program initialized successfully');
      
      this.tokenAccountManager = new TokenAccountManager(provider.connection);
      console.log('=== ContractService Constructor SUCCESS ===');
    } catch (error) {
      console.error('=== ContractService Constructor ERROR ===');
      console.error('Error initializing ContractService:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Set programs to null explicitly
      this.lendingProgram = null;
      this.marketplaceProgram = null;
      this.tokenAccountManager = new TokenAccountManager(provider.connection);
      console.error('=== ContractService Constructor FAILED ===');
    }
  }

  // Check if programs are initialized
  isInitialized(): boolean {
    return this.lendingProgram !== null && this.marketplaceProgram !== null;
  }

  // Lending functions
  async initializeLendingPool(creator: PublicKey, vaultAccount: PublicKey) {
    if (!this.lendingProgram) {
      throw new Error('Lending program not initialized');
    }
    
    const [poolPDA] = findLendingPoolPDA(creator);
    
    return await this.lendingProgram.methods
      .initializeLendingPool()
      .accounts({
        creator,
        pool: poolPDA,
        vaultAccount,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();
  }

  async initializeStrategy(
    creator: PublicKey,
    tokenAddress: PublicKey,
    rewardApy: number,
    name: string,
    description: string
  ) {
    if (!this.lendingProgram) {
      throw new Error('Lending program not initialized');
    }
    
    const [strategyPDA] = findStrategyPDA(tokenAddress);
    
    return await this.lendingProgram.methods
      .initializeStrategy(rewardApy, name, description)
      .accounts({
        creator,
        strategy: strategyPDA,
        tokenAddress,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();
  }

  async initializeUserDeposit(
    user: PublicKey,
    poolOwner: PublicKey,
    strategy: PublicKey
  ) {
    if (!this.lendingProgram) {
      throw new Error('Lending program not initialized');
    }
    
    const [poolPDA] = findLendingPoolPDA(poolOwner);
    const [userDepositPDA] = findUserDepositPDA(user, poolPDA, strategy);
    
    return await this.lendingProgram.methods
      .initializeUserDeposit()
      .accounts({
        user,
        pool: poolPDA,
        userDeposit: userDepositPDA,
        strategy,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();
  }

  async deposit(
    user: PublicKey,
    poolOwner: PublicKey,
    strategy: PublicKey,
    amount: number,
    userTokenAccount: PublicKey,
    userYtAccount: PublicKey,
    vaultAccount: PublicKey,
    ytMint: PublicKey
  ) {
    if (!this.lendingProgram) {
      throw new Error('Lending program not initialized');
    }
    
    const [poolPDA] = findLendingPoolPDA(poolOwner);
    const [userDepositPDA] = findUserDepositPDA(user, poolPDA, strategy);
    const [poolAuthorityPDA] = findPoolAuthorityPDA(poolOwner);
    
    return await this.lendingProgram.methods
      .deposit(new BN(amount))
      .accounts({
        user,
        pool: poolPDA,
        userDeposit: userDepositPDA,
        strategy,
        userTokenAccount,
        userYtAccount,
        vaultAccount,
        ytMint,
        poolAuthority: poolAuthorityPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  async withdraw(
    user: PublicKey,
    poolOwner: PublicKey,
    strategy: PublicKey,
    amount: number,
    userTokenAccount: PublicKey,
    userYtAccount: PublicKey,
    vaultAccount: PublicKey,
    ytMint: PublicKey
  ) {
    if (!this.lendingProgram) {
      throw new Error('Lending program not initialized');
    }
    
    const [poolPDA] = findLendingPoolPDA(poolOwner);
    const [userDepositPDA] = findUserDepositPDA(user, poolPDA, strategy);
    const [poolAuthorityPDA] = findPoolAuthorityPDA(poolOwner);
    
    return await this.lendingProgram.methods
      .withdraw(new BN(amount))
      .accounts({
        user,
        pool: poolPDA,
        userDeposit: userDepositPDA,
        strategy,
        userTokenAccount,
        userYtAccount,
        vaultAccount,
        ytMint,
        poolAuthority: poolAuthorityPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  async createStrategy(
    admin: PublicKey,
    tokenAddress: PublicKey,
    rewardApy: number,
    name: string,
    description: string
  ) {
    console.log('=== createStrategy START ===');
    console.log('Lending program:', this.lendingProgram);
    console.log('Lending program type:', typeof this.lendingProgram);
    console.log('Lending program methods:', this.lendingProgram?.methods);
    
    if (!this.lendingProgram) {
      throw new Error('Lending program not initialized');
    }
    
    const [strategyPDA] = findStrategyPDA(tokenAddress);
    console.log('Strategy PDA:', strategyPDA.toString());
    
    return await this.lendingProgram.methods
      .createStrategy(new BN(rewardApy), name, description)
      .accounts({
        admin,
        strategy: strategyPDA,
        tokenAddress,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();
  }

  async redeem(
    user: PublicKey,
    poolOwner: PublicKey,
    strategy: PublicKey,
    ytAmount: number,
    ytMint: PublicKey,
    userTokenAccount: PublicKey,
    userUsdcAccount: PublicKey,
    vaultAccount: PublicKey
  ) {
    const [poolPDA] = findLendingPoolPDA(poolOwner);
    const [userDepositPDA] = findUserDepositPDA(user, poolPDA, strategy);
    const [poolAuthorityPDA] = findPoolAuthorityPDA(poolOwner);
    
    return await this.lendingProgram.methods
      .redeem(new BN(ytAmount))
      .accounts({
        user,
        pool: poolPDA,
        userDeposit: userDepositPDA,
        strategy,
        ytMint,
        userTokenAccount,
        userUsdcAccount,
        vaultAccount,
        poolAuthority: poolAuthorityPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  // Marketplace functions
  async listYT(
    seller: PublicKey,
    ytTokenAccount: PublicKey,
    escrowAccount: PublicKey,
    price: number,
    amount: number
  ) {
    if (!this.marketplaceProgram) {
      throw new Error('Marketplace program not initialized');
    }
    
    const [listingPDA] = findListingPDA(seller);
    
    return await this.marketplaceProgram.methods
      .listYt(new BN(price), new BN(amount))
      .accounts({
        seller,
        ytTokenAccount,
        listing: listingPDA,
        escrowAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();
  }

  async buyYT(
    buyer: PublicKey,
    seller: PublicKey,
    buyerTokenAccount: PublicKey,
    buyerYtAccount: PublicKey,
    sellerTokenAccount: PublicKey,
    escrowAccount: PublicKey,
    pool: PublicKey,
    ytMint: PublicKey
  ) {
    if (!this.marketplaceProgram) {
      throw new Error('Marketplace program not initialized');
    }
    
    const [listingPDA] = findListingPDA(seller);
    const [escrowAuthorityPDA] = findEscrowAuthorityPDA(seller);
    const [poolAuthorityPDA] = findPoolAuthorityPDA(pool);
    
    return await this.marketplaceProgram.methods
      .buyYt()
      .accounts({
        buyer,
        buyerTokenAccount,
        buyerYtAccount,
        sellerTokenAccount,
        listing: listingPDA,
        escrowAccount,
        escrowAuthority: escrowAuthorityPDA,
        pool,
        ytMint,
        poolAuthority: poolAuthorityPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        lendingProgram: LENDING_PROGRAM_ID,
      })
      .rpc();
  }

  async cancelListing(
    seller: PublicKey,
    escrowAccount: PublicKey,
    sellerTokenAccount: PublicKey
  ) {
    if (!this.marketplaceProgram) {
      throw new Error('Marketplace program not initialized');
    }
    
    const [listingPDA] = findListingPDA(seller);
    const [escrowAuthorityPDA] = findEscrowAuthorityPDA(seller);
    
    return await this.marketplaceProgram.methods
      .cancelListing()
      .accounts({
        seller,
        listing: listingPDA,
        escrowAccount,
        sellerTokenAccount,
        escrowAuthority: escrowAuthorityPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  // Account fetching functions
  async getPool(poolOwner: PublicKey) {
    if (!this.lendingProgram) {
      throw new Error('Lending program not initialized');
    }
    const [poolPDA] = findLendingPoolPDA(poolOwner);
    return await (this.lendingProgram as any).account.pool.fetch(poolPDA);
  }

  async getUserDeposit(user: PublicKey, pool: PublicKey, strategy: PublicKey) {
    if (!this.lendingProgram) {
      throw new Error('Lending program not initialized');
    }
    const [userDepositPDA] = findUserDepositPDA(user, pool, strategy);
    return await (this.lendingProgram as any).account.userDeposit.fetch(userDepositPDA);
  }

  async getStrategy(tokenAddress: PublicKey) {
    if (!this.lendingProgram) {
      throw new Error('Lending program not initialized');
    }
    const [strategyPDA] = findStrategyPDA(tokenAddress);
    return await (this.lendingProgram as any).account.strategy.fetch(strategyPDA);
  }

  async getListing(seller: PublicKey) {
    if (!this.marketplaceProgram) {
      throw new Error('Marketplace program not initialized');
    }
    const [listingPDA] = findListingPDA(seller);
    return await (this.marketplaceProgram as any).account.listing.fetch(listingPDA);
  }

  async getAllListings() {
    if (!this.marketplaceProgram) {
      console.warn('Marketplace program not initialized');
      return [];
    }
    
    try {
      const listings = await (this.marketplaceProgram as any).account.listing.all();
      console.log('Listings from blockchain:', listings);
      return listings.filter((listing: any) => listing.account.active);
    } catch (error) {
      console.error('Error fetching listings:', error);
      return [];
    }
  }

  async getAllStrategies() {
    if (!this.lendingProgram) {
      console.warn('Lending program not initialized');
      return [];
    }
    
    try {
      const strategies = await (this.lendingProgram as any).account.strategy.all();
      console.log('Strategies from blockchain:', strategies);
      return strategies;
    } catch (error) {
      console.error('Error fetching strategies:', error);
      return [];
    }
  }

  // Token account management
  async getTokenAccountInfo(mint: PublicKey, owner: PublicKey) {
    return await this.tokenAccountManager.getTokenAccountInfo(mint, owner);
  }

  async createTokenAccountInstruction(mint: PublicKey, owner: PublicKey, payer: PublicKey) {
    return await this.tokenAccountManager.getOrCreateTokenAccount(mint, owner, payer);
  }

  // Helper function to build accounts for lending operations
  async buildLendingAccounts(
    user: PublicKey,
    poolOwner: PublicKey,
    tokenMint: PublicKey
  ) {
    const [poolPDA] = findLendingPoolPDA(poolOwner);
    const [strategyPDA] = findStrategyPDA(tokenMint);
    const [userDepositPDA] = findUserDepositPDA(user, poolPDA, strategyPDA);
    const [poolAuthorityPDA] = findPoolAuthorityPDA(poolOwner);
    const [ytMintPDA] = findYtMintPDA(poolOwner);
    
    // Get associated token accounts
    const userTokenAccount = await getAssociatedTokenAddress(tokenMint, user);
    const userYtAccount = await getAssociatedTokenAddress(ytMintPDA, user);
    const vaultAccount = await getAssociatedTokenAddress(tokenMint, poolPDA, true);
    
    return {
      poolPDA,
      strategyPDA,
      userDepositPDA,
      poolAuthorityPDA,
      ytMintPDA,
      userTokenAccount,
      userYtAccount,
      vaultAccount,
    };
  }
}