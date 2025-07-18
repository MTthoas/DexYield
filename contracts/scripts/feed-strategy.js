const anchor = require("@coral-xyz/anchor");
const {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair
} = require("@solana/web3.js");
const {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  getOrCreateAssociatedTokenAccount,
  createSyncNativeInstruction
} = require("@solana/spl-token");
const fs = require("fs");
require("dotenv").config();

// Import IDL
const lendingIdl = require("../target/idl/lending.json");

// Program ID
const LENDING_PROGRAM_ID = new PublicKey("B7eNrb1uJR9risFgqTQhnxKQt18itfVdoz4XYufEAEX8");

// Strategy cible et montant (en SOL natif)
const TARGET_STRATEGY_ID = "9xZQvBuYafvdnZcnja45GXJnJ7WdFProo6VSQc6XE32Q";
const AMOUNT_SOL = 1; // ajustez ici - montant en SOL

async function main() {
  console.log("🎯 Feed de la stratégie ciblée...");

  // Load keypair from file (consistent with setup-workflow)
  const keypairPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/new-id.json`;
  let payer;
  
  try {
    if (fs.existsSync(keypairPath)) {
      const keypairData = JSON.parse(fs.readFileSync(keypairPath));
      payer = Keypair.fromSecretKey(new Uint8Array(keypairData));
      console.log("💳 Wallet loaded from file:", payer.publicKey.toBase58());
    } else {
      // Fallback to environment variable
      const privateKeyBase58 = process.env.PRIVATE_KEY_WALLET;
      if (!privateKeyBase58) throw new Error("Clé privée manquante dans .env et fichier wallet introuvable");
      payer = Keypair.fromSecretKey(
        anchor.utils.bytes.bs58.decode(privateKeyBase58)
      );
      console.log("💳 Wallet loaded from env:", payer.publicKey.toBase58());
    }
  } catch (error) {
    console.error("❌ Erreur chargement wallet:", error.message);
    process.exit(1);
  }

  // Provider et programme
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
    commitment: "confirmed"
  });
  anchor.setProvider(provider);
  const lending = new anchor.Program(lendingIdl, provider);

  // Vérif SOL balance
  console.log("💰 Checking SOL balance...");
  let balance = await connection.getBalance(payer.publicKey);
  console.log("💰 SOL :", balance / LAMPORTS_PER_SOL);
  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log("💸 Requesting SOL airdrop...");
    const sig = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
    balance = await connection.getBalance(payer.publicKey);
    console.log("✅ SOL airdrop received:", balance / LAMPORTS_PER_SOL);
  }

  // Récupère la stratégie SOL existante
  console.log("🔍 Loading target SOL strategy...");
  let target;
  try {
    const strategies = await lending.account.strategy.all();
    target = strategies.find(s => s.publicKey.toBase58() === TARGET_STRATEGY_ID);
    if (!target) throw new Error("Stratégie SOL cible non trouvée");
    console.log("✅ Target SOL strategy found:", TARGET_STRATEGY_ID);
  } catch (error) {
    console.error("❌ Strategy loading failed:", error.message);
    process.exit(1);
  }

  // Utiliser wSOL comme token mint (la stratégie SOL utilise wSOL)
  const tokenMint = NATIVE_MINT; // wSOL pour SOL natif
  const strategyIdBN = new anchor.BN(target.account.strategyId || target.account.strategy_id);
  console.log("📍 Strategy details:", {
    strategyId: target.publicKey.toBase58(),
    tokenMint: tokenMint.toBase58(),
    strategyIdNumber: strategyIdBN.toString()
  });

  // Calculate PDAs (consistent with setup-workflow)
  console.log("🔍 Calculating PDAs...");
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault_account"),
      tokenMint.toBuffer(),
      strategyIdBN.toArrayLike(Buffer, 'le', 8),
    ],
    LENDING_PROGRAM_ID
  );
  console.log("📦 Vault PDA:", vaultPda.toBase58());

  // --- Pour SOL natif, il faut utiliser un ATA wSOL (le smart contract l'exige) ---
  console.log("💰 Creating wSOL ATA (smart contract requires SPL token account)...");
  let userTokenAccount;
  try {
    userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      NATIVE_MINT,
      payer.publicKey
    );
    console.log("✅ wSOL ATA:", userTokenAccount.address.toBase58());
  } catch (error) {
    console.error("❌ Failed to create wSOL ATA:", error.message);
    process.exit(1);
  }
  
  // Wrap SOL natif en wSOL (méthode correcte)
  const amountLamports = AMOUNT_SOL * LAMPORTS_PER_SOL;
  console.log(`💰 Wrapping ${AMOUNT_SOL} SOL to wSOL...`);
  try {
    const wrapTx = new anchor.web3.Transaction()
      .add(
        // Transfer SOL vers le compte wSOL
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: userTokenAccount.address,
          lamports: amountLamports,
        })
      )
      .add(
        // Synchroniser le solde natif avec le token account
        createSyncNativeInstruction(userTokenAccount.address)
      );
    await provider.sendAndConfirm(wrapTx, [payer]);
    console.log(`✅ ${AMOUNT_SOL} SOL wrapped to wSOL`);
    
    // Vérifier le solde wSOL après wrapping
    const wsolBalance = await connection.getTokenAccountBalance(userTokenAccount.address);
    console.log(`💰 wSOL balance after wrapping: ${wsolBalance.value.uiAmount} SOL`);
  } catch (error) {
    console.error("❌ SOL wrapping failed:", error.message);
    process.exit(1);
  }

  // 2) Préparation comptes pour Anchor.deposit
  const [userDepositPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_deposit"),
      payer.publicKey.toBuffer(),
      target.publicKey.toBuffer(),
    ],
    LENDING_PROGRAM_ID
  );

  // Crée ATA du yield token si besoin
  const ytMint = new PublicKey(target.account.tokenYieldAddress || target.account.token_yield_address);
  console.log("🪙 Creating/preparing YT ATA...");
  let userYtAccount;
  try {
    userYtAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      ytMint,
      payer.publicKey
    );
    console.log("✅ YT ATA:", userYtAccount.address.toBase58());
  } catch (error) {
    console.error("❌ Failed to create YT ATA:", error.message);
    process.exit(1);
  }

  // Init UserDeposit si nécessaire
  console.log("👤 Initializing User Deposit...");
  try {
    await lending.account.userDeposit.fetch(userDepositPda);
    console.log("✅ UserDeposit déjà initialisé");
  } catch {
    console.log("⏳ Initialisation UserDeposit...");
    try {
      await lending.methods
        .initializeUserDeposit()
        .accounts({
          user: payer.publicKey,
          userDeposit: userDepositPda,
          strategy: target.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();
      console.log("✅ UserDeposit initialisé");
    } catch (error) {
      console.error("❌ UserDeposit initialization failed:", error.message);
      process.exit(1);
    }
  }

  // 3) Appel Anchor.deposit
  console.log("💳 Making deposit...");
  console.log(`📊 Deposit amount: ${amountLamports} lamports (${AMOUNT_SOL} SOL)`);
  try {
    const sig2 = await lending.methods
      .deposit(new anchor.BN(amountLamports))
      .accounts({
        user: payer.publicKey,
        userDeposit: userDepositPda,
        strategy: target.publicKey,
        userTokenAccount: userTokenAccount.address, // ← ATA wSOL pour SOL
        userYtAccount: userYtAccount.address,
        tokenMint: tokenMint, // Utiliser le token mint de la stratégie
        vaultAccount: vaultPda,
        ytMint: ytMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer])
      .rpc();
    console.log(`✅ Dépôt Anchor effectué: ${sig2}`);
    console.log(`➡️ https://explorer.solana.com/tx/${sig2}?cluster=devnet`);
  } catch (error) {
    console.error("❌ Deposit failed:", error.message);
    process.exit(1);
  }

  // Verification finale
  console.log("\n🔍 Verifying final state...");
  try {
    const userDepositAccount = await lending.account.userDeposit.fetch(userDepositPda);
    console.log("✅ Final deposit state:", {
      user: userDepositAccount.user.toBase58(),
      amount: userDepositAccount.amount.toString(),
      yieldEarned: userDepositAccount.yieldEarned.toString()
    });
  } catch (error) {
    console.error("❌ Could not fetch final deposit state:", error.message);
  }

  console.log("\n🎉 Feed strategy completed successfully!");
}

main().catch(err => {
  console.error("❌ Erreur :", err);
  process.exit(1);
});
