const { Connection, PublicKey, Keypair, Transaction } = require('@solana/web3.js');
const { Program, AnchorProvider, Wallet } = require('@coral-xyz/anchor');
const fs = require('fs');

// Configuration
const PROGRAM_ID = "BHByEUQjZokRDuBacssntFnQnWEsTnxe73B3ofhRTx1J";
const RPC_URL = "https://api.devnet.solana.com";

async function resetYield() {
    console.log("🔄 Starting yield reset...");
    
    // Charger le wallet
    const walletPath = process.env.HOME + '/.config/solana/id.json';
    const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
    );
    
    console.log("👤 Wallet:", walletKeypair.publicKey.toBase58());
    
    // Setup connection
    const connection = new Connection(RPC_URL);
    const wallet = new Wallet(walletKeypair);
    const provider = new AnchorProvider(connection, wallet, {});
    
    // Charger l'IDL
    const idl = JSON.parse(fs.readFileSync('./target/idl/lending.json', 'utf-8'));
    const program = new Program(idl, PROGRAM_ID, provider);
    
    // Calculer les PDAs
    const poolOwner = walletKeypair.publicKey; // Vous êtes le propriétaire du pool
    
    const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("lending_pool"), poolOwner.toBuffer()],
        program.programId
    );
    
    // Strategy PDA pour SOL (strategy_id = 1)
    const solMint = new PublicKey("So11111111111111111111111111111111111111112");
    const strategyId = 1;
    
    const [strategyPDA] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("strategy"),
            solMint.toBuffer(),
            poolOwner.toBuffer(),
            Buffer.from(new Array(8).fill(0).map((_, i) => (strategyId >> (i * 8)) & 0xff))
        ],
        program.programId
    );
    
    const [userDepositPDA] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("user_deposit"),
            walletKeypair.publicKey.toBuffer(),
            poolPDA.toBuffer(),
            strategyPDA.toBuffer(),
        ],
        program.programId
    );
    
    console.log("📍 PDAs:");
    console.log("  Pool:", poolPDA.toBase58());
    console.log("  Strategy:", strategyPDA.toBase58());
    console.log("  User Deposit:", userDepositPDA.toBase58());
    
    try {
        // Vérifier les données actuelles
        const userDeposit = await program.account.userDeposit.fetch(userDepositPDA);
        console.log("💰 Current yield earned:", userDeposit.yieldEarned.toString());
        
        // Réinitialiser le yield
        console.log("🔄 Resetting yield...");
        
        const tx = await program.methods
            .resetUserYield()
            .accounts({
                user: walletKeypair.publicKey,
                userDeposit: userDepositPDA,
                pool: poolPDA,
                strategy: strategyPDA,
            })
            .rpc();
        
        console.log("✅ Reset successful!");
        console.log("📄 Transaction:", tx);
        
        // Vérifier le résultat
        const updatedUserDeposit = await program.account.userDeposit.fetch(userDepositPDA);
        console.log("💰 New yield earned:", updatedUserDeposit.yieldEarned.toString());
        
    } catch (error) {
        console.error("❌ Error:", error);
        
        if (error.message.includes("Account does not exist")) {
            console.log("ℹ️  User deposit account doesn't exist yet.");
        } else {
            console.log("🔍 Error details:", error.logs || error.message);
        }
    }
}

resetYield().catch(console.error);