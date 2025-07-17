import { AnchorProvider, Program, web3, BN } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import {
  PublicKey,
  Connection,
  clusterApiUrl,
  Transaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Buffer } from "buffer";
import { TokenAccountManager } from "./tokenAccounts";
import {
  LENDING_PROGRAM_ID,
  MARKETPLACE_PROGRAM_ID,
  DEVNET_CONFIG,
} from "./constants";
import lendingIdl from "../idl/lending.json";
import marketplaceIdl from "../idl/marketplace.json";

export const getConnection = () => {
  return new Connection(clusterApiUrl("devnet"));
};

export const getProvider = (wallet: any) => {
  try {
    const connection = getConnection();

    if (!wallet || !wallet.publicKey) {
      throw new Error("Wallet not connected or invalid");
    }

    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    return provider;
  } catch (error) {
    console.error("Error creating provider:", error);
    throw error;
  }
};

export const getLendingProgram = (provider: AnchorProvider) => {
  try {
    // Validate provider
    if (!provider) {
      throw new Error("Provider is null or undefined");
    }

    if (!provider.connection) {
      throw new Error("Provider connection is null or undefined");
    }

    if (!provider.wallet) {
      throw new Error("Provider wallet is null or undefined");
    }

    // Validate IDL structure
    if (!lendingIdl) {
      throw new Error("IDL is null or undefined");
    }

    if (typeof lendingIdl !== "object") {
      throw new Error(`IDL is not an object, got: ${typeof lendingIdl}`);
    }

    if (!lendingIdl.address) {
      throw new Error("Invalid IDL structure: missing address");
    }

    if (!lendingIdl.instructions || !Array.isArray(lendingIdl.instructions)) {
      throw new Error("Invalid IDL structure: missing or invalid instructions");
    }

    // Transform IDL to be compatible with Anchor 0.31.1
    // Map account definitions to their types from the types section
    const typeMap = new Map();
    lendingIdl.types?.forEach((type) => {
      typeMap.set(type.name, type.type);
    });

    const compatibleIdl = {
      ...lendingIdl,
      accounts:
        lendingIdl.accounts?.map((account) => ({
          ...account,
          type: typeMap.get(account.name) || {
            kind: "struct",
            fields: [],
          },
        })) || [],
    };

    const program = new Program(compatibleIdl as Idl, provider);
    return program;
  } catch (error) {
    console.error("Error creating lending program:", error);
    throw new Error("Failed to initialize lending program");
  }
};

export const getMarketplaceProgram = (provider: AnchorProvider) => {
  try {
    return new Program(marketplaceIdl as Idl, provider);
  } catch (error) {
    console.error("Error creating marketplace program:", error);
    throw new Error("Failed to initialize marketplace program");
  }
};

// Helper functions for PDA derivation
export const findLendingPoolPDA = (owner: PublicKey | string) => {
  const ownerKey = owner instanceof PublicKey ? owner : new PublicKey(owner);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("lending_pool"), ownerKey.toBuffer()],
    LENDING_PROGRAM_ID
  );
};

export const findUserDepositPDA = (
  user: PublicKey | string,
  pool: PublicKey | string,
  strategy: PublicKey | string
) => {
  const userKey = user instanceof PublicKey ? user : new PublicKey(user);
  const poolKey = pool instanceof PublicKey ? pool : new PublicKey(pool);
  const strategyKey =
    strategy instanceof PublicKey ? strategy : new PublicKey(strategy);
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_deposit"),
      userKey.toBuffer(),
      poolKey.toBuffer(),
      strategyKey.toBuffer(),
    ],
    LENDING_PROGRAM_ID
  );
};

export const findStrategyPDA = (
  tokenAddress: PublicKey | string,
  admin: PublicKey | string,
  strategyId: number
) => {
  if (typeof strategyId !== "number" || isNaN(strategyId)) {
    throw new Error(
      `[findStrategyPDA] strategyId must be a valid number, got: ${strategyId}`
    );
  }
  const tokenKey =
    tokenAddress instanceof PublicKey
      ? tokenAddress
      : new PublicKey(tokenAddress);
  const adminKey = admin instanceof PublicKey ? admin : new PublicKey(admin);
  const strategyIdBuffer = Buffer.allocUnsafe(8);
  strategyIdBuffer.writeBigUInt64LE(BigInt(strategyId), 0);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("strategy"),
      tokenKey.toBuffer(),
      adminKey.toBuffer(),
      strategyIdBuffer,
    ],
    LENDING_PROGRAM_ID
  );
};

export const findPoolAuthorityPDA = (poolOwner: PublicKey | string) => {
  const ownerKey =
    poolOwner instanceof PublicKey ? poolOwner : new PublicKey(poolOwner);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("authority"), ownerKey.toBuffer()],
    LENDING_PROGRAM_ID
  );
};

export const findYtMintPDA = (poolOwner: PublicKey | string) => {
  const ownerKey =
    poolOwner instanceof PublicKey ? poolOwner : new PublicKey(poolOwner);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("yt_mint"), ownerKey.toBuffer()],
    LENDING_PROGRAM_ID
  );
};

