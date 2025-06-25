import { describe, it, before } from "mocha";
import { expect } from "chai";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Marketplace } from "../target/types/marketplace";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createMint,
} from "@solana/spl-token";

describe("Marketplace Simple Tests", () => {
  let program: Program<Marketplace>;
  let provider: anchor.AnchorProvider;
  let seller: Keypair;
  let buyer: Keypair;
  let ytMint: PublicKey;
  let sellerTokenAccount: PublicKey;

  before(async () => {
    // Configurer le provider
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Initialiser le programme
    program = anchor.workspace.Marketplace as Program<Marketplace>;

    // Générer les comptes de test
    seller = Keypair.generate();
    buyer = Keypair.generate();

    // Airdrop SOL aux comptes
    await provider.connection.requestAirdrop(
      seller.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      buyer.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );

    // Attendre que les airdrops soient confirmés
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Créer le mint YT
    ytMint = await createMint(
      provider.connection,
      seller,
      seller.publicKey,
      null,
      9
    );

    // Créer le compte de tokens pour le seller
    const sellerTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      seller,
      ytMint,
      seller.publicKey
    );
    sellerTokenAccount = sellerTokenAccountInfo.address;

    // Mint des tokens YT au seller
    await mintTo(
      provider.connection,
      seller,
      ytMint,
      sellerTokenAccount,
      seller,
      1000
    );
  });

  describe("Create Strategy", () => {
    it("Should create a strategy successfully", async () => {
      const [strategyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("strategy"), ytMint.toBuffer()],
        program.programId
      );

      try {
        const tx = await program.methods
          .createStrategy(new anchor.BN(500)) // 5% APY
          .accounts({
            admin: seller.publicKey,
            tokenAddress: ytMint,
          })
          .signers([seller])
          .rpc();

        expect(tx).to.be.a("string");
        console.log("Strategy created with tx:", tx);

        // Vérifier que la stratégie a été créée
        const strategy = await program.account.strategy.fetch(strategyPda);
        expect(strategy.tokenAddress.toString()).to.equal(ytMint.toString());
        expect(strategy.rewardApy.toNumber()).to.equal(500);
      } catch (error) {
        console.error("Error creating strategy:", error);
        throw error;
      }
    });
  });

  describe("Basic Program Info", () => {
    it("Should have correct program ID", () => {
      expect(program.programId.toString()).to.equal(
        anchor.workspace.Marketplace.programId.toString()
      );
    });

    it("Should have provider connection", () => {
      expect(provider.connection).to.exist;
    });

    it("Should have created mint", () => {
      expect(ytMint).to.exist;
      expect(ytMint.toString()).to.not.equal(PublicKey.default.toString());
    });
  });
});
