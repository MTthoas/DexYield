const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const {
    TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount,
    getAccount,
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddress
} = require("@solana/spl-token");
const fs = require("fs");
const readline = require("readline");

// Load configuration
const config = JSON.parse(fs.readFileSync("./dexyield-config.json", "utf8"));

// Import IDL
const lendingIdl = require("../target/idl/lending.json");

// Program IDs
const LENDING_PROGRAM_ID = new PublicKey(config.lending.programId);
const USDC_MINT = new PublicKey(config.tokens.usdcMint);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function main() {
    console.log("💰 DexYield Interactive Deposit");
    console.log("================================");

    // Setup provider
    const provider = anchor.AnchorProvider.local("https://api.devnet.solana.com");
    anchor.setProvider(provider);

    // Create program
    const lending = new anchor.Program(lendingIdl, provider);
    const payer = provider.wallet.payer;
    
    console.log("🔐 Wallet:", payer.publicKey.toBase58());

    // Check USDC balance
    try {
        const userUsdcAta = await getAssociatedTokenAddress(USDC_MINT, payer.publicKey);
        const account = await getAccount(provider.connection, userUsdcAta);
        const balance = Number(account.amount) / 1e6;
        console.log("💵 USDC Balance:", balance, "USDC");
        
        if (balance < 1) {
            console.log("❌ Need at least 1 USDC to deposit");
            console.log("💡 Get USDC from: https://faucet.solana.com/");
            rl.close();
            return;
        }
    } catch (error) {
        console.log("❌ No USDC account found or balance is 0");
        console.log("💡 Get USDC from: https://faucet.solana.com/");
        rl.close();
        return;
    }

    // Ask for deposit amount
    const amountStr = await askQuestion("💰 Enter amount to deposit (USDC): ");
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount) || amount <= 0) {
        console.log("❌ Invalid amount");
        rl.close();
        return;
    }

    const amountLamports = Math.floor(amount * 1e6);
    console.log(`📊 Depositing ${amount} USDC (${amountLamports} lamports)`);

    try {
        // Use deployed addresses from config
        const poolPda = new PublicKey(config.lending.pool);
        const strategyPda = new PublicKey(config.lending.strategy);
        const ytMint = new PublicKey(config.lending.ytMint);
        const vaultAta = new PublicKey(config.lending.vaultAta);
        const poolAuthority = new PublicKey(config.lending.authority);

        // Calculate user deposit PDA
        const [userDepositPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("user_deposit"),
                payer.publicKey.toBuffer(),
                poolPda.toBuffer(),
                strategyPda.toBuffer()
            ],
            LENDING_PROGRAM_ID
        );

        // Get user token accounts
        const userUsdcAta = await getAssociatedTokenAddress(USDC_MINT, payer.publicKey);
        const userYtAta = await getAssociatedTokenAddress(ytMint, payer.publicKey);

        console.log("📋 Accounts:");
        console.log("  Pool:", poolPda.toString());
        console.log("  Strategy:", strategyPda.toString());
        console.log("  User Deposit:", userDepositPda.toString());
        console.log("  User USDC:", userUsdcAta.toString());
        console.log("  User YT:", userYtAta.toString());

        // Initialize user deposit if needed
        try {
            console.log("🔧 Initializing user deposit...");
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
            console.log("ℹ️ User deposit may already exist");
        }

        // Create YT token account if needed
        try {
            console.log("🔧 Creating YT token account...");
            await getOrCreateAssociatedTokenAccount(
                provider.connection,
                payer,
                ytMint,
                payer.publicKey
            );
            console.log("✅ YT token account ready");
        } catch (error) {
            console.log("ℹ️ YT token account may already exist");
        }

        // Perform deposit
        console.log("💸 Executing deposit...");
        const tx = await lending.methods
            .deposit(new anchor.BN(amountLamports))
            .accounts({
                user: payer.publicKey,
                pool: poolPda,
                userDeposit: userDepositPda,
                strategy: strategyPda,
                userTokenAccount: userUsdcAta,
                userYtAccount: userYtAta,
                vaultAccount: vaultAta,
                ytMint: ytMint,
                poolAuthority: poolAuthority,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();

        console.log("✅ Deposit successful!");
        console.log("📋 Transaction:", tx);
        console.log("🔗 View on Solana Explorer:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

        // Check new balance
        try {
            const account = await getAccount(provider.connection, userUsdcAta);
            const newBalance = Number(account.amount) / 1e6;
            console.log("💵 New USDC Balance:", newBalance, "USDC");
        } catch (error) {
            console.log("⚠️ Could not fetch new balance");
        }

        // Check YT balance
        try {
            const ytAccount = await getAccount(provider.connection, userYtAta);
            const ytBalance = Number(ytAccount.amount) / 1e6;
            console.log("🎯 YT Balance:", ytBalance, "YT");
        } catch (error) {
            console.log("⚠️ Could not fetch YT balance");
        }

    } catch (error) {
        console.error("❌ Deposit failed:", error);
        if (error.logs) {
            console.error("📋 Transaction logs:", error.logs);
        }
    }

    rl.close();
}

main().catch(console.error);