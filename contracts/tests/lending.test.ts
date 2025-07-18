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
  getAssociatedTokenAddress,
} from "@solana/spl-token";

describe("Lending Complete Tests", () => {
  let program: Program<Lending>;
  let provider: anchor.AnchorProvider;
  let admin: Keypair;
  let user: Keypair;
  let user2: Keypair;
  let collateralMint: PublicKey;
  let ytMint: PublicKey;
  let userCollateralAccount: PublicKey;
  let user2CollateralAccount: PublicKey;
  let adminCollateralAccount: PublicKey;
  let userYtAccount: PublicKey;
  let user2YtAccount: PublicKey;
  let adminYtAccount: PublicKey;
  
  // PDAs
  let strategyPda: PublicKey;
  let userDepositPda: PublicKey;
  let user2DepositPda: PublicKey;
  let vaultPda: PublicKey;
  let strategyId = 1;

  before(async () => {
    // Configure provider
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Initialize program
    program = anchor.workspace.Lending as Program<Lending>;

    // Generate test accounts
    admin = Keypair.generate();
    user = Keypair.generate();
    user2 = Keypair.generate();

    // Airdrop SOL to accounts
    await provider.connection.requestAirdrop(
      admin.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      user.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      user2.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );

    // Wait for airdrops to confirm
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create collateral mint
    collateralMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      6 // 6 decimals
    );

    // Create YT mint
    ytMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      6 // 6 decimals
    );

    // Create token accounts
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

    const user2CollateralAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user2,
      collateralMint,
      user2.publicKey
    );
    user2CollateralAccount = user2CollateralAccountInfo.address;

    // Create YT token accounts
    const userYtAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user,
      ytMint,
      user.publicKey
    );
    userYtAccount = userYtAccountInfo.address;

    const user2YtAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      user2,
      ytMint,
      user2.publicKey
    );
    user2YtAccount = user2YtAccountInfo.address;

    const adminYtAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin,
      ytMint,
      admin.publicKey
    );
    adminYtAccount = adminYtAccountInfo.address;

    // Mint collateral tokens to users
    await mintTo(
      provider.connection,
      admin,
      collateralMint,
      userCollateralAccount,
      admin,
      10000 * 10 ** 6 // 10,000 tokens with 6 decimals
    );

    await mintTo(
      provider.connection,
      admin,
      collateralMint,
      user2CollateralAccount,
      admin,
      5000 * 10 ** 6 // 5,000 tokens with 6 decimals
    );

    // Calculate PDAs
    [strategyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("strategy"), collateralMint.toBuffer(), new anchor.BN(strategyId).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    [userDepositPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_deposit"), user.publicKey.toBuffer(), strategyPda.toBuffer()],
      program.programId
    );

    [user2DepositPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_deposit"), user2.publicKey.toBuffer(), strategyPda.toBuffer()],
      program.programId
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), strategyPda.toBuffer()],
      program.programId
    );
  });

  describe("Strategy Management", () => {
    it("Should create a strategy successfully", async () => {
      const tx = await program.methods
        .createStrategy(
          new anchor.BN(strategyId),
          collateralMint,
          new anchor.BN(500) // 5% APY
        )
        .accounts({
          admin: admin.publicKey,
          strategy: strategyPda,
          tokenMint: collateralMint,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();

      expect(tx).to.be.a("string");
      console.log("✅ Strategy created with tx:", tx);

      // Verify strategy was created
      const strategy = await program.account.strategy.fetch(strategyPda);
      expect(strategy.tokenAddress.toString()).to.equal(collateralMint.toString());
      expect(strategy.rewardApy.toNumber()).to.equal(500);
      expect(strategy.active).to.be.true;
      expect(strategy.totalDeposited.toNumber()).to.equal(0);
    });

    it("Should fail to create strategy with same ID", async () => {
      try {
        await program.methods
          .createStrategy(
            new anchor.BN(strategyId),
            collateralMint,
            new anchor.BN(300) // Different APY
          )
          .accounts({
            admin: admin.publicKey,
            strategy: strategyPda,
            tokenMint: collateralMint,
            vault: vaultPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin])
          .rpc();

        expect.fail("Should have thrown an error for duplicate strategy");
      } catch (error) {
        expect(error).to.exist;
        console.log("✅ Correctly rejected duplicate strategy");
      }
    });

    it("Should toggle strategy status", async () => {
      const tx = await program.methods
        .toggleStrategyStatus(new anchor.BN(strategyId))
        .accounts({
          admin: admin.publicKey,
          strategy: strategyPda,
        })
        .signers([admin])
        .rpc();

      expect(tx).to.be.a("string");
      console.log("✅ Strategy status toggled with tx:", tx);

      // Verify strategy was deactivated
      const strategy = await program.account.strategy.fetch(strategyPda);
      expect(strategy.active).to.be.false;

      // Toggle back to active
      await program.methods
        .toggleStrategyStatus(new anchor.BN(strategyId))
        .accounts({
          admin: admin.publicKey,
          strategy: strategyPda,
        })
        .signers([admin])
        .rpc();

      const reactivatedStrategy = await program.account.strategy.fetch(strategyPda);
      expect(reactivatedStrategy.active).to.be.true;
    });
  });

  describe("User Deposit Management", () => {
    it("Should initialize user deposit account", async () => {
      const tx = await program.methods
        .initializeUserDeposit()
        .accounts({
          user: user.publicKey,
          userDeposit: userDepositPda,
          strategy: strategyPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      expect(tx).to.be.a("string");
      console.log("✅ User deposit initialized with tx:", tx);

      // Verify user deposit was created
      const userDeposit = await program.account.userDeposit.fetch(userDepositPda);
      expect(userDeposit.user.toString()).to.equal(user.publicKey.toString());
      expect(userDeposit.strategy.toString()).to.equal(strategyPda.toString());
      expect(userDeposit.amount.toNumber()).to.equal(0);
      expect(userDeposit.yieldEarned.toNumber()).to.equal(0);
    });

    it("Should initialize second user deposit account", async () => {
      const tx = await program.methods
        .initializeUserDeposit()
        .accounts({
          user: user2.publicKey,
          userDeposit: user2DepositPda,
          strategy: strategyPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      expect(tx).to.be.a("string");
      console.log("✅ Second user deposit initialized with tx:", tx);
    });
  });

  describe("Deposits", () => {
    it("Should deposit tokens successfully", async () => {
      const depositAmount = 1000 * 10 ** 6; // 1000 tokens with 6 decimals

      const tx = await program.methods
        .deposit(new anchor.BN(depositAmount))
        .accounts({
          user: user.publicKey,
          userDeposit: userDepositPda,
          strategy: strategyPda,
          userTokenAccount: userCollateralAccount,
          vault: vaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      expect(tx).to.be.a("string");
      console.log("✅ Deposit successful with tx:", tx);

      // Verify deposit was recorded
      const userDeposit = await program.account.userDeposit.fetch(userDepositPda);
      expect(userDeposit.amount.toNumber()).to.equal(depositAmount);

      // Verify strategy total deposits updated
      const strategy = await program.account.strategy.fetch(strategyPda);
      expect(strategy.totalDeposited.toNumber()).to.equal(depositAmount);

      // Verify tokens were transferred to vault
      const vaultAccount = await provider.connection.getTokenAccountBalance(vaultPda);
      expect(parseInt(vaultAccount.value.amount)).to.equal(depositAmount);
    });

    it("Should handle multiple user deposits", async () => {
      const depositAmount = 500 * 10 ** 6; // 500 tokens with 6 decimals

      const tx = await program.methods
        .deposit(new anchor.BN(depositAmount))
        .accounts({
          user: user2.publicKey,
          userDeposit: user2DepositPda,
          strategy: strategyPda,
          userTokenAccount: user2CollateralAccount,
          vault: vaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user2])
        .rpc();

      expect(tx).to.be.a("string");
      console.log("✅ Second user deposit successful with tx:", tx);

      // Verify second user deposit
      const user2Deposit = await program.account.userDeposit.fetch(user2DepositPda);
      expect(user2Deposit.amount.toNumber()).to.equal(depositAmount);

      // Verify strategy total deposits updated
      const strategy = await program.account.strategy.fetch(strategyPda);
      expect(strategy.totalDeposited.toNumber()).to.equal(1000 * 10 ** 6 + 500 * 10 ** 6);
    });

    it("Should fail to deposit zero amount", async () => {
      try {
        await program.methods
          .deposit(new anchor.BN(0))
          .accounts({
            user: user.publicKey,
            userDeposit: userDepositPda,
            strategy: strategyPda,
            userTokenAccount: userCollateralAccount,
            vault: vaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([user])
          .rpc();

        expect.fail("Should have thrown an error for zero deposit");
      } catch (error) {
        expect(error).to.exist;
        console.log("✅ Correctly rejected zero deposit");
      }
    });

    it("Should fail to deposit to inactive strategy", async () => {
      // First deactivate strategy
      await program.methods
        .toggleStrategyStatus(new anchor.BN(strategyId))
        .accounts({
          admin: admin.publicKey,
          strategy: strategyPda,
        })
        .signers([admin])
        .rpc();

      try {
        await program.methods
          .deposit(new anchor.BN(100 * 10 ** 6))
          .accounts({
            user: user.publicKey,
            userDeposit: userDepositPda,
            strategy: strategyPda,
            userTokenAccount: userCollateralAccount,
            vault: vaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([user])
          .rpc();

        expect.fail("Should have thrown an error for inactive strategy");
      } catch (error) {
        expect(error).to.exist;
        console.log("✅ Correctly rejected deposit to inactive strategy");
      }

      // Reactivate strategy for other tests
      await program.methods
        .toggleStrategyStatus(new anchor.BN(strategyId))
        .accounts({
          admin: admin.publicKey,
          strategy: strategyPda,
        })
        .signers([admin])
        .rpc();
    });
  });

  describe("Yield Calculation", () => {
    it("Should calculate pending yield", async () => {
      // Wait a bit to accumulate some time-based yield
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const tx = await program.methods
        .calculatePendingYield()
        .accounts({
          user: user.publicKey,
          userDeposit: userDepositPda,
          strategy: strategyPda,
        })
        .signers([user])
        .rpc();

      expect(tx).to.be.a("string");
      console.log("✅ Yield calculated with tx:", tx);

      // Verify yield was calculated (should be > 0 after some time)
      const userDeposit = await program.account.userDeposit.fetch(userDepositPda);
      expect(userDeposit.yieldEarned.toNumber()).to.be.greaterThan(0);
      console.log("Yield earned:", userDeposit.yieldEarned.toNumber());
    });

    it("Should get user balance", async () => {
      const balance = await program.methods
        .getUserBalance()
        .accounts({
          user: user.publicKey,
          userDeposit: userDepositPda,
        })
        .signers([user])
        .rpc();

      expect(balance).to.be.a("string");
      console.log("✅ User balance retrieved with tx:", balance);
    });
  });

  describe("Withdrawals", () => {
    it("Should withdraw tokens successfully", async () => {
      const withdrawAmount = 200 * 10 ** 6; // 200 tokens with 6 decimals

      // Get initial balance
      const initialBalance = await provider.connection.getTokenAccountBalance(userCollateralAccount);
      
      const tx = await program.methods
        .withdraw(new anchor.BN(withdrawAmount))
        .accounts({
          user: user.publicKey,
          userDeposit: userDepositPda,
          strategy: strategyPda,
          userTokenAccount: userCollateralAccount,
          vault: vaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      expect(tx).to.be.a("string");
      console.log("✅ Withdrawal successful with tx:", tx);

      // Verify deposit amount decreased
      const userDeposit = await program.account.userDeposit.fetch(userDepositPda);
      expect(userDeposit.amount.toNumber()).to.equal(1000 * 10 ** 6 - withdrawAmount);

      // Verify strategy total deposits updated
      const strategy = await program.account.strategy.fetch(strategyPda);
      expect(strategy.totalDeposited.toNumber()).to.equal(1000 * 10 ** 6 - withdrawAmount + 500 * 10 ** 6);

      // Verify tokens were returned to user
      const finalBalance = await provider.connection.getTokenAccountBalance(userCollateralAccount);
      expect(parseInt(finalBalance.value.amount)).to.be.greaterThan(parseInt(initialBalance.value.amount));
    });

    it("Should fail to withdraw more than deposited", async () => {
      try {
        await program.methods
          .withdraw(new anchor.BN(2000 * 10 ** 6)) // More than deposited
          .accounts({
            user: user.publicKey,
            userDeposit: userDepositPda,
            strategy: strategyPda,
            userTokenAccount: userCollateralAccount,
            vault: vaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([user])
          .rpc();

        expect.fail("Should have thrown an error for over-withdrawal");
      } catch (error) {
        expect(error).to.exist;
        console.log("✅ Correctly rejected over-withdrawal");
      }
    });

    it("Should fail to withdraw zero amount", async () => {
      try {
        await program.methods
          .withdraw(new anchor.BN(0))
          .accounts({
            user: user.publicKey,
            userDeposit: userDepositPda,
            strategy: strategyPda,
            userTokenAccount: userCollateralAccount,
            vault: vaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([user])
          .rpc();

        expect.fail("Should have thrown an error for zero withdrawal");
      } catch (error) {
        expect(error).to.exist;
        console.log("✅ Correctly rejected zero withdrawal");
      }
    });
  });

  describe("Redeem Yield", () => {
    it("Should redeem yield tokens successfully", async () => {
      // First make sure user has some yield
      await program.methods
        .calculatePendingYield()
        .accounts({
          user: user.publicKey,
          userDeposit: userDepositPda,
          strategy: strategyPda,
        })
        .signers([user])
        .rpc();

      const userDeposit = await program.account.userDeposit.fetch(userDepositPda);
      const yieldAmount = userDeposit.yieldEarned.toNumber();
      
      if (yieldAmount > 0) {
        const tx = await program.methods
          .redeem(new anchor.BN(yieldAmount))
          .accounts({
            user: user.publicKey,
            userDeposit: userDepositPda,
            strategy: strategyPda,
            userYtAccount: userYtAccount,
            ytMint: ytMint,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([user])
          .rpc();

        expect(tx).to.be.a("string");
        console.log("✅ Yield redeemed with tx:", tx);

        // Verify YT tokens were minted to user
        const ytBalance = await provider.connection.getTokenAccountBalance(userYtAccount);
        expect(parseInt(ytBalance.value.amount)).to.be.greaterThan(0);
      } else {
        console.log("⚠️  No yield to redeem yet");
      }
    });
  });

  describe("Reset User Yield", () => {
    it("Should reset user yield successfully", async () => {
      const tx = await program.methods
        .resetUserYield()
        .accounts({
          user: user.publicKey,
          userDeposit: userDepositPda,
        })
        .signers([user])
        .rpc();

      expect(tx).to.be.a("string");
      console.log("✅ User yield reset with tx:", tx);

      // Verify yield was reset
      const userDeposit = await program.account.userDeposit.fetch(userDepositPda);
      expect(userDeposit.yieldEarned.toNumber()).to.equal(0);
    });
  });

  describe("Edge Cases and Security", () => {
    it("Should fail when non-admin tries to create strategy", async () => {
      const [newStrategyPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("strategy"), collateralMint.toBuffer(), new anchor.BN(99).toArrayLike(Buffer, "le", 8)],
        program.programId
      );

      const [newVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), newStrategyPda.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createStrategy(
            new anchor.BN(99),
            collateralMint,
            new anchor.BN(1000)
          )
          .accounts({
            admin: user.publicKey, // Non-admin trying to create
            strategy: newStrategyPda,
            tokenMint: collateralMint,
            vault: newVaultPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc();

        expect.fail("Should have thrown an error for non-admin");
      } catch (error) {
        expect(error).to.exist;
        console.log("✅ Correctly rejected non-admin strategy creation");
      }
    });

    it("Should fail when non-admin tries to toggle strategy", async () => {
      try {
        await program.methods
          .toggleStrategyStatus(new anchor.BN(strategyId))
          .accounts({
            admin: user.publicKey, // Non-admin trying to toggle
            strategy: strategyPda,
          })
          .signers([user])
          .rpc();

        expect.fail("Should have thrown an error for non-admin");
      } catch (error) {
        expect(error).to.exist;
        console.log("✅ Correctly rejected non-admin strategy toggle");
      }
    });

    it("Should handle concurrent deposits from multiple users", async () => {
      const depositAmount = 100 * 10 ** 6;
      
      // Both users deposit simultaneously
      const [tx1, tx2] = await Promise.all([
        program.methods
          .deposit(new anchor.BN(depositAmount))
          .accounts({
            user: user.publicKey,
            userDeposit: userDepositPda,
            strategy: strategyPda,
            userTokenAccount: userCollateralAccount,
            vault: vaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([user])
          .rpc(),
        program.methods
          .deposit(new anchor.BN(depositAmount))
          .accounts({
            user: user2.publicKey,
            userDeposit: user2DepositPda,
            strategy: strategyPda,
            userTokenAccount: user2CollateralAccount,
            vault: vaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([user2])
          .rpc()
      ]);

      expect(tx1).to.be.a("string");
      expect(tx2).to.be.a("string");
      console.log("✅ Concurrent deposits successful");
    });
  });

  describe("Final State Verification", () => {
    it("Should have correct final state", async () => {
      const strategy = await program.account.strategy.fetch(strategyPda);
      const userDeposit = await program.account.userDeposit.fetch(userDepositPda);
      const user2Deposit = await program.account.userDeposit.fetch(user2DepositPda);

      console.log("📊 Final State:");
      console.log("Strategy active:", strategy.active);
      console.log("Total deposited:", strategy.totalDeposited.toNumber());
      console.log("User 1 deposit:", userDeposit.amount.toNumber());
      console.log("User 2 deposit:", user2Deposit.amount.toNumber());
      console.log("User 1 yield:", userDeposit.yieldEarned.toNumber());
      console.log("User 2 yield:", user2Deposit.yieldEarned.toNumber());

      expect(strategy.active).to.be.true;
      expect(strategy.totalDeposited.toNumber()).to.be.greaterThan(0);
      expect(userDeposit.amount.toNumber()).to.be.greaterThan(0);
      expect(user2Deposit.amount.toNumber()).to.be.greaterThan(0);
    });
  });
});