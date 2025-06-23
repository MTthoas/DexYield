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

  // Dérive le PDA de la stratégie (exemple : une stratégie par mint USDC)
  let strategyMint: PublicKey;
  let strategyPDA: PublicKey;

  before(async () => {
    // Crée un mint pour la stratégie (ex : USDC)
    strategyMint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      6
    );
    // Dérive le PDA de la stratégie
    [strategyPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("strategy"), strategyMint.toBuffer()],
      program.programId
    );
  });

  // Dérive le PDA du compte UserDeposit avec la stratégie
  const getUserDepositPDA = (user: PublicKey, pool: PublicKey, strategy: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("user_deposit"), user.toBuffer(), pool.toBuffer(), strategy.toBuffer()],
      program.programId
    )[0];

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

  it("Initialize Strategy", async () => {
    try {
      await program.account.strategy.fetch(strategyPDA);
      console.log("✅ Strategy déjà existante");
    } catch {
      const tx = await program.methods
        .createStrategy(new anchor.BN(10000)) // 10% APY
        .accounts({
          admin: provider.wallet.publicKey,
          strategy: strategyPDA,
          tokenAddress: strategyMint,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      console.log("✅ Strategy créée, tx:", tx);
    }
  });

  it("Initialize User Deposit", async () => {
    const userDepositPDA = getUserDepositPDA(provider.wallet.publicKey, lendingPoolPDA, strategyPDA);
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
          strategy: strategyPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      console.log("✅ UserDeposit créé, tx:", tx);
    }
  });

  it("Deposit", async () => {
    const userDepositPDA = getUserDepositPDA(provider.wallet.publicKey, lendingPoolPDA, strategyPDA);
    const tx = await program.methods
      .deposit(new anchor.BN(100))
      .accounts({
        user: provider.wallet.publicKey,
        pool: lendingPoolPDA,
        userDeposit: userDepositPDA,
        strategy: strategyPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("✅ Dépôt effectué, tx:", tx);

    const userDeposit = await program.account.userDeposit.fetch(userDepositPDA);
    console.log("💰 User balance:", userDeposit.amount.toString());
  });

  it("Withdraw", async () => {
    const userDepositPDA = getUserDepositPDA(provider.wallet.publicKey, lendingPoolPDA, strategyPDA);
    const tx = await program.methods
      .withdraw(new anchor.BN(50))
      .accounts({
        user: provider.wallet.publicKey,
        pool: lendingPoolPDA,
        userDeposit: userDepositPDA,
        strategy: strategyPDA,
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
        // Ajoute la stratégie si nécessaire dans le contexte
      })
      .signers([])
      .rpc();

    console.log("✅ YT minté, tx:", tx);
  });

  it("Get User Balance", async () => {
    const userDepositPDA = getUserDepositPDA(provider.wallet.publicKey, lendingPoolPDA, strategyPDA);
    const balance = await program.methods
      .getUserBalance()
      .accounts({
        user: provider.wallet.publicKey,
        pool: lendingPoolPDA,
        userDeposit: userDepositPDA,
        strategy: strategyPDA,
      })
      .view();
    console.log("🔍 Solde user récupéré via getUserBalance():", balance.toString());
  });

  it("Redeem (mocké)", async () => {
    const userDepositPDA = getUserDepositPDA(provider.wallet.publicKey, lendingPoolPDA, strategyPDA);
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
          strategy: strategyPDA,
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
