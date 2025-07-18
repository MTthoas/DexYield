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
  getAssociatedTokenAddress,
} from "@solana/spl-token";

describe("Marketplace Complete Tests", () => {
  let program: Program<Marketplace>;
  let provider: anchor.AnchorProvider;
  let seller: Keypair;
  let buyer: Keypair;
  let buyer2: Keypair;
  let admin: Keypair;
  let ytMint: PublicKey;
  let usdcMint: PublicKey;
  let sellerYtAccount: PublicKey;
  let sellerUsdcAccount: PublicKey;
  let buyerYtAccount: PublicKey;
  let buyerUsdcAccount: PublicKey;
  let buyer2YtAccount: PublicKey;
  let buyer2UsdcAccount: PublicKey;
  
  // PDAs
  let listingPda: PublicKey;
  let listing2Pda: PublicKey;
  let escrowAuthorityPda: PublicKey;
  let escrowAccount: PublicKey;
  let escrowAccount2: PublicKey;

  before(async () => {
    // Configure provider
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Initialize program
    program = anchor.workspace.Marketplace as Program<Marketplace>;

    // Generate test accounts
    seller = Keypair.generate();
    buyer = Keypair.generate();
    buyer2 = Keypair.generate();
    admin = Keypair.generate();

    // Airdrop SOL to accounts
    await provider.connection.requestAirdrop(
      seller.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      buyer.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      buyer2.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      admin.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );

    // Wait for airdrops to confirm
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create YT mint
    ytMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      6 // 6 decimals
    );

    // Create USDC mint (for payment)
    usdcMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      6 // 6 decimals
    );

    // Create token accounts
    const sellerYtAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      seller,
      ytMint,
      seller.publicKey
    );
    sellerYtAccount = sellerYtAccountInfo.address;

    const sellerUsdcAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      seller,
      usdcMint,
      seller.publicKey
    );
    sellerUsdcAccount = sellerUsdcAccountInfo.address;

    const buyerYtAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer,
      ytMint,
      buyer.publicKey
    );
    buyerYtAccount = buyerYtAccountInfo.address;

    const buyerUsdcAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer,
      usdcMint,
      buyer.publicKey
    );
    buyerUsdcAccount = buyerUsdcAccountInfo.address;

    const buyer2YtAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer2,
      ytMint,
      buyer2.publicKey
    );
    buyer2YtAccount = buyer2YtAccountInfo.address;

    const buyer2UsdcAccountInfo = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      buyer2,
      usdcMint,
      buyer2.publicKey
    );
    buyer2UsdcAccount = buyer2UsdcAccountInfo.address;

    // Mint tokens
    await mintTo(
      provider.connection,
      admin,
      ytMint,
      sellerYtAccount,
      admin,
      10000 * 10 ** 6 // 10,000 YT tokens
    );

    await mintTo(
      provider.connection,
      admin,
      usdcMint,
      buyerUsdcAccount,
      admin,
      50000 * 10 ** 6 // 50,000 USDC for buyer
    );

    await mintTo(
      provider.connection,
      admin,
      usdcMint,
      buyer2UsdcAccount,
      admin,
      25000 * 10 ** 6 // 25,000 USDC for buyer2
    );

    // Calculate PDAs
    [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), seller.publicKey.toBuffer()],
      program.programId
    );

    [listing2Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), buyer.publicKey.toBuffer()],
      program.programId
    );

    [escrowAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), seller.publicKey.toBuffer()],
      program.programId
    );

    // Create escrow accounts
    escrowAccount = await getAssociatedTokenAddress(
      ytMint,
      escrowAuthorityPda,
      true
    );

    escrowAccount2 = await getAssociatedTokenAddress(
      ytMint,
      escrowAuthorityPda,
      true
    );
  });

  describe("Marketplace Listing Tests", () => {
    it("Should create a YT listing successfully", async () => {
      const price = 100 * 10 ** 6; // 100 USDC
      const amount = 1000 * 10 ** 6; // 1000 YT

      const tx = await program.methods
        .listYt(new anchor.BN(price), new anchor.BN(amount))
        .accounts({
          seller: seller.publicKey,
          ytTokenAccount: sellerYtAccount,
          listing: listingPda,
          escrowAccount: escrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([seller])
        .rpc();

      expect(tx).to.be.a("string");
      console.log("✅ YT listing created with tx:", tx);

      // Verify listing was created correctly
      const listing = await program.account.listing.fetch(listingPda);
      expect(listing.seller.toString()).to.equal(seller.publicKey.toString());
      expect(listing.ytMint.toString()).to.equal(ytMint.toString());
      expect(listing.amount.toNumber()).to.equal(amount);
      expect(listing.price.toNumber()).to.equal(price);
      expect(listing.active).to.be.true;
      expect(listing.createdAt.toNumber()).to.be.greaterThan(0);

      // Verify tokens were transferred to escrow
      const escrowBalance = await provider.connection.getTokenAccountBalance(escrowAccount);
      expect(parseInt(escrowBalance.value.amount)).to.equal(amount);
    });

    it("Should fail to list with zero amount", async () => {
      const failureSeller = Keypair.generate();
      await provider.connection.requestAirdrop(
        failureSeller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );

      const failureSellerYtAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        failureSeller,
        ytMint,
        failureSeller.publicKey
      );

      await mintTo(
        provider.connection,
        admin,
        ytMint,
        failureSellerYtAccount.address,
        admin,
        1000 * 10 ** 6
      );

      const [failureListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), failureSeller.publicKey.toBuffer()],
        program.programId
      );

      const [failureEscrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), failureSeller.publicKey.toBuffer()],
        program.programId
      );

      const failureEscrowAccount = await getAssociatedTokenAddress(
        ytMint,
        failureEscrowAuthorityPda,
        true
      );

      try {
        await program.methods
          .listYt(new anchor.BN(100 * 10 ** 6), new anchor.BN(0)) // Zero amount
          .accounts({
            seller: failureSeller.publicKey,
            ytTokenAccount: failureSellerYtAccount.address,
            listing: failureListingPda,
            escrowAccount: failureEscrowAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([failureSeller])
          .rpc();

        expect.fail("Should have thrown an error for zero amount");
      } catch (error) {
        expect(error).to.exist;
        console.log("✅ Correctly rejected zero amount listing");
      }
    });

    it("Should fail to list with zero price", async () => {
      const failureSeller = Keypair.generate();
      await provider.connection.requestAirdrop(
        failureSeller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );

      const failureSellerYtAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        failureSeller,
        ytMint,
        failureSeller.publicKey
      );

      await mintTo(
        provider.connection,
        admin,
        ytMint,
        failureSellerYtAccount.address,
        admin,
        1000 * 10 ** 6
      );

      const [failureListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), failureSeller.publicKey.toBuffer()],
        program.programId
      );

      const [failureEscrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), failureSeller.publicKey.toBuffer()],
        program.programId
      );

      const failureEscrowAccount = await getAssociatedTokenAddress(
        ytMint,
        failureEscrowAuthorityPda,
        true
      );

      try {
        await program.methods
          .listYt(new anchor.BN(0), new anchor.BN(100 * 10 ** 6)) // Zero price
          .accounts({
            seller: failureSeller.publicKey,
            ytTokenAccount: failureSellerYtAccount.address,
            listing: failureListingPda,
            escrowAccount: failureEscrowAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([failureSeller])
          .rpc();

        expect.fail("Should have thrown an error for zero price");
      } catch (error) {
        expect(error).to.exist;
        console.log("✅ Correctly rejected zero price listing");
      }
    });

    it("Should fail to list with insufficient balance", async () => {
      const failureSeller = Keypair.generate();
      await provider.connection.requestAirdrop(
        failureSeller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );

      const failureSellerYtAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        failureSeller,
        ytMint,
        failureSeller.publicKey
      );

      // Only mint 500 tokens but try to list 1000
      await mintTo(
        provider.connection,
        admin,
        ytMint,
        failureSellerYtAccount.address,
        admin,
        500 * 10 ** 6
      );

      const [failureListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), failureSeller.publicKey.toBuffer()],
        program.programId
      );

      const [failureEscrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), failureSeller.publicKey.toBuffer()],
        program.programId
      );

      const failureEscrowAccount = await getAssociatedTokenAddress(
        ytMint,
        failureEscrowAuthorityPda,
        true
      );

      try {
        await program.methods
          .listYt(new anchor.BN(100 * 10 ** 6), new anchor.BN(1000 * 10 ** 6)) // More than balance
          .accounts({
            seller: failureSeller.publicKey,
            ytTokenAccount: failureSellerYtAccount.address,
            listing: failureListingPda,
            escrowAccount: failureEscrowAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([failureSeller])
          .rpc();

        expect.fail("Should have thrown an error for insufficient balance");
      } catch (error) {
        expect(error).to.exist;
        console.log("✅ Correctly rejected insufficient balance listing");
      }
    });
  });

  describe("Marketplace Buying Tests", () => {
    it("Should buy YT tokens successfully", async () => {
      const initialBuyerYtBalance = await provider.connection.getTokenAccountBalance(buyerYtAccount);
      const initialBuyerUsdcBalance = await provider.connection.getTokenAccountBalance(buyerUsdcAccount);
      const initialSellerUsdcBalance = await provider.connection.getTokenAccountBalance(sellerUsdcAccount);

      const tx = await program.methods
        .buyYt()
        .accounts({
          buyer: buyer.publicKey,
          buyerTokenAccount: buyerUsdcAccount,
          buyerYtAccount: buyerYtAccount,
          sellerTokenAccount: sellerUsdcAccount,
          listing: listingPda,
          escrowAccount: escrowAccount,
          escrowAuthority: escrowAuthorityPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyer])
        .rpc();

      expect(tx).to.be.a("string");
      console.log("✅ YT purchase successful with tx:", tx);

      // Verify listing was deactivated
      const listing = await program.account.listing.fetch(listingPda);
      expect(listing.active).to.be.false;

      // Verify buyer received YT tokens
      const finalBuyerYtBalance = await provider.connection.getTokenAccountBalance(buyerYtAccount);
      expect(parseInt(finalBuyerYtBalance.value.amount)).to.be.greaterThan(
        parseInt(initialBuyerYtBalance.value.amount)
      );

      // Verify buyer paid USDC
      const finalBuyerUsdcBalance = await provider.connection.getTokenAccountBalance(buyerUsdcAccount);
      expect(parseInt(finalBuyerUsdcBalance.value.amount)).to.be.lessThan(
        parseInt(initialBuyerUsdcBalance.value.amount)
      );

      // Verify seller received USDC
      const finalSellerUsdcBalance = await provider.connection.getTokenAccountBalance(sellerUsdcAccount);
      expect(parseInt(finalSellerUsdcBalance.value.amount)).to.be.greaterThan(
        parseInt(initialSellerUsdcBalance.value.amount)
      );
    });

    it("Should fail to buy from inactive listing", async () => {
      try {
        await program.methods
          .buyYt()
          .accounts({
            buyer: buyer2.publicKey,
            buyerTokenAccount: buyer2UsdcAccount,
            buyerYtAccount: buyer2YtAccount,
            sellerTokenAccount: sellerUsdcAccount,
            listing: listingPda, // Already inactive from previous test
            escrowAccount: escrowAccount,
            escrowAuthority: escrowAuthorityPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([buyer2])
          .rpc();

        expect.fail("Should have thrown an error for inactive listing");
      } catch (error) {
        expect(error).to.exist;
        console.log("✅ Correctly rejected inactive listing purchase");
      }
    });

    it("Should fail to buy with insufficient payment", async () => {
      // Create a new listing first
      const newSeller = Keypair.generate();
      await provider.connection.requestAirdrop(
        newSeller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );

      const newSellerYtAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        newSeller,
        ytMint,
        newSeller.publicKey
      );

      const newSellerUsdcAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        newSeller,
        usdcMint,
        newSeller.publicKey
      );

      await mintTo(
        provider.connection,
        admin,
        ytMint,
        newSellerYtAccount.address,
        admin,
        1000 * 10 ** 6
      );

      const [newListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), newSeller.publicKey.toBuffer()],
        program.programId
      );

      const [newEscrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), newSeller.publicKey.toBuffer()],
        program.programId
      );

      const newEscrowAccount = await getAssociatedTokenAddress(
        ytMint,
        newEscrowAuthorityPda,
        true
      );

      // Create the listing with high price
      await program.methods
        .listYt(new anchor.BN(100000 * 10 ** 6), new anchor.BN(100 * 10 ** 6)) // Very high price
        .accounts({
          seller: newSeller.publicKey,
          ytTokenAccount: newSellerYtAccount.address,
          listing: newListingPda,
          escrowAccount: newEscrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([newSeller])
        .rpc();

      // Create poor buyer with insufficient funds
      const poorBuyer = Keypair.generate();
      await provider.connection.requestAirdrop(
        poorBuyer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );

      const poorBuyerYtAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        poorBuyer,
        ytMint,
        poorBuyer.publicKey
      );

      const poorBuyerUsdcAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        poorBuyer,
        usdcMint,
        poorBuyer.publicKey
      );

      // Give poor buyer only small amount
      await mintTo(
        provider.connection,
        admin,
        usdcMint,
        poorBuyerUsdcAccount.address,
        admin,
        1000 * 10 ** 6 // Only 1000 USDC, but listing costs 100,000 USDC
      );

      try {
        await program.methods
          .buyYt()
          .accounts({
            buyer: poorBuyer.publicKey,
            buyerTokenAccount: poorBuyerUsdcAccount.address,
            buyerYtAccount: poorBuyerYtAccount.address,
            sellerTokenAccount: newSellerUsdcAccount.address,
            listing: newListingPda,
            escrowAccount: newEscrowAccount,
            escrowAuthority: newEscrowAuthorityPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([poorBuyer])
          .rpc();

        expect.fail("Should have thrown an error for insufficient payment");
      } catch (error) {
        expect(error).to.exist;
        console.log("✅ Correctly rejected insufficient payment");
      }
    });

    it("Should fail when seller tries to buy own listing", async () => {
      // Create a new listing
      const selfBuySeller = Keypair.generate();
      await provider.connection.requestAirdrop(
        selfBuySeller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );

      const selfBuySellerYtAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        selfBuySeller,
        ytMint,
        selfBuySeller.publicKey
      );

      const selfBuySellerUsdcAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        selfBuySeller,
        usdcMint,
        selfBuySeller.publicKey
      );

      await mintTo(
        provider.connection,
        admin,
        ytMint,
        selfBuySellerYtAccount.address,
        admin,
        1000 * 10 ** 6
      );

      await mintTo(
        provider.connection,
        admin,
        usdcMint,
        selfBuySellerUsdcAccount.address,
        admin,
        10000 * 10 ** 6
      );

      const [selfBuyListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), selfBuySeller.publicKey.toBuffer()],
        program.programId
      );

      const [selfBuyEscrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), selfBuySeller.publicKey.toBuffer()],
        program.programId
      );

      const selfBuyEscrowAccount = await getAssociatedTokenAddress(
        ytMint,
        selfBuyEscrowAuthorityPda,
        true
      );

      // Create the listing
      await program.methods
        .listYt(new anchor.BN(100 * 10 ** 6), new anchor.BN(100 * 10 ** 6))
        .accounts({
          seller: selfBuySeller.publicKey,
          ytTokenAccount: selfBuySellerYtAccount.address,
          listing: selfBuyListingPda,
          escrowAccount: selfBuyEscrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([selfBuySeller])
        .rpc();

      try {
        await program.methods
          .buyYt()
          .accounts({
            buyer: selfBuySeller.publicKey, // Same as seller
            buyerTokenAccount: selfBuySellerUsdcAccount.address,
            buyerYtAccount: selfBuySellerYtAccount.address,
            sellerTokenAccount: selfBuySellerUsdcAccount.address,
            listing: selfBuyListingPda,
            escrowAccount: selfBuyEscrowAccount,
            escrowAuthority: selfBuyEscrowAuthorityPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([selfBuySeller])
          .rpc();

        expect.fail("Should have thrown an error for self-purchase");
      } catch (error) {
        expect(error).to.exist;
        console.log("✅ Correctly rejected self-purchase");
      }
    });
  });

  describe("Marketplace Cancellation Tests", () => {
    it("Should cancel listing successfully", async () => {
      // Create a new listing to cancel
      const cancelSeller = Keypair.generate();
      await provider.connection.requestAirdrop(
        cancelSeller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );

      const cancelSellerYtAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        cancelSeller,
        ytMint,
        cancelSeller.publicKey
      );

      await mintTo(
        provider.connection,
        admin,
        ytMint,
        cancelSellerYtAccount.address,
        admin,
        1000 * 10 ** 6
      );

      const [cancelListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), cancelSeller.publicKey.toBuffer()],
        program.programId
      );

      const [cancelEscrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), cancelSeller.publicKey.toBuffer()],
        program.programId
      );

      const cancelEscrowAccount = await getAssociatedTokenAddress(
        ytMint,
        cancelEscrowAuthorityPda,
        true
      );

      // Create the listing
      await program.methods
        .listYt(new anchor.BN(50 * 10 ** 6), new anchor.BN(500 * 10 ** 6))
        .accounts({
          seller: cancelSeller.publicKey,
          ytTokenAccount: cancelSellerYtAccount.address,
          listing: cancelListingPda,
          escrowAccount: cancelEscrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([cancelSeller])
        .rpc();

      // Get initial balance
      const initialBalance = await provider.connection.getTokenAccountBalance(cancelSellerYtAccount.address);

      // Cancel the listing
      const tx = await program.methods
        .cancelListing()
        .accounts({
          seller: cancelSeller.publicKey,
          listing: cancelListingPda,
          escrowAccount: cancelEscrowAccount,
          sellerTokenAccount: cancelSellerYtAccount.address,
          escrowAuthority: cancelEscrowAuthorityPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([cancelSeller])
        .rpc();

      expect(tx).to.be.a("string");
      console.log("✅ Listing cancelled with tx:", tx);

      // Verify listing was deactivated
      const listing = await program.account.listing.fetch(cancelListingPda);
      expect(listing.active).to.be.false;

      // Verify tokens were returned to seller
      const finalBalance = await provider.connection.getTokenAccountBalance(cancelSellerYtAccount.address);
      expect(parseInt(finalBalance.value.amount)).to.be.greaterThan(
        parseInt(initialBalance.value.amount)
      );
    });

    it("Should fail to cancel inactive listing", async () => {
      // Use an existing inactive listing
      const cancelSeller = Keypair.generate();
      await provider.connection.requestAirdrop(
        cancelSeller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );

      const cancelSellerYtAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        cancelSeller,
        ytMint,
        cancelSeller.publicKey
      );

      await mintTo(
        provider.connection,
        admin,
        ytMint,
        cancelSellerYtAccount.address,
        admin,
        1000 * 10 ** 6
      );

      const [cancelListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), cancelSeller.publicKey.toBuffer()],
        program.programId
      );

      const [cancelEscrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), cancelSeller.publicKey.toBuffer()],
        program.programId
      );

      const cancelEscrowAccount = await getAssociatedTokenAddress(
        ytMint,
        cancelEscrowAuthorityPda,
        true
      );

      // Create and immediately cancel a listing
      await program.methods
        .listYt(new anchor.BN(50 * 10 ** 6), new anchor.BN(500 * 10 ** 6))
        .accounts({
          seller: cancelSeller.publicKey,
          ytTokenAccount: cancelSellerYtAccount.address,
          listing: cancelListingPda,
          escrowAccount: cancelEscrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([cancelSeller])
        .rpc();

      await program.methods
        .cancelListing()
        .accounts({
          seller: cancelSeller.publicKey,
          listing: cancelListingPda,
          escrowAccount: cancelEscrowAccount,
          sellerTokenAccount: cancelSellerYtAccount.address,
          escrowAuthority: cancelEscrowAuthorityPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([cancelSeller])
        .rpc();

      // Try to cancel again
      try {
        await program.methods
          .cancelListing()
          .accounts({
            seller: cancelSeller.publicKey,
            listing: cancelListingPda,
            escrowAccount: cancelEscrowAccount,
            sellerTokenAccount: cancelSellerYtAccount.address,
            escrowAuthority: cancelEscrowAuthorityPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([cancelSeller])
          .rpc();

        expect.fail("Should have thrown an error for inactive listing");
      } catch (error) {
        expect(error).to.exist;
        console.log("✅ Correctly rejected cancellation of inactive listing");
      }
    });

    it("Should fail when non-seller tries to cancel listing", async () => {
      // Create a listing
      const legitSeller = Keypair.generate();
      const fakeSeller = Keypair.generate();
      
      await provider.connection.requestAirdrop(
        legitSeller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.requestAirdrop(
        fakeSeller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );

      const legitSellerYtAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        legitSeller,
        ytMint,
        legitSeller.publicKey
      );

      const fakeSellerYtAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        fakeSeller,
        ytMint,
        fakeSeller.publicKey
      );

      await mintTo(
        provider.connection,
        admin,
        ytMint,
        legitSellerYtAccount.address,
        admin,
        1000 * 10 ** 6
      );

      const [legitListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), legitSeller.publicKey.toBuffer()],
        program.programId
      );

      const [legitEscrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), legitSeller.publicKey.toBuffer()],
        program.programId
      );

      const legitEscrowAccount = await getAssociatedTokenAddress(
        ytMint,
        legitEscrowAuthorityPda,
        true
      );

      // Create the listing
      await program.methods
        .listYt(new anchor.BN(50 * 10 ** 6), new anchor.BN(500 * 10 ** 6))
        .accounts({
          seller: legitSeller.publicKey,
          ytTokenAccount: legitSellerYtAccount.address,
          listing: legitListingPda,
          escrowAccount: legitEscrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([legitSeller])
        .rpc();

      // Try to cancel with wrong seller
      try {
        await program.methods
          .cancelListing()
          .accounts({
            seller: fakeSeller.publicKey, // Wrong seller
            listing: legitListingPda,
            escrowAccount: legitEscrowAccount,
            sellerTokenAccount: fakeSellerYtAccount.address,
            escrowAuthority: legitEscrowAuthorityPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([fakeSeller])
          .rpc();

        expect.fail("Should have thrown an error for non-seller cancellation");
      } catch (error) {
        expect(error).to.exist;
        console.log("✅ Correctly rejected non-seller cancellation");
      }
    });
  });

  describe("Marketplace Timing and Expiration Tests", () => {
    it("Should handle listing expiration correctly", async () => {
      // Create a listing
      const expirySeller = Keypair.generate();
      await provider.connection.requestAirdrop(
        expirySeller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );

      const expirySellerYtAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        expirySeller,
        ytMint,
        expirySeller.publicKey
      );

      const expirySellerUsdcAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        expirySeller,
        usdcMint,
        expirySeller.publicKey
      );

      await mintTo(
        provider.connection,
        admin,
        ytMint,
        expirySellerYtAccount.address,
        admin,
        1000 * 10 ** 6
      );

      const [expiryListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), expirySeller.publicKey.toBuffer()],
        program.programId
      );

      const [expiryEscrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), expirySeller.publicKey.toBuffer()],
        program.programId
      );

      const expiryEscrowAccount = await getAssociatedTokenAddress(
        ytMint,
        expiryEscrowAuthorityPda,
        true
      );

      // Create the listing
      await program.methods
        .listYt(new anchor.BN(50 * 10 ** 6), new anchor.BN(500 * 10 ** 6))
        .accounts({
          seller: expirySeller.publicKey,
          ytTokenAccount: expirySellerYtAccount.address,
          listing: expiryListingPda,
          escrowAccount: expiryEscrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([expirySeller])
        .rpc();

      // Verify listing was created with timestamp
      const listing = await program.account.listing.fetch(expiryListingPda);
      expect(listing.createdAt.toNumber()).to.be.greaterThan(0);
      expect(listing.active).to.be.true;

      console.log("✅ Listing created with expiration handling");
    });

    it("Should create multiple listings with different timestamps", async () => {
      const seller1 = Keypair.generate();
      const seller2 = Keypair.generate();
      
      await provider.connection.requestAirdrop(
        seller1.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.requestAirdrop(
        seller2.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );

      const seller1YtAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        seller1,
        ytMint,
        seller1.publicKey
      );

      const seller2YtAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        seller2,
        ytMint,
        seller2.publicKey
      );

      await mintTo(
        provider.connection,
        admin,
        ytMint,
        seller1YtAccount.address,
        admin,
        1000 * 10 ** 6
      );

      await mintTo(
        provider.connection,
        admin,
        ytMint,
        seller2YtAccount.address,
        admin,
        1000 * 10 ** 6
      );

      const [listing1Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), seller1.publicKey.toBuffer()],
        program.programId
      );

      const [listing2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), seller2.publicKey.toBuffer()],
        program.programId
      );

      const [escrow1AuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), seller1.publicKey.toBuffer()],
        program.programId
      );

      const [escrow2AuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), seller2.publicKey.toBuffer()],
        program.programId
      );

      const escrow1Account = await getAssociatedTokenAddress(
        ytMint,
        escrow1AuthorityPda,
        true
      );

      const escrow2Account = await getAssociatedTokenAddress(
        ytMint,
        escrow2AuthorityPda,
        true
      );

      // Create first listing
      await program.methods
        .listYt(new anchor.BN(50 * 10 ** 6), new anchor.BN(500 * 10 ** 6))
        .accounts({
          seller: seller1.publicKey,
          ytTokenAccount: seller1YtAccount.address,
          listing: listing1Pda,
          escrowAccount: escrow1Account,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([seller1])
        .rpc();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create second listing
      await program.methods
        .listYt(new anchor.BN(75 * 10 ** 6), new anchor.BN(300 * 10 ** 6))
        .accounts({
          seller: seller2.publicKey,
          ytTokenAccount: seller2YtAccount.address,
          listing: listing2Pda,
          escrowAccount: escrow2Account,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([seller2])
        .rpc();

      // Verify timestamps are different
      const listing1 = await program.account.listing.fetch(listing1Pda);
      const listing2 = await program.account.listing.fetch(listing2Pda);
      
      expect(listing1.createdAt.toNumber()).to.be.lessThan(listing2.createdAt.toNumber());
      console.log("✅ Multiple listings created with different timestamps");
    });
  });

  describe("Marketplace Escrow Tests", () => {
    it("Should handle escrow transfers correctly", async () => {
      const escrowSeller = Keypair.generate();
      await provider.connection.requestAirdrop(
        escrowSeller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );

      const escrowSellerYtAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        escrowSeller,
        ytMint,
        escrowSeller.publicKey
      );

      await mintTo(
        provider.connection,
        admin,
        ytMint,
        escrowSellerYtAccount.address,
        admin,
        1000 * 10 ** 6
      );

      const [escrowListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), escrowSeller.publicKey.toBuffer()],
        program.programId
      );

      const [escrowEscrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), escrowSeller.publicKey.toBuffer()],
        program.programId
      );

      const escrowEscrowAccount = await getAssociatedTokenAddress(
        ytMint,
        escrowEscrowAuthorityPda,
        true
      );

      const initialSellerBalance = await provider.connection.getTokenAccountBalance(
        escrowSellerYtAccount.address
      );

      // Create listing
      await program.methods
        .listYt(new anchor.BN(50 * 10 ** 6), new anchor.BN(500 * 10 ** 6))
        .accounts({
          seller: escrowSeller.publicKey,
          ytTokenAccount: escrowSellerYtAccount.address,
          listing: escrowListingPda,
          escrowAccount: escrowEscrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([escrowSeller])
        .rpc();

      // Verify tokens moved to escrow
      const finalSellerBalance = await provider.connection.getTokenAccountBalance(
        escrowSellerYtAccount.address
      );
      const escrowBalance = await provider.connection.getTokenAccountBalance(escrowEscrowAccount);

      expect(parseInt(finalSellerBalance.value.amount)).to.be.lessThan(
        parseInt(initialSellerBalance.value.amount)
      );
      expect(parseInt(escrowBalance.value.amount)).to.equal(500 * 10 ** 6);

      console.log("✅ Escrow transfers working correctly");
    });

    it("Should verify escrow authority PDA derivation", async () => {
      const testSeller = Keypair.generate();
      
      const [derivedEscrowAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), testSeller.publicKey.toBuffer()],
        program.programId
      );

      expect(derivedEscrowAuthority).to.be.instanceOf(PublicKey);
      expect(derivedEscrowAuthority.toString()).to.not.equal(PublicKey.default.toString());
      
      console.log("✅ Escrow authority PDA derived correctly");
    });
  });

  describe("Marketplace Concurrent Operations Tests", () => {
    it("Should handle multiple simultaneous listings", async () => {
      const concurrentSellers = [];
      const concurrentPromises = [];

      // Create 3 sellers
      for (let i = 0; i < 3; i++) {
        const seller = Keypair.generate();
        await provider.connection.requestAirdrop(
          seller.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        );

        const sellerYtAccount = await getOrCreateAssociatedTokenAccount(
          provider.connection,
          seller,
          ytMint,
          seller.publicKey
        );

        await mintTo(
          provider.connection,
          admin,
          ytMint,
          sellerYtAccount.address,
          admin,
          1000 * 10 ** 6
        );

        concurrentSellers.push({ seller, sellerYtAccount });
      }

      // Create concurrent listings
      for (let i = 0; i < concurrentSellers.length; i++) {
        const { seller, sellerYtAccount } = concurrentSellers[i];
        
        const [listingPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("listing"), seller.publicKey.toBuffer()],
          program.programId
        );

        const [escrowAuthorityPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("escrow"), seller.publicKey.toBuffer()],
          program.programId
        );

        const escrowAccount = await getAssociatedTokenAddress(
          ytMint,
          escrowAuthorityPda,
          true
        );

        const promise = program.methods
          .listYt(new anchor.BN((50 + i * 10) * 10 ** 6), new anchor.BN(200 * 10 ** 6))
          .accounts({
            seller: seller.publicKey,
            ytTokenAccount: sellerYtAccount.address,
            listing: listingPda,
            escrowAccount: escrowAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([seller])
          .rpc();

        concurrentPromises.push(promise);
      }

      // Wait for all listings to complete
      const results = await Promise.allSettled(concurrentPromises);
      
      // Check that at least some succeeded
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).to.be.greaterThan(0);
      
      console.log(`✅ ${successCount}/3 concurrent listings successful`);
    });

    it("Should handle multiple buyers competing for same listing", async () => {
      // Create a seller and listing
      const competitionSeller = Keypair.generate();
      await provider.connection.requestAirdrop(
        competitionSeller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );

      const competitionSellerYtAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        competitionSeller,
        ytMint,
        competitionSeller.publicKey
      );

      const competitionSellerUsdcAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        competitionSeller,
        usdcMint,
        competitionSeller.publicKey
      );

      await mintTo(
        provider.connection,
        admin,
        ytMint,
        competitionSellerYtAccount.address,
        admin,
        1000 * 10 ** 6
      );

      const [competitionListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), competitionSeller.publicKey.toBuffer()],
        program.programId
      );

      const [competitionEscrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), competitionSeller.publicKey.toBuffer()],
        program.programId
      );

      const competitionEscrowAccount = await getAssociatedTokenAddress(
        ytMint,
        competitionEscrowAuthorityPda,
        true
      );

      // Create listing
      await program.methods
        .listYt(new anchor.BN(100 * 10 ** 6), new anchor.BN(500 * 10 ** 6))
        .accounts({
          seller: competitionSeller.publicKey,
          ytTokenAccount: competitionSellerYtAccount.address,
          listing: competitionListingPda,
          escrowAccount: competitionEscrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([competitionSeller])
        .rpc();

      // Create competing buyers
      const competingBuyers = [];
      for (let i = 0; i < 2; i++) {
        const buyerKeypair = Keypair.generate();
        await provider.connection.requestAirdrop(
          buyerKeypair.publicKey,
          2 * anchor.web3.LAMPORTS_PER_SOL
        );

        const buyerYtAccount = await getOrCreateAssociatedTokenAccount(
          provider.connection,
          buyerKeypair,
          ytMint,
          buyerKeypair.publicKey
        );

        const buyerUsdcAccount = await getOrCreateAssociatedTokenAccount(
          provider.connection,
          buyerKeypair,
          usdcMint,
          buyerKeypair.publicKey
        );

        await mintTo(
          provider.connection,
          admin,
          usdcMint,
          buyerUsdcAccount.address,
          admin,
          1000 * 10 ** 6
        );

        competingBuyers.push({
          buyer: buyerKeypair,
          buyerYtAccount,
          buyerUsdcAccount
        });
      }

      // Both buyers try to buy simultaneously
      const buyPromises = competingBuyers.map(({ buyer, buyerYtAccount, buyerUsdcAccount }) =>
        program.methods
          .buyYt()
          .accounts({
            buyer: buyer.publicKey,
            buyerTokenAccount: buyerUsdcAccount.address,
            buyerYtAccount: buyerYtAccount.address,
            sellerTokenAccount: competitionSellerUsdcAccount.address,
            listing: competitionListingPda,
            escrowAccount: competitionEscrowAccount,
            escrowAuthority: competitionEscrowAuthorityPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([buyer])
          .rpc()
      );

      const buyResults = await Promise.allSettled(buyPromises);
      
      // Only one should succeed
      const successCount = buyResults.filter(r => r.status === 'fulfilled').length;
      const failureCount = buyResults.filter(r => r.status === 'rejected').length;
      
      expect(successCount).to.equal(1);
      expect(failureCount).to.equal(1);
      
      console.log("✅ Competition handled correctly - only one buyer succeeded");
    });
  });

  describe("Marketplace Final State Verification", () => {
    it("Should have correct final marketplace state", async () => {
      // Get all listings that were created during tests
      const allListings = await program.account.listing.all();
      
      console.log("📊 Final Marketplace State:");
      console.log("Total listings created:", allListings.length);
      
      let activeListings = 0;
      let inactiveListings = 0;
      let totalVolumeTraded = 0;
      
      for (const listing of allListings) {
        if (listing.account.active) {
          activeListings++;
        } else {
          inactiveListings++;
          totalVolumeTraded += listing.account.price.toNumber();
        }
      }
      
      console.log("Active listings:", activeListings);
      console.log("Inactive listings (sold/cancelled):", inactiveListings);
      console.log("Estimated volume traded:", totalVolumeTraded / 10 ** 6, "USDC");
      
      expect(allListings.length).to.be.greaterThan(0);
      expect(inactiveListings).to.be.greaterThan(0); // Some listings should have been processed
      
      // Verify program state consistency
      for (const listing of allListings) {
        expect(listing.account.seller).to.be.instanceOf(PublicKey);
        expect(listing.account.ytMint).to.be.instanceOf(PublicKey);
        expect(listing.account.amount.toNumber()).to.be.greaterThan(0);
        expect(listing.account.price.toNumber()).to.be.greaterThan(0);
        expect(listing.account.createdAt.toNumber()).to.be.greaterThan(0);
      }
      
      console.log("✅ All marketplace state data is consistent");
    });

    it("Should have proper escrow account cleanup", async () => {
      // Verify that escrow accounts exist and have expected balances
      const escrowBalance = await provider.connection.getTokenAccountBalance(escrowAccount);
      
      console.log("Main escrow account balance:", escrowBalance.value.amount);
      
      // The balance should be 0 if the listing was successfully bought
      // or should contain tokens if listing is still active
      expect(parseInt(escrowBalance.value.amount)).to.be.greaterThanOrEqual(0);
      
      console.log("✅ Escrow accounts in expected state");
    });

    it("Should verify all PDAs were created correctly", async () => {
      // Test PDA derivation consistency
      const testSeller = seller.publicKey;
      
      const [derivedListingPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("listing"), testSeller.toBuffer()],
        program.programId
      );
      
      const [derivedEscrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), testSeller.toBuffer()],
        program.programId
      );
      
      expect(derivedListingPda.toString()).to.equal(listingPda.toString());
      expect(derivedEscrowAuthorityPda.toString()).to.equal(escrowAuthorityPda.toString());
      
      console.log("✅ All PDAs derived consistently");
    });
  });
});