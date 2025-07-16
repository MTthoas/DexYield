const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const {
    TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount,
    createMint,
    mintTo
} = require("@solana/spl-token");

// Import IDL correctly
const lendingIdl = require("../target/idl/lending.json");
const marketplaceIdl = require("../target/idl/marketplace.json");

// Program IDs from your deploy
const LENDING_PROGRAM_ID = new PublicKey("GBhdq8ypCAdTEqPLm4ZQA4mSUjHik7U43FMoou3qwLxo");
const MARKETPLACE_PROGRAM_ID = new PublicKey("Gju2aAZ2WnbEnEgGZK5fzxj2fevfwexYL5d411ZyY7tv");

// Use real devnet USDC mint
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

async function main() {
    console.log("🚀 Starting DexYield Complete Setup...");

    // Setup provider
    const provider = anchor.AnchorProvider.local("https://api.devnet.solana.com");
    anchor.setProvider(provider);

    // Create programs
    console.log("📝 Loading programs...");
    const lending = new anchor.Program(lendingIdl, provider);
    const marketplace = new anchor.Program(marketplaceIdl, provider);

    const payer = provider.wallet.payer;
    console.log("💳 Wallet:", payer.publicKey.toBase58());

    // Airdrop SOL if needed
    console.log("💰 Checking SOL balance...");
    const balance = await provider.connection.getBalance(payer.publicKey);
    if (balance < LAMPORTS_PER_SOL) {
        console.log("💸 Requesting SOL airdrop...");
        const sig = await provider.connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(sig, "confirmed");
        console.log("✅ SOL airdrop received");
    }

    // Calculate PDAs for Lending
    console.log("\n🔍 Calculating Lending PDAs...");
    const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("lending_pool"), payer.publicKey.toBuffer()],
        LENDING_PROGRAM_ID
    );

    const [ytMintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("yt_mint"), payer.publicKey.toBuffer()],
        LENDING_PROGRAM_ID
    );

    const [strategyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("strategy"), USDC_MINT.toBuffer()],
        LENDING_PROGRAM_ID
    );

    const [userDepositPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("user_deposit"),
            payer.publicKey.toBuffer(),
            poolPda.toBuffer(),
            strategyPda.toBuffer(),
        ],
        LENDING_PROGRAM_ID
    );

    const [poolAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("authority"), payer.publicKey.toBuffer()],
        LENDING_PROGRAM_ID
    );

    console.log("📍 Lending PDAs:");
    console.log("  Pool:", poolPda.toBase58());
    console.log("  YT Mint:", ytMintPda.toBase58());
    console.log("  Strategy:", strategyPda.toBase58());
    console.log("  UserDeposit:", userDepositPda.toBase58());
    console.log("  Authority:", poolAuthority.toBase58());

    // Calculate PDAs for Marketplace
    console.log("\n🔍 Calculating Marketplace PDAs...");
    const [marketplaceStrategyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("strategy"), USDC_MINT.toBuffer()],
        MARKETPLACE_PROGRAM_ID
    );

    const [listingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), payer.publicKey.toBuffer()],
        MARKETPLACE_PROGRAM_ID
    );

    const [escrowAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), payer.publicKey.toBuffer()],
        MARKETPLACE_PROGRAM_ID
    );

    console.log("📍 Marketplace PDAs:");
    console.log("  Strategy:", marketplaceStrategyPda.toBase58());
    console.log("  Listing:", listingPda.toBase58());
    console.log("  Escrow Authority:", escrowAuthority.toBase58());

    // 1. Create vault ATA for pool
    console.log("\n🏦 Creating vault ATA...");
    const vaultAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        USDC_MINT,
        poolPda,
        true // allowOwnerOffCurve
    );
    console.log("✅ Vault ATA:", vaultAta.address.toBase58());

    // 2. Initialize Lending Pool
    console.log("\n🔄 Initializing Lending Pool...");
    try {
        await lending.methods
            .initializeLendingPool()
            .accounts({
                creator: payer.publicKey,
                pool: poolPda,
                vaultAccount: vaultAta.address,
                ytMint: ytMintPda,
                poolAuthority: poolAuthority,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
        console.log("✅ Pool initialized");
        console.log("✅ YT Mint created at:", ytMintPda.toBase58());
    } catch (error) {
        if (error.message.includes("already in use")) {
            console.log("⚠️  Pool already exists");
        } else {
            console.error("❌ Pool init failed:", error.message);
            throw error;
        }
    }

    // Verify YT mint was created
    const ytMintInfo = await provider.connection.getAccountInfo(ytMintPda);
    if (ytMintInfo) {
        console.log("✅ YT Mint verified");
    } else {
        console.error("❌ YT Mint not found!");
    }

    // 3. Create Lending Strategy
    console.log("\n📈 Creating Lending Strategy...");
    try {
        await lending.methods
            .createStrategy(
                new anchor.BN(5000), // 5% APY
                "USDC Strategy",
                "Base USDC strategy for DexYield"
            )
            .accounts({
                admin: payer.publicKey,
                strategy: strategyPda,
                tokenAddress: USDC_MINT,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
        console.log("✅ Lending strategy created");
    } catch (error) {
        if (error.message.includes("already in use")) {
            console.log("⚠️  Lending strategy already exists");
        } else {
            console.error("❌ Lending strategy creation failed:", error.message);
            throw error;
        }
    }

    // 4. Initialize UserDeposit
    console.log("\n👤 Initializing User Deposit...");
    try {
        await lending.methods
            .initializeUserDeposit()
            .accounts({
                user: payer.publicKey,
                pool: poolPda,
                userDeposit: userDepositPda,
                strategy: strategyPda,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
        console.log("✅ User deposit initialized");
    } catch (error) {
        if (error.message.includes("already in use")) {
            console.log("⚠️  User deposit already exists");
        } else {
            console.error("❌ User deposit init failed:", error.message);
            throw error;
        }
    }

    // 5. Create Marketplace Strategy
    console.log("\n📈 Creating Marketplace Strategy...");
    try {
        await marketplace.methods
            .createStrategy(
                new anchor.BN(5000), // 5% APY
            )
            .accounts({
                admin: payer.publicKey,
                strategy: marketplaceStrategyPda,
                tokenAddress: USDC_MINT,
                systemProgram: SystemProgram.programId,
            })
            .rpc();
        console.log("✅ Marketplace strategy created");
    } catch (error) {
        if (error.message.includes("already in use")) {
            console.log("⚠️  Marketplace strategy already exists");
        } else {
            console.error("❌ Marketplace strategy creation failed:", error.message);
            throw error;
        }
    }

    // 6. Create user USDC ATA
    console.log("\n💵 Creating user USDC ATA...");
    const userUsdcAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        USDC_MINT,
        payer.publicKey
    );
    console.log("✅ User USDC ATA:", userUsdcAta.address.toBase58());

    // 7. Create user YT ATA
    console.log("\n🪙 Creating user YT ATA...");
    const userYtAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        ytMintPda,
        payer.publicKey
    );
    console.log("✅ User YT ATA:", userYtAta.address.toBase58());

    // 8. Create escrow ATA for marketplace
    console.log("\n🔐 Creating escrow YT ATA...");
    const escrowYtAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        ytMintPda,
        escrowAuthority,
        true // allowOwnerOffCurve
    );
    console.log("✅ Escrow YT ATA:", escrowYtAta.address.toBase58());

    // 9. Verify all accounts
    console.log("\n🔍 Verifying deployed accounts...");
    
    try {
        const poolAccount = await lending.account.pool.fetch(poolPda);
        console.log("✅ Pool verified:", {
            owner: poolAccount.owner.toBase58(),
            ytMint: poolAccount.ytMint.toBase58(),
            active: poolAccount.active
        });
    } catch (error) {
        console.error("❌ Could not fetch pool account");
    }

    try {
        const strategyAccount = await lending.account.strategy.fetch(strategyPda);
        console.log("✅ Lending Strategy verified:", {
            tokenAddress: strategyAccount.tokenAddress.toBase58(),
            rewardApy: strategyAccount.rewardApy.toString(),
            active: strategyAccount.active
        });
    } catch (error) {
        console.error("❌ Could not fetch lending strategy account");
    }

    try {
        const marketplaceStrategyAccount = await marketplace.account.strategy.fetch(marketplaceStrategyPda);
        console.log("✅ Marketplace Strategy verified:", {
            tokenAddress: marketplaceStrategyAccount.tokenAddress.toBase58(),
            rewardApy: marketplaceStrategyAccount.rewardApy.toString(),
        });
    } catch (error) {
        console.error("❌ Could not fetch marketplace strategy account");
    }

    // 10. Check USDC balance
    try {
        const usdcBalance = await provider.connection.getTokenAccountBalance(userUsdcAta.address);
        console.log("💰 Current USDC balance:", usdcBalance.value.uiAmount || 0, "USDC");
    } catch (error) {
        console.log("⚠️  Could not check USDC balance");
    }

    console.log("\n🎉 Complete setup finished!");
    console.log("\n📋 Summary:");
    console.log("  ✅ Lending Pool initialized");
    console.log("  ✅ YT Mint created");
    console.log("  ✅ Lending Strategy created");
    console.log("  ✅ Marketplace Strategy created");
    console.log("  ✅ User Deposit initialized");
    console.log("  ✅ All ATAs created");
    console.log("\n🔄 Next steps:");
    console.log("  1. Get USDC from faucet: https://faucet.solana.com/");
    console.log("  2. Run deposit test: node scripts/test-deposit.js");
    console.log("  3. Run marketplace test: node scripts/test-marketplace.js");
    
    // Export important addresses for other scripts
    const config = {
        wallet: payer.publicKey.toBase58(),
        lending: {
            programId: LENDING_PROGRAM_ID.toBase58(),
            pool: poolPda.toBase58(),
            ytMint: ytMintPda.toBase58(),
            strategy: strategyPda.toBase58(),
            userDeposit: userDepositPda.toBase58(),
            vaultAta: vaultAta.address.toBase58(),
            authority: poolAuthority.toBase58()
        },
        marketplace: {
            programId: MARKETPLACE_PROGRAM_ID.toBase58(),
            strategy: marketplaceStrategyPda.toBase58(),
            listing: listingPda.toBase58(),
            escrowAuthority: escrowAuthority.toBase58(),
            escrowYtAta: escrowYtAta.address.toBase58()
        },
        tokens: {
            usdcMint: USDC_MINT.toBase58(),
            userUsdcAta: userUsdcAta.address.toBase58(),
            userYtAta: userYtAta.address.toBase58()
        }
    };

    console.log("\n📄 Configuration saved:");
    console.log(JSON.stringify(config, null, 2));

    // Optionally save to file
    const fs = require('fs');
    fs.writeFileSync('dexyield-config.json', JSON.stringify(config, null, 2));
    console.log("\n💾 Config saved to dexyield-config.json");
}

main().catch(error => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
});