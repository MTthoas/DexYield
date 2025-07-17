const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Keypair } = require("@solana/web3.js");
const {
    TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount,
    createMint,
    mintTo
} = require("@solana/spl-token");
const fs = require("fs");

// Import IDL correctly
const lendingIdl = require("../target/idl/lending.json");
const marketplaceIdl = require("../target/idl/marketplace.json");

// New Program IDs
const LENDING_PROGRAM_ID = new PublicKey("B7eNrb1uJR9risFgqTQhnxKQt18itfVdoz4XYufEAEX8");
const MARKETPLACE_PROGRAM_ID = new PublicKey("9B1oveu4aVQjxboVRa4FYB9iqtbBoQhHy9FNrKNzSM8c");

// Use real devnet USDC mint
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

async function main() {
    console.log("🚀 Starting DexYield Complete Setup...");

    // Load keypair from file
    const keypairPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/new-id.json`;
    const keypairData = JSON.parse(fs.readFileSync(keypairPath));
    const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

    // Setup provider with the loaded keypair
    const provider = new anchor.AnchorProvider(
        new anchor.web3.Connection("https://api.devnet.solana.com"),
        new anchor.Wallet(payer),
        { commitment: "confirmed" }
    );
    anchor.setProvider(provider);

    // Create programs
    console.log("📝 Loading programs...");
    const lending = new anchor.Program(lendingIdl, provider);
    const marketplace = new anchor.Program(marketplaceIdl, provider);

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

    // Strategy ID for the demo
    const STRATEGY_ID = new anchor.BN(1);

    // Calculate PDAs for Lending
    console.log("\n🔍 Calculating Lending PDAs...");
    const [strategyPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("strategy"), 
            USDC_MINT.toBuffer(), 
            payer.publicKey.toBuffer(), 
            STRATEGY_ID.toArrayLike(Buffer, 'le', 8)
        ],
        LENDING_PROGRAM_ID
    );

    const [userDepositPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("user_deposit"),
            payer.publicKey.toBuffer(),
            strategyPda.toBuffer(),
        ],
        LENDING_PROGRAM_ID
    );

    const [vaultAccountPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("vault_account"),
            USDC_MINT.toBuffer(),
            STRATEGY_ID.toArrayLike(Buffer, 'le', 8)
        ],
        LENDING_PROGRAM_ID
    );

    const [ytMintPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("yt_mint"),
            USDC_MINT.toBuffer(),
            payer.publicKey.toBuffer(),
            STRATEGY_ID.toArrayLike(Buffer, 'le', 8)
        ],
        LENDING_PROGRAM_ID
    );

    console.log("📍 Lending PDAs:");
    console.log("  Strategy:", strategyPda.toBase58());
    console.log("  UserDeposit:", userDepositPda.toBase58());
    console.log("  Vault Account:", vaultAccountPda.toBase58());
    console.log("  YT Mint:", ytMintPda.toBase58());

    // Calculate PDAs for Marketplace
    console.log("\n🔍 Calculating Marketplace PDAs...");
    const [listingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), payer.publicKey.toBuffer()],
        MARKETPLACE_PROGRAM_ID
    );

    const [escrowAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), payer.publicKey.toBuffer()],
        MARKETPLACE_PROGRAM_ID
    );

    console.log("📍 Marketplace PDAs:");
    console.log("  Listing:", listingPda.toBase58());
    console.log("  Escrow Authority:", escrowAuthority.toBase58());

    // 1. Generate YT Mint keypair (will be created by create_strategy instruction)
    console.log("\n🪙 Generating YT Mint keypair...");
    
    // Use a unique timestamp to ensure no conflicts
    const timestamp = Date.now();
    const mintSeed = `yt-${STRATEGY_ID.toString()}-${timestamp}`;
    const mintKeypairSeed = anchor.utils.bytes.utf8.encode(mintSeed);
    
    // Hash the seed to ensure exactly 32 bytes
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(mintKeypairSeed).digest();
    
    const ytMintKeypair = Keypair.fromSeed(hash);
    const ytMintAccount = ytMintKeypair.publicKey;
    
    console.log("✅ YT Mint keypair generated:", ytMintAccount.toBase58());

    // 2. Create Lending Strategy
    console.log("\n📈 Creating Lending Strategy...");
    try {
        await lending.methods
            .createStrategy(
                STRATEGY_ID,
                USDC_MINT,
                new anchor.BN(5000) // 5% APY
            )
            .accounts({
                admin: payer.publicKey,
                strategy: strategyPda,
                tokenYieldAddress: ytMintAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([ytMintKeypair])
            .rpc();
        console.log("✅ Lending strategy created");
    } catch (error) {
        if (error.message.includes("already in use") || error.message.includes("0x0")) {
            console.log("⚠️  Lending strategy already exists");
        } else {
            console.error("❌ Lending strategy creation failed:", error.message);
            // Don't throw if the strategy account already exists, continue with the setup
            console.log("Continuing with existing accounts...");
        }
    }

    // Verify strategy exists and get the actual YT mint address
    console.log("\n🔍 Verifying strategy account...");
    let actualYtMint = ytMintAccount;
    try {
        const strategyAccount = await lending.account.strategy.fetch(strategyPda);
        actualYtMint = strategyAccount.tokenYieldAddress;
        console.log("✅ Strategy account verified:", {
            strategyId: strategyAccount.strategyId.toString(),
            tokenAddress: strategyAccount.tokenAddress.toBase58(),
            ytMint: actualYtMint.toBase58(),
            active: strategyAccount.active
        });
    } catch (error) {
        console.error("❌ Strategy account not found:", error.message);
        throw error;
    }

    // 3. Initialize UserDeposit
    console.log("\n👤 Initializing User Deposit...");
    try {
        await lending.methods
            .initializeUserDeposit()
            .accounts({
                user: payer.publicKey,
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

    // 4. Create user USDC ATA
    console.log("\n💵 Creating user USDC ATA...");
    const userUsdcAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        USDC_MINT,
        payer.publicKey
    );
    console.log("✅ User USDC ATA:", userUsdcAta.address.toBase58());

    // 5. Create user YT ATA
    console.log("\n🪙 Creating user YT ATA...");
    let userYtAta;
    try {
        userYtAta = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            payer,
            actualYtMint,
            payer.publicKey
        );
        console.log("✅ User YT ATA:", userYtAta.address.toBase58());
    } catch (ytAtaError) {
        console.error("❌ Failed to create user YT ATA:", ytAtaError.message);
        console.log("YT Mint address:", actualYtMint.toBase58());
        throw ytAtaError;
    }

    // 6. Check USDC balance and perform deposit if available
    console.log("\n💰 Checking USDC balance for deposit...");
    try {
        let availableBalance = 0;
        try {
            const usdcBalance = await provider.connection.getTokenAccountBalance(userUsdcAta.address);
            availableBalance = usdcBalance.value.uiAmount || 0;
        } catch (balanceError) {
            console.log("⚠️  USDC account exists but has no balance or is not initialized");
            availableBalance = 0;
        }
        console.log("💰 Current USDC balance:", availableBalance, "USDC");

        if (availableBalance >= 1) {
            console.log("\n💳 Making deposit...");
            const depositAmount = new anchor.BN(1_000_000); // 1 USDC with 6 decimals
            
            try {
                await lending.methods
                    .deposit(depositAmount)
                    .accounts({
                        user: payer.publicKey,
                        userDeposit: userDepositPda,
                        strategy: strategyPda,
                        userTokenAccount: userUsdcAta.address,
                        userYtAccount: userYtAta.address,
                        tokenMint: USDC_MINT,
                        vaultAccount: vaultAccountPda,
                        ytMint: actualYtMint,
                        tokenProgram: TOKEN_PROGRAM_ID,
                        systemProgram: SystemProgram.programId,
                    })
                    .rpc();
                console.log("✅ Deposit successful! 1 USDC deposited");
            } catch (error) {
                console.error("❌ Deposit failed:", error.message);
            }
        } else {
            console.log("⚠️  Insufficient USDC balance for deposit. Get USDC from faucet first.");
        }
    } catch (error) {
        console.log("⚠️  Could not check USDC balance");
    }

    // 7. Create escrow ATA for marketplace
    console.log("\n🔐 Creating escrow YT ATA...");
    let escrowYtAta;
    try {
        escrowYtAta = await getOrCreateAssociatedTokenAccount(
            provider.connection,
            payer,
            actualYtMint,
            escrowAuthority,
            true // allowOwnerOffCurve
        );
        console.log("✅ Escrow YT ATA:", escrowYtAta.address.toBase58());
    } catch (escrowAtaError) {
        console.error("❌ Failed to create escrow YT ATA:", escrowAtaError.message);
        console.log("YT Mint address:", actualYtMint.toBase58());
        console.log("Escrow authority:", escrowAuthority.toBase58());
        throw escrowAtaError;
    }

    // 8. Verify all accounts
    console.log("\n🔍 Verifying deployed accounts...");
    
    try {
        const strategyAccount = await lending.account.strategy.fetch(strategyPda);
        console.log("✅ Lending Strategy verified:", {
            strategyId: strategyAccount.strategyId.toString(),
            tokenAddress: strategyAccount.tokenAddress.toBase58(),
            rewardApy: strategyAccount.rewardApy.toString(),
            active: strategyAccount.active
        });
    } catch (error) {
        console.error("❌ Could not fetch lending strategy account");
    }

    try {
        const userDepositAccount = await lending.account.userDeposit.fetch(userDepositPda);
        console.log("✅ User Deposit verified:", {
            user: userDepositAccount.user.toBase58(),
            amount: userDepositAccount.amount.toString(),
            yieldEarned: userDepositAccount.yieldEarned.toString()
        });
    } catch (error) {
        console.error("❌ Could not fetch user deposit account");
    }

    console.log("\n🎉 Complete setup finished!");
    console.log("\n📋 Summary:");
    console.log("  ✅ YT Mint created");
    console.log("  ✅ Lending Strategy created");
    console.log("  ✅ User Deposit initialized");
    console.log("  ✅ All ATAs created");
    console.log("  ✅ Deposit attempted (if USDC available)");
    console.log("\n🔄 Next steps:");
    console.log("  1. Get USDC from faucet: https://faucet.solana.com/");
    console.log("  2. Run another deposit if needed");
    console.log("  3. Test marketplace functionality");
    
    // Export important addresses for other scripts
    const config = {
        wallet: payer.publicKey.toBase58(),
        lending: {
            programId: LENDING_PROGRAM_ID.toBase58(),
            strategy: strategyPda.toBase58(),
            userDeposit: userDepositPda.toBase58(),
            vaultAccount: vaultAccountPda.toBase58(),
            ytMint: actualYtMint.toBase58()
        },
        marketplace: {
            programId: MARKETPLACE_PROGRAM_ID.toBase58(),
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

    // Save to file
    fs.writeFileSync('dexyield-config.json', JSON.stringify(config, null, 2));
    console.log("\n💾 Config saved to dexyield-config.json");
}

main().catch(error => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
});