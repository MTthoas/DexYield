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

// Use real devnet USDC mint
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // Real devnet USDC

async function main() {
    console.log("🚀 Starting DexYield setup...");

    // Setup provider
    const provider = anchor.AnchorProvider.local("https://api.devnet.solana.com");
    anchor.setProvider(provider);

    // Create programs - use the exact IDL structure
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

    // Calculate PDAs
    console.log("🔍 Calculating PDAs...");
    const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("lending_pool"), payer.publicKey.toBuffer()],
        LENDING_PROGRAM_ID
    );

    // YT Mint PDA: utilise maintenant creator.key() pour éviter la dépendance circulaire
    const [ytMintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("yt_mint"), payer.publicKey.toBuffer()],
        LENDING_PROGRAM_ID
    );

    // STRATEGY PDA: doit être [b"strategy", USDC_MINT.toBuffer()]
    const [strategyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("strategy"), USDC_MINT.toBuffer()],
        LENDING_PROGRAM_ID
    );

    const [userDepositPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("user_deposit"),
            payer.publicKey.toBuffer(),
            poolPda.toBuffer(),
            strategyPda.toBuffer(), // On passe bien la PDA de la stratégie ici
        ],
        LENDING_PROGRAM_ID
    );

    const [poolAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("authority"), payer.publicKey.toBuffer()],
        LENDING_PROGRAM_ID
    );

    console.log("📍 PDAs calculated:");
    console.log("  Pool:", poolPda.toBase58());
    console.log("  YT Mint:", ytMintPda.toBase58());
    console.log("  Strategy:", strategyPda.toBase58());
    console.log("  UserDeposit:", userDepositPda.toBase58());
    console.log("  Authority:", poolAuthority.toBase58());

    // 0. Create YT mint (Yield Token SPL Mint)
    // ⚠️ On ne peut pas créer un mint SPL à une adresse PDA custom côté JS avec spl-token
    // Il faut que le mint soit créé côté Rust/Anchor lors de l'init du pool
    // Donc on retire la création du mint ici

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
    console.log("\n🔄 Initializing Pool...");
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

    // 3. Create Strategy
    console.log("\n📈 Creating Strategy...");
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
        console.log("✅ Strategy created");
    } catch (error) {
        if (error.message.includes("already in use")) {
            console.log("⚠️  Strategy already exists");
        } else {
            console.error("❌ Strategy creation failed:", error.message);
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

    // 5. Create user USDC ATA
    console.log("\n💵 Creating user USDC ATA...");
    const userUsdcAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        USDC_MINT,
        payer.publicKey
    );
    console.log("✅ User USDC ATA:", userUsdcAta.address.toBase58());

    // 6. Get USDC from faucet (devnet)
    console.log("\n🪙 Getting USDC from devnet faucet...");
    console.log("💡 Visit: https://faucet.solana.com/ and request USDC to:", userUsdcAta.address.toBase58());
    console.log("   Or use: solana airdrop 1 --url devnet", userUsdcAta.address.toBase58());

    // Check USDC balance
    try {
        const usdcBalance = await provider.connection.getTokenAccountBalance(userUsdcAta.address);
        console.log("💰 Current USDC balance:", usdcBalance.value.uiAmount || 0, "USDC");
    } catch (error) {
        console.log("⚠️  Could not check USDC balance");
    }

    console.log("\n🎉 Basic setup completed!");
    console.log("\n📋 Summary:");
    console.log("  ✅ Pool initialized at:", poolPda.toBase58());
    console.log("  ✅ YT Mint created at:", ytMintPda.toBase58());
    console.log("  ✅ Strategy created at:", strategyPda.toBase58());
    console.log("  ✅ User deposit ready at:", userDepositPda.toBase58());
    console.log("  ✅ USDC ATA ready at:", userUsdcAta.address.toBase58());
    console.log("\n🔄 Next steps:");
    console.log("  1. Get USDC from faucet");
    console.log("  2. Run deposit test with: node scripts/test-deposit.js");
}

main().catch(error => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
});
