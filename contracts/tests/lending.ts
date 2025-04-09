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
});
