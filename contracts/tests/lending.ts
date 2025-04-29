import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Lending } from "../target/types/lending";
import { PublicKey } from "@solana/web3.js";

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

  it("Initialize Lending Pool", async () => {
    try {
      await program.account.pool.fetch(lendingPoolPDA);
      console.log("✅ Pool déjà existante");
    } catch {
      const tx = await program.methods
        .initializeLendingPool()
        .accounts({
          creator: provider.wallet.publicKey,
          pool: lendingPoolPDA,
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
    const ytMint = anchor.web3.Keypair.generate();
    const userTokenAccount = anchor.web3.Keypair.generate();

    // Ce test suppose que les comptes de mint et token_account ont déjà été créés via CPI ou setup.
    const tx = await program.methods
      .mintYieldToken(new anchor.BN(50))
      .accounts({
        pool: lendingPoolPDA,
        ytMint: ytMint.publicKey,
        mintAuthority: lendingPoolPDA, // si PDA, remplacer par derive
        userTokenAccount: userTokenAccount.publicKey,
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
      const tx = await program.methods
        .redeem()
        .accounts({
          user: provider.wallet.publicKey,
          pool: lendingPoolPDA,
          userDeposit: userDepositPDA,
          ytMint: anchor.web3.Keypair.generate().publicKey,
          userTokenAccount: anchor.web3.Keypair.generate().publicKey,
          userUsdcAccount: anchor.web3.Keypair.generate().publicKey,
          vaultAccount: anchor.web3.Keypair.generate().publicKey,
          poolAuthority: lendingPoolPDA,
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
