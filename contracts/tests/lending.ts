import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Lending } from "../target/types/lending";
import { PublicKey } from "@solana/web3.js";

describe("lending", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Anchor fait automatiquement le lien avec IDL + types + programId
  const program = anchor.workspace.Lending as Program<Lending>;

  const [lendingPoolPDA, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("lending"),
      provider.wallet.publicKey.toBuffer(), // <- le creator.key
    ],
    program.programId
  );

  it("Initialize Lending Pool", async () => {
    try {
      const pool = await program.account.pool.fetch(lendingPoolPDA);
      console.log("Pool déjà existante :", pool);
    } catch {
      const tx = await program.methods
        .initializeLendingPool()
        .accounts({
          creator: provider.wallet.publicKey,
          lendingPool: lendingPoolPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      console.log("✅ Pool créée, tx:", tx);
    }
  });
});
