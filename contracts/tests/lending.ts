import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Lending } from "../target/types/lending";
import { PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, createMint } from "@solana/spl-token";

describe("lending", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Lending as Program<Lending>;

  // Dérive le PDA de la pool (1 seule par créateur)
  const [lendingPoolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("lending_pool"), provider.wallet.publicKey.toBuffer()],
    program.programId
  );

  // Dérive le PDA du compte UserDeposit
  const [userDepositPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_deposit"),
      provider.wallet.publicKey.toBuffer(),
      lendingPoolPDA.toBuffer(),
    ],
    program.programId
  );

  // PDA for vault authority (if needed)
  const [vaultAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_authority"), lendingPoolPDA.toBuffer()],
    program.programId
  );

  // PDA for mint authority
  const [mintAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("authority"), lendingPoolPDA.toBuffer()],
    program.programId
  );

  // Dérive le PDA du vaultAccount (SPL Token Account) pour la pool
  const [vaultAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), lendingPoolPDA.toBuffer()],
    program.programId
  );

  let usdcMint: PublicKey;
  let vaultTokenAccount: any;

  it("Initialize Lending Pool", async () => {
    usdcMint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      6
    );

    vaultTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      usdcMint,
      lendingPoolPDA,
      true // allowOwnerOffCurve
    );

    try {
      await program.account.pool.fetch(lendingPoolPDA);
      console.log("✅ Pool déjà existante");
    } catch {
      const tx = await program.methods
        .initializeLendingPool()
        .accounts({
          creator: provider.wallet.publicKey,
          pool: lendingPoolPDA,
          vaultAccount: vaultTokenAccount.address,
          mint: usdcMint,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      console.log("✅ Pool créée, tx:", tx);
    }
  });

  it("Initialize User Deposit", async () => {
    try {
      await program.account.userDeposit.fetch(userDepositPDA);
      console.log("✅ UserDeposit déjà existant");
    } catch {
      const tx = await program.methods
        .initializeUserDeposit()
        .accounts({
          user: provider.wallet.publicKey,
          pool: lendingPoolPDA,
          userDeposit: userDepositPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      console.log("✅ UserDeposit créé, tx:", tx);
    }
  });

  it("Deposit", async () => {
    const tx = await program.methods
      .deposit(new anchor.BN(100))
      .accounts({
        user: provider.wallet.publicKey,
        pool: lendingPoolPDA,
        userDeposit: userDepositPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("✅ Dépôt effectué, tx:", tx);

    const userDeposit = await program.account.userDeposit.fetch(userDepositPDA);
    console.log("💰 User balance:", userDeposit.amount.toString());
  });

  it("Withdraw", async () => {
    const tx = await program.methods
      .withdraw(new anchor.BN(50))
      .accounts({
        user: provider.wallet.publicKey,
        pool: lendingPoolPDA,
        userDeposit: userDepositPDA,
      })
      .rpc();
    console.log("✅ Retrait effectué, tx:", tx);

    const userDeposit = await program.account.userDeposit.fetch(userDepositPDA);
    console.log(
      "💰 User balance après retrait:",
      userDeposit.amount.toString()
    );
  });

  it("Mint Yield Token", async () => {
    // Crée un mint pour le Yield Token
    const ytMint = await createMint(
      provider.connection,
      provider.wallet.payer,
      mintAuthority,
      null,
      9
    );

    // Récupère ou crée le compte associé pour l'utilisateur
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      ytMint,
      provider.wallet.publicKey
    );

    const tx = await program.methods
      .mintYieldToken(new anchor.BN(50))
      .accounts({
        pool: lendingPoolPDA,
        ytMint: ytMint,
        mintAuthority: mintAuthority,
        userTokenAccount: userTokenAccount.address,
        user: provider.wallet.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .signers([])
      .rpc();

    console.log("✅ YT minté, tx:", tx);
  });

  it("Get User Balance", async () => {
    const balance = await program.methods
      .getUserBalance()
      .accounts({
        user: provider.wallet.publicKey,
        pool: lendingPoolPDA,
        userDeposit: userDepositPDA,
      })
      .view();
    console.log("🔍 Solde user récupéré via getUserBalance():", balance.toString());
  });

  it("Redeem (mocké)", async () => {
    try {
      // Crée un mint pour le Yield Token
      const ytMint = await createMint(
        provider.connection,
        provider.wallet.payer,
        lendingPoolPDA,
        null,
        9
      );

      // Comptes token associés nécessaires
      const userTokenAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        ytMint,
        provider.wallet.publicKey
      );

      const userUsdcAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        vaultAccount,
        provider.wallet.publicKey
      );

      const tx = await program.methods
        .redeem()
        .accounts({
          user: provider.wallet.publicKey,
          pool: lendingPoolPDA,
          userDeposit: userDepositPDA,
          ytMint: ytMint,
          userTokenAccount: userTokenAccount.address,
          userUsdcAccount: userUsdcAccount.address,
          vaultAccount: vaultAccount,
          poolAuthority: vaultAuthority,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .signers([])
        .rpc();
      console.log("✅ Redeem effectué (attention: doit respecter la durée de maturité), tx:", tx);
    } catch (err) {
      console.log("❌ Redeem a échoué (peut-être trop tôt) :", err.message);
    }
  });
});
