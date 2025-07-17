const anchor = require('@coral-xyz/anchor');
const { PublicKey } = require('@solana/web3.js');
const fs = require('fs');

const DEVNET_CONFIG = {
  lending: {
    programId: "BHByEUQjZokRDuBacssntFnQnWEsTnxe73B3ofhRTx1J",
    pool: "3nYX4KbJjdDtVcYZwQbLN1KvHXwNSyGRNm3fJTGFNrN7",
    authority: "7QFrWJhBHrVJgkXLjXtPVXPJfHGnfUJzpJtbVGdaBGdP",
    ytMint: "EiVGEQJRzz9MwmjvR3tXmHVWcbqFBdRhQiaDkTSgPgmb",
    strategy: "CKKcFGgDkSn6YhKdpzXoWYSBbqB9QdBRgKA4mBGfBQYY",
    vault: "EqYHhYSRHEcE3LMqLCZ3xvLyLiHojWL5GWMQdEwAzTaA",
    userDeposit: "CjJULKoSmUGNFhbCWQWDLLLpHCKKHZMdkFCUwEhGKU9e",
    userUsdc: "CxLKHcTLkj4VPPLvfJRGTEFQp2HccEpKvGfnMvqKJnrr",
    userYt: "cKA5EHKXHUjvnSKfQchhrvV8tcJaKqZoxgUGn5xMBkk",
  },
};

async function resetUserYield() {
  console.log("🔄 Starting user yield reset...");
  
  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  // Load program
  const idl = JSON.parse(fs.readFileSync('./target/idl/lending.json', 'utf-8'));
  const program = new anchor.Program(idl, DEVNET_CONFIG.lending.programId, provider);
  
  const payer = provider.wallet.payer;
  console.log("👤 User:", payer.publicKey.toBase58());
  
  // Calculate PDAs
  const [poolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("lending_pool"), payer.publicKey.toBuffer()],
    program.programId
  );
  
  const [strategyPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("strategy"),
      new PublicKey("So11111111111111111111111111111111111111112").toBuffer(), // SOL mint
      payer.publicKey.toBuffer(),
      Buffer.from(new anchor.BN(1).toArray('le', 8))
    ],
    program.programId
  );
  
  const [userDepositPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_deposit"),
      payer.publicKey.toBuffer(),
      poolPDA.toBuffer(),
      strategyPDA.toBuffer(),
    ],
    program.programId
  );
  
  console.log("📍 PDAs calculated:");
  console.log("  Pool PDA:", poolPDA.toBase58());
  console.log("  Strategy PDA:", strategyPDA.toBase58());
  console.log("  User Deposit PDA:", userDepositPDA.toBase58());
  
  try {
    // Check if user deposit account exists
    const userDepositAccount = await program.account.userDeposit.fetch(userDepositPDA);
    console.log("💰 Current yield earned:", userDepositAccount.yieldEarned.toString());
    
    // Reset user yield
    const tx = await program.methods
      .resetUserYield()
      .accounts({
        user: payer.publicKey,
        userDeposit: userDepositPDA,
        pool: poolPDA,
        strategy: strategyPDA,
      })
      .signers([payer])
      .rpc();
    
    console.log("✅ User yield reset successful!");
    console.log("📄 Transaction signature:", tx);
    
    // Verify the reset
    const updatedUserDeposit = await program.account.userDeposit.fetch(userDepositPDA);
    console.log("💰 New yield earned:", updatedUserDeposit.yieldEarned.toString());
    
  } catch (error) {
    console.error("❌ Error resetting user yield:", error);
    
    if (error.message.includes("Account does not exist")) {
      console.log("ℹ️  User deposit account doesn't exist. No reset needed.");
    } else {
      throw error;
    }
  }
}

// Run the script
resetUserYield().catch(console.error);