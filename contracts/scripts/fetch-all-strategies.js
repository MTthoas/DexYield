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
        console.log(`  YT Mint: ${s.account.tokenYieldAddress || s.account.token_yield_address}`);
        console.log('------------------------------');
    }

    // --- DÉPÔT TEST ---
    // Paramètres du test
    const testStrategyId = new anchor.BN(1);
    const testTokenMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
    const depositAmount = 1_000_000; // 1 USDC (6 décimales)

    // Trouver la stratégie correspondante (correction robustes sur types)
    const targetStrategy = strategies.find(s => {
        const sid = s.account.strategyId || s.account.strategy_id;
        const sidNum = (sid && sid.toNumber) ? sid.toNumber() : Number(sid);
        const token = s.account.tokenAddress || s.account.token_address;
        let tokenStr;
        if (token && token.toBase58) tokenStr = token.toBase58();
        else if (typeof token === 'string') tokenStr = token;
        else tokenStr = new PublicKey(token).toBase58();
        return sidNum === 1 && tokenStr === testTokenMint.toBase58();
    });
    if (!targetStrategy) {
        console.error("❌ Aucune stratégie trouvée avec l'ID 1 et le bon mint");
        process.exit(1);
    }
    const strategyPubkey = targetStrategy.publicKey;
    const strategyBump = targetStrategy.account.bump || targetStrategy.account._bump || 255; // fallback

    // Comptes nécessaires
    // 1. Compte USDC de l'utilisateur
    const userTokenAccounts = await provider.connection.getTokenAccountsByOwner(payer.publicKey, { mint: testTokenMint });
    if (!userTokenAccounts.value.length) {
        console.error("❌ Aucun compte USDC trouvé pour ce wallet");
        process.exit(1);
    }
    const userTokenAccount = new PublicKey(userTokenAccounts.value[0].pubkey);

    // 2. Compte YT de l'utilisateur (créé si besoin)
    // On suppose que le mint YT est stocké dans la stratégie
    const ytMint = targetStrategy.account.tokenYieldAddress || targetStrategy.account.token_yield_address;
    const userYtAccounts = await provider.connection.getTokenAccountsByOwner(payer.publicKey, { mint: ytMint });
    let userYtAccount;
    if (userYtAccounts.value.length) {
        userYtAccount = new PublicKey(userYtAccounts.value[0].pubkey);
    } else {
        // Calcule l'adresse ATA
        const ata = await anchor.utils.token.associatedAddress({ mint: new PublicKey(ytMint), owner: payer.publicKey });
        userYtAccount = ata;
        // Vérifie si le compte existe, sinon le crée
        const ytAccInfo = await provider.connection.getAccountInfo(userYtAccount);
        if (!ytAccInfo) {
            console.log(`Compte YT ${userYtAccount.toBase58()} non initialisé, création...`);
            const { createAssociatedTokenAccountInstruction } = require("@solana/spl-token");
            const ataIx = createAssociatedTokenAccountInstruction(
                payer.publicKey, // payer
                userYtAccount,   // ata
                payer.publicKey, // owner
                new PublicKey(ytMint) // mint
            );
            const tx = new anchor.web3.Transaction().add(ataIx);
            await provider.sendAndConfirm(tx, [payer]);
            console.log("✅ Compte YT créé !");
        }
    }

    // 3. Vault PDA
    const [vaultPda] = await anchor.web3.PublicKey.findProgramAddress(
        [
            Buffer.from("vault_account"),
            testTokenMint.toBuffer(),
            Buffer.from(new anchor.BN(1).toArray("le", 8)),
        ],
        LENDING_PROGRAM_ID
    );

    // 4. YT mint - utiliser l'adresse réelle stockée dans la stratégie
    const ytMintAddress = new PublicKey(targetStrategy.account.tokenYieldAddress || targetStrategy.account.token_yield_address);

    // 5. UserDeposit PDA
    const [userDepositPda] = await anchor.web3.PublicKey.findProgramAddress(
        [
            Buffer.from("user_deposit"),
            payer.publicKey.toBuffer(),
            strategyPubkey.toBuffer(),
        ],
        LENDING_PROGRAM_ID
    );

    // 6. Token mint (USDC)
    const tokenMint = testTokenMint;

    // 7. Token program
    const tokenProgram = TOKEN_PROGRAM_ID;

    // 8. System program
    const systemProgram = SystemProgram.programId;

    // Appel deposit
    console.log("\n🚀 Dépôt de 1 USDC sur la stratégie 1...");
    try {
        await lending.methods.deposit(new anchor.BN(depositAmount))
            .accounts({
                user: payer.publicKey,
                userDeposit: userDepositPda,
                strategy: strategyPubkey,
                userTokenAccount: userTokenAccount,
                userYtAccount: userYtAccount,
                tokenMint: tokenMint,
                vaultAccount: vaultPda,
                ytMint: ytMintAddress,
                tokenProgram: tokenProgram,
                systemProgram: systemProgram,
            })
            .signers([payer])
            .rpc();
        console.log("✅ Dépôt effectué avec succès !");
    } catch (e) {
        console.error("❌ Erreur lors du dépôt:", e);
        return;
    }

    // --- RETRAIT TEST ---
    const withdrawAmount = 1_000_000; // 1 USDC (la moitié du dépôt)
    
    console.log("\n💸 Retrait de 1 USDC de la stratégie 1...");
    try {
        await lending.methods.withdraw(new anchor.BN(withdrawAmount))
            .accounts({
                user: payer.publicKey,
                userDeposit: userDepositPda,
                strategy: strategyPubkey,
                userTokenAccount: userTokenAccount,
                userYtAccount: userYtAccount,
                vaultAccount: vaultPda,
                ytMint: ytMintAddress,
                tokenProgram: tokenProgram,
            })
            .signers([payer])
            .rpc();
        console.log("✅ Retrait effectué avec succès !");
    } catch (e) {
        console.error("❌ Erreur lors du retrait:", e);
    }

}

main().catch(error => {
    console.error("❌ Failed to fetch strategies:", error);
    process.exit(1);
});
