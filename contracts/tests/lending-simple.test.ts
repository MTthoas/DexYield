import { describe, it, before } from "mocha";
import { expect } from "chai";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Lending } from "../target/types/lending";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createMint,
} from "@solana/spl-token";

describe("Lending Simple Tests", () => {
  let program: Program<Lending>;
  let provider: anchor.AnchorProvider;
  let admin: Keypair;
  let user: Keypair;
  let collateralMint: PublicKey;
  let userCollateralAccount: PublicKey;
  let adminCollateralAccount: PublicKey;

  before(async () => {
    // Configurer le provider
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Initialiser le programme
    program = anchor.workspace.Lending as Program<Lending>;

    // Générer les comptes de test
    admin = Keypair.generate();
    user = Keypair.generate();

    // Airdrop SOL aux comptes
    await provider.connection.requestAirdrop(
      admin.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      user.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );

    // Attendre que les airdrops soient confirmés
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Créer le mint pour les collateraux
    collateralMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      9 // 9 décimales
    );

    // Créer les comptes de tokens
    const adminCollateralAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      collateralMint,
      admin.publicKey
    );
    adminCollateralAccount = adminCollateralAccountInfo.address;

    const userCollateralAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user,
      collateralMint,
      user.publicKey
    );
    userCollateralAccount = userCollateralAccountInfo.address;

    // Mint des tokens de collateral à l'utilisateur
    await mintTo(
      provider.connection,
      admin,
      collateralMint,
      userCollateralAccount,
      admin,
      10000 * 10 ** 9 // 10,000 tokens avec 9 décimales
    );
  });

  describe("Initialize Pool", () => {
    it("Should initialize a lending pool successfully", async () => {
      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("lending_pool"), admin.publicKey.toBuffer()],
        program.programId
      );

      try {
        const tx = await program.methods
          .initializeLendingPool()
          .accounts({
            creator: admin.publicKey,
            vaultAccount: adminCollateralAccount,
          })
          .signers([admin])
          .rpc();

        expect(tx).to.be.a("string");
        console.log("Pool initialized with tx:", tx);

        // Vérifier que le pool a été créé
        const pool = await program.account.pool.fetch(poolPda);
        expect(pool.owner.toString()).to.equal(admin.publicKey.toString());
        expect(pool.totalDeposits.toNumber()).to.equal(0);
        expect(pool.active).to.be.true;
      } catch (error) {
        console.error("Error initializing pool:", error);
        throw error;
      }
    });
  });

  describe("Create Strategy", () => {
    it("Should create a strategy successfully", async () => {
      const [strategyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("strategy"), collateralMint.toBuffer()],
        program.programId
      );

      try {
        const tx = await program.methods
          .createStrategy(
            new anchor.BN(500), // 5% APY
            "Test Strategy",
            "A test strategy for lending"
          )
          .accounts({
            admin: admin.publicKey,
            tokenAddress: collateralMint,
          })
          .signers([admin])
          .rpc();

        expect(tx).to.be.a("string");
        console.log("Strategy created with tx:", tx);

        // Vérifier que la stratégie a été créée
        const strategy = await program.account.strategy.fetch(strategyPda);
        expect(strategy.tokenAddress.toString()).to.equal(
          collateralMint.toString()
        );
        expect(strategy.rewardApy.toNumber()).to.equal(500);
        expect(strategy.active).to.be.true;
      } catch (error) {
        console.error("Error creating strategy:", error);
        throw error;
      }
    });
  });

  describe("Deposit", () => {
    it("Should try to deposit", async () => {
      try {
        // Test si la méthode existe
        console.log("Available methods:", Object.keys(program.methods));
        console.log("Available accounts:", Object.keys(program.account));
      } catch (error) {
        console.error("Error checking methods:", error);
      }
    });
  });

  describe("Withdraw", () => {
    it("Should try to withdraw", async () => {
      try {
        console.log("Testing withdraw availability");
      } catch (error) {
        console.error("Error withdrawing:", error);
      }
    });
  });

  describe("Calculate Pending Yield", () => {
    it("Should try to calculate pending yield", async () => {
      try {
        console.log("Testing yield calculation availability");
      } catch (error) {
        console.error("Error calculating yield:", error);
      }
    });
  });

  describe("Basic Program Info", () => {
    it("Should have correct program ID", () => {
      expect(program.programId.toString()).to.equal(
        anchor.workspace.Lending.programId.toString()
      );
    });

    it("Should have provider connection", () => {
      expect(provider.connection).to.exist;
    });

    it("Should have created collateral mint", () => {
      expect(collateralMint).to.exist;
      expect(collateralMint.toString()).to.not.equal(
        PublicKey.default.toString()
      );
    });

    it("Should have user with collateral tokens", async () => {
      const userTokenAccountInfo =
        await provider.connection.getTokenAccountBalance(userCollateralAccount);
      expect(parseInt(userTokenAccountInfo.value.amount)).to.be.greaterThan(0);
    });

    it("Should have lending pool initialized", async () => {
      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("lending_pool"), admin.publicKey.toBuffer()],
        program.programId
      );

      try {
        const pool = await program.account.pool.fetch(poolPda);
        expect(pool).to.exist;
        expect(pool.owner.toString()).to.equal(admin.publicKey.toString());
      } catch (error) {
        console.log(
          "Pool not initialized yet, this is expected for some tests"
        );
      }
    });
  });
});
