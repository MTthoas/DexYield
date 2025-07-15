const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram } = require("@solana/web3.js");
const {
    TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount,
    getAccount
} = require("@solana/spl-token");

const lendingIdl = require("../target/idl/lending.json");

const LENDING_PROGRAM_ID = new PublicKey("GBhdq8ypCAdTEqPLm4ZQA4mSUjHik7U43FMoou3qwLxo");
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

async function testDeposit() {
    console.log("🧪 Testing deposit functionality...");

    const provider = anchor.AnchorProvider.local("https://api.devnet.solana.com");
    anchor.setProvider(provider);

    const lending = new anchor.Program(lendingIdl, provider);
    const payer = provider.wallet.payer;

    // Calculate PDAs
    const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("lending_pool"), payer.publicKey.toBuffer()],
        LENDING_PROGRAM_ID
    );

    // YT Mint PDA: utilise maintenant creator.key()
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

    // Get user USDC account
    const userUsdcAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        USDC_MINT,
        payer.publicKey
    );

    // Check USDC balance
    try {
        const usdcAccount = await getAccount(provider.connection, userUsdcAta.address);
        const balance = Number(usdcAccount.amount) / 1e6;
        console.log("💰 USDC balance:", balance);

        if (balance < 10) {
            console.log("❌ Need at least 10 USDC to test deposit");
            console.log("💡 Get USDC from: https://faucet.solana.com/");
            return;
        }
    } catch (error) {
        console.log("❌ Could not get USDC balance");
        return;
    }

    // Create YT ATA (YT mint is now a separate PDA)
    const userYtAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        ytMintPda, // YT mint is separate PDA
        payer.publicKey
    );

    // Get vault ATA
    const vaultAta = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer,
        USDC_MINT,
        poolPda,
        true
    );

    // Test deposit 10 USDC
    console.log("📤 Depositing 10 USDC...");
    try {
        await lending.methods
            .deposit(new anchor.BN(10 * 1e6)) // 10 USDC
            .accounts({
                user: payer.publicKey,
                pool: poolPda,
                userDeposit: userDepositPda,
                strategy: strategyPda,
                userTokenAccount: userUsdcAta.address,
                userYtAccount: userYtAta.address,
                vaultAccount: vaultAta.address,
                ytMint: ytMintPda,
                poolAuthority: poolAuthority,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .rpc();

        console.log("✅ Deposit successful!");

        // Check YT balance
        try {
            const ytAccount = await getAccount(provider.connection, userYtAta.address);
            const ytBalance = Number(ytAccount.amount) / 1e6;
            console.log("🎫 YT tokens received:", ytBalance);
        } catch (error) {
            console.log("⚠️  Could not check YT balance");
        }

    } catch (error) {
        console.error("❌ Deposit failed:", error.message);
        if (error.logs) {
            console.log("📋 Transaction logs:");
            error.logs.forEach(log => console.log("  ", log));
        }
    }
}

testDeposit().catch(error => {
    console.error("❌ Test failed:", error);
    process.exit(1);
});
