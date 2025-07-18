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

describe("Marketplace Simple Tests", () => {
  let program: Program<Marketplace>;
  let provider: anchor.AnchorProvider;
  let seller: Keypair;
  let buyer: Keypair;
  let admin: Keypair;
  let ytMint: PublicKey;
  let usdcMint: PublicKey;
  let sellerYtAccount: PublicKey;
  let sellerUsdcAccount: PublicKey;
  let buyerYtAccount: PublicKey;
  let buyerUsdcAccount: PublicKey;
  
  // PDAs
  let listingPda: PublicKey;
  let escrowAuthorityPda: PublicKey;
  let escrowAccount: PublicKey;

  before(async () => {
    // Configure provider
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    // Initialize program
    program = anchor.workspace.Marketplace as Program<Marketplace>;

    // Generate test accounts
    seller = Keypair.generate();
    buyer = Keypair.generate();
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

    // Calculate PDAs
    [listingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), seller.publicKey.toBuffer()],
      program.programId
    );

    [escrowAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), seller.publicKey.toBuffer()],
      program.programId
    );

    // Create escrow account
    escrowAccount = await getAssociatedTokenAddress(
      ytMint,
      escrowAuthorityPda,
      true
    );

    // Create the escrow token account
    try {
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        admin,
        ytMint,
        escrowAuthorityPda,
        true // allowOwnerOffCurve
      );
      console.log("✅ Escrow account created");
    } catch (error) {
      console.log("ℹ️ Escrow account may already exist or will be created on demand");
    }
  });

  describe("Core Marketplace Functionality", () => {
    it("Should create a YT listing successfully", async () => {
      const price = 100 * 10 ** 6; // 100 USDC
      const amount = 1000 * 10 ** 6; // 1000 YT

      const tx = await program.methods
        .listYt(new anchor.BN(price), new anchor.BN(amount))
        .accountsPartial({
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

    it("Should buy YT tokens successfully", async () => {
      const initialBuyerYtBalance = await provider.connection.getTokenAccountBalance(buyerYtAccount);
      const initialBuyerUsdcBalance = await provider.connection.getTokenAccountBalance(buyerUsdcAccount);
      const initialSellerUsdcBalance = await provider.connection.getTokenAccountBalance(sellerUsdcAccount);

      const tx = await program.methods
        .buyYt()
        .accountsPartial({
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

    it("Should verify escrow authority PDA derivation", async () => {
      const testSeller = seller.publicKey;
      
      const [derivedEscrowAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), testSeller.toBuffer()],
        program.programId
      );

      expect(derivedEscrowAuthority).to.be.instanceOf(PublicKey);
      expect(derivedEscrowAuthority.toString()).to.not.equal(PublicKey.default.toString());
      
      console.log("✅ Escrow authority PDA derived correctly");
    });

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
  });
});