export const findListingPDA = (seller: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("listing"), seller.toBuffer()],
    MARKETPLACE_PROGRAM_ID
  );
};

export const findEscrowAuthorityPDA = (seller: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), seller.toBuffer()],
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
      this.lendingProgram = getLendingProgram(provider);
      this.marketplaceProgram = getMarketplaceProgram(provider);

      this.tokenAccountManager = new TokenAccountManager(provider.connection);
    } catch (error) {
      console.error("=== ContractService Constructor ERROR ===");
      console.error("Error initializing ContractService:", error);
      console.error(
        "Error details:",
        error instanceof Error ? error.message : error
      );
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );

      // Set programs to null explicitly
      this.lendingProgram = null;
      this.marketplaceProgram = null;
      this.tokenAccountManager = new TokenAccountManager(provider.connection);
      console.error("=== ContractService Constructor FAILED ===");
    }
  }

  // Check if programs are initialized
  isInitialized(): boolean {
    return this.lendingProgram !== null && this.marketplaceProgram !== null;
  }

  // Lending functions
  async initializeLendingPool(creator: PublicKey, vaultAccount: PublicKey) {
    if (!this.lendingProgram) {
      throw new Error("Lending program not initialized");
    }

    const [poolPDA] = findLendingPoolPDA(creator);
    const [ytMintPDA] = findYtMintPDA(creator);
    const [poolAuthorityPDA] = findPoolAuthorityPDA(creator);

    console.log('🏊 Initializing lending pool with accounts:', {
      creator: creator.toString(),
      pool: poolPDA.toString(),
      vaultAccount: vaultAccount.toString(),
      ytMint: ytMintPDA.toString(),
      poolAuthority: poolAuthorityPDA.toString(),
    });

    return await this.lendingProgram.methods
      .initializeLendingPool()
      .accounts({
        creator,
        pool: poolPDA,
        vaultAccount,
        ytMint: ytMintPDA,
        poolAuthority: poolAuthorityPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }),
      ])
      .signers([])
      .rpc();
  }

  async initializeStrategy(
    creator: PublicKey,
    tokenAddress: PublicKey,
    strategyId: number,
    rewardApy: number,
    name: string,
    description: string
  ) {
    if (!this.lendingProgram) {
      throw new Error("Lending program not initialized");
    }

    const [strategyPDA] = findStrategyPDA(tokenAddress, creator, strategyId);

    return await this.lendingProgram.methods
      .createStrategy(new BN(strategyId), new BN(rewardApy), name, description)
      .accounts({
        admin: creator,
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
      throw new Error("Lending program not initialized");
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
      throw new Error("Lending program not initialized");
    }

    const [poolPDA] = findLendingPoolPDA(poolOwner);
    const [userDepositPDA] = findUserDepositPDA(user, poolPDA, strategy);
    const [poolAuthorityPDA] = findPoolAuthorityPDA(poolOwner);

    // Note: YT token account should be created by the client before calling deposit

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
      throw new Error("Lending program not initialized");
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
    strategyId: number,
    rewardApy: number,
    name: string,
    description: string
  ) {
    if (!this.lendingProgram) {
      throw new Error("Lending program not initialized");
    }

    const [strategyPDA] = findStrategyPDA(tokenAddress, admin, strategyId);

    // Check if createStrategy method exists (Anchor converts snake_case to camelCase)
    if (!this.lendingProgram.methods.createStrategy) {
      throw new Error("createStrategy method not available on lending program");
    }

    console.log("Creating strategy with multiple strategies per token support");

    return await this.lendingProgram.methods
      .createStrategy(new BN(strategyId), new BN(rewardApy), name, description)
      .accounts({
        admin,
        strategy: strategyPDA,
        tokenAddress,
        systemProgram: web3.SystemProgram.programId,
      })
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }),
      ])
      .rpc();
  }

  async toggleStrategyStatus(
    admin: PublicKey,
    tokenAddress: PublicKey,
    strategyId: number
  ) {
    if (!this.lendingProgram) {
      throw new Error("Lending program not initialized");
    }

    // Check if toggleStrategyStatus method exists
    if (!this.lendingProgram.methods.toggleStrategyStatus) {
      throw new Error("toggleStrategyStatus method not available on lending program");
    }

    const [strategyPDA] = findStrategyPDA(tokenAddress, admin, strategyId);

    console.log("Toggling strategy status for:", {
      strategyPDA: strategyPDA.toString(),
      admin: admin.toString(),
      tokenAddress: tokenAddress.toString(),
      strategyId
    });

    return await this.lendingProgram.methods
      .toggleStrategyStatus(new BN(strategyId))
      .accounts({
        admin,
        strategy: strategyPDA,
      })
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }),
      ])
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
    if (!this.lendingProgram) {
      throw new Error("Lending program not initialized");
    }

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
      throw new Error("Marketplace program not initialized");
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
      throw new Error("Marketplace program not initialized");
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
      throw new Error("Marketplace program not initialized");
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
      throw new Error("Lending program not initialized");
    }
    const [poolPDA] = findLendingPoolPDA(poolOwner);
    return await (this.lendingProgram as any).account.pool.fetch(poolPDA);
  }

  async getUserDeposit(user: PublicKey, pool: PublicKey, strategy: PublicKey) {
    if (!this.lendingProgram) {
      throw new Error("Lending program not initialized");
    }
    const [userDepositPDA] = findUserDepositPDA(user, pool, strategy);
    return await (this.lendingProgram as any).account.userDeposit.fetch(
      userDepositPDA
    );
  }

  async getStrategy(
    tokenAddress: PublicKey,
    admin: PublicKey,
    strategyId: number
  ) {
    if (!this.lendingProgram) {
      throw new Error("Lending program not initialized");
    }
    const [strategyPDA] = findStrategyPDA(tokenAddress, admin, strategyId);
    return await (this.lendingProgram as any).account.strategy.fetch(
      strategyPDA
    );
  }

  async getListing(seller: PublicKey) {
    if (!this.marketplaceProgram) {
      throw new Error("Marketplace program not initialized");
    }
    const [listingPDA] = findListingPDA(seller);
    return await (this.marketplaceProgram as any).account.listing.fetch(
      listingPDA
    );
  }

  async getAllListings() {
    if (!this.marketplaceProgram) {
      console.warn("Marketplace program not initialized");
      return [];
    }

    try {
      const listings = await (
        this.marketplaceProgram as any
      ).account.listing.all();
      return listings.filter((listing: any) => listing.account.active);
    } catch (error) {
      console.error("Error fetching listings:", error);
      return [];
    }
  }

  async getAllStrategies() {
    if (!this.lendingProgram) {
      console.warn("Lending program not initialized");
      return [];
    }

    try {
      const strategies = await (
        this.lendingProgram as any
      ).account.strategy.all();
      return strategies;
    } catch (error) {
      console.error("Error fetching strategies:", error);
      return [];
    }
  }

  // Token account management
  async getTokenAccountInfo(mint: PublicKey, owner: PublicKey, allowOwnerOffCurve = false) {
    return await this.tokenAccountManager.getTokenAccountInfo(mint, owner, allowOwnerOffCurve);
  }

  async createTokenAccountInstruction(
    mint: PublicKey,
    owner: PublicKey,
    payer: PublicKey
  ) {
    return await this.tokenAccountManager.getOrCreateTokenAccount(
      mint,
      owner,
      payer
    );
  }

  async createTokenAccount(
    payer: PublicKey,
    mint: PublicKey,
    owner: PublicKey
  ) {
    const { instruction, address } = await this.tokenAccountManager.getOrCreateTokenAccount(
      mint,
      owner,
      payer
    );

    if (instruction) {
      const transaction = new Transaction().add(instruction);
      
      // Add compute budget instruction for better transaction success rate
      const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
        units: 300_000,
      });
      transaction.add(computeBudgetInstruction);

      if (!this.lendingProgram) {
        throw new Error("Lending program not initialized");
      }
      return await this.lendingProgram.provider.sendAndConfirm(transaction);
    }
    
    // Token account already exists
    return null;
  }

  // Helper function to build accounts for lending operations
  async buildLendingAccounts(
    user: PublicKey,
    poolOwner: PublicKey,
    tokenMint: PublicKey,
    admin: PublicKey,
    strategyId: number
  ) {
    const [poolPDA] = findLendingPoolPDA(poolOwner);
    const [strategyPDA] = findStrategyPDA(tokenMint, admin, strategyId);
    const [userDepositPDA] = findUserDepositPDA(user, poolPDA, strategyPDA);
    const [poolAuthorityPDA] = findPoolAuthorityPDA(poolOwner);
    const [ytMintPDA] = findYtMintPDA(poolOwner);

    // Get associated token accounts
    const userTokenAccount = await getAssociatedTokenAddress(tokenMint, user);
    const userYtAccount = await getAssociatedTokenAddress(ytMintPDA, user);
    const vaultAccount = await getAssociatedTokenAddress(
      tokenMint,
      poolPDA,
      true
    );

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

  // Reset user yield data (migration function)
  async resetUserYield(
    user: PublicKey,
    poolOwner: PublicKey,
    strategy: PublicKey
  ) {
    if (!this.lendingProgram) {
      throw new Error("Lending program not initialized");
    }

    const [poolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("lending_pool"), poolOwner.toBuffer()],
      this.lendingProgram.programId
    );
    
    const [userDepositPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_deposit"),
        user.toBuffer(),
        poolPDA.toBuffer(),
        strategy.toBuffer(),
      ],
      this.lendingProgram.programId
    );

    const accounts = {
      user,
      userDeposit: userDepositPDA,
      pool: poolPDA,
      strategy,
    };

    console.log("🔄 Resetting user yield data...");
    console.log("Accounts:", accounts);

    const txId = await (this.lendingProgram as any).methods
      .resetUserYield()
      .accounts(accounts)
      .rpc();

    console.log("✅ User yield reset successful! TX:", txId);
    return txId;
  }
}
