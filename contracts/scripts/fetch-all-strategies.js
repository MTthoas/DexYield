const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram, LAMPORTS_PER_SOL, Keypair } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const fs = require("fs");
const crypto = require('crypto');
require('dotenv').config();

// Import IDL correctly
const lendingIdl = require("../target/idl/lending.json");

// Program IDs
const LENDING_PROGRAM_ID = new PublicKey("B7eNrb1uJR9risFgqTQhnxKQt18itfVdoz4XYufEAEX8");

// Use real devnet USDC mint (no balance needed for this demo)
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

async function main() {
    console.log("🎯 Simple DexYield Strategy Simulation...");

    // Load wallet from .env
    const privateKeyBase58 = process.env.PRIVATE_KEY_WALLET;
    const publicKeyBase58 = process.env.PUBLIC_KEY_WALLET;
    
    if (!privateKeyBase58 || !publicKeyBase58) {
        throw new Error("Missing wallet keys in .env file");
    }

    // Convert private key from base58 to Keypair
    const privateKeyBytes = anchor.utils.bytes.bs58.decode(privateKeyBase58);
    const payer = Keypair.fromSecretKey(privateKeyBytes);
    
    console.log("💳 Using wallet:", payer.publicKey.toBase58());

    // Setup provider
    const provider = new anchor.AnchorProvider(
        new anchor.web3.Connection("https://api.devnet.solana.com"),
        new anchor.Wallet(payer),
        { commitment: "confirmed" }
    );
    anchor.setProvider(provider);

    // Create program
    const lending = new anchor.Program(lendingIdl, provider);

    // Check SOL balance
    const balance = await provider.connection.getBalance(payer.publicKey);
    console.log("💰 SOL balance:", balance / LAMPORTS_PER_SOL, "SOL");
    
    if (balance < LAMPORTS_PER_SOL * 0.1) {
        console.log("💸 Requesting SOL airdrop...");
        const sig = await provider.connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
        await provider.connection.confirmTransaction(sig, "confirmed");
        console.log("✅ SOL airdrop received");
    }
  
    const strategies = await lending.account.strategy.all();
    console.log("📊 Found", strategies.length, "strategies:\n");
    for (const s of strategies) {
        // Adresse de la stratégie
        const strategyPubkey = s.publicKey.toBase58();
        // Solde du vault associé (token_address, strategy_id)
        // On suppose que le champ token_address et strategy_id existent dans s.account
        const tokenAddress = s.account.tokenAddress || s.account.token_address;
        const strategyId = s.account.strategyId || s.account.strategy_id;
        // Derive le vault PDA (même logique que dans le smart contract)
        const [vaultPda] = await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from("vault_account"),
                new anchor.web3.PublicKey(tokenAddress).toBuffer(),
                Buffer.from(new anchor.BN(strategyId).toArray("le", 8)),
            ],
            LENDING_PROGRAM_ID
        );
        // Récupère le solde du vault
        let vaultBalance = 0;
        try {
            const vaultAcc = await provider.connection.getTokenAccountBalance(vaultPda);
            vaultBalance = vaultAcc.value.uiAmount;
        } catch (e) {
            vaultBalance = 'N/A';
        }
        console.log(`- Strategy: ${strategyPubkey}`);
        console.log(`  Token: ${tokenAddress}`);
        console.log(`  Strategy ID: ${strategyId}`);
        console.log(`  Vault: ${vaultPda.toBase58()}`);
        console.log(`  Vault balance: ${vaultBalance}`);
        console.log('------------------------------');
    }

}

main().catch(error => {
    console.error("❌ Failed to fetch strategies:", error);
    process.exit(1);
});
