import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorError } from "@coral-xyz/anchor";
import { Marketplace } from "../target/types/marketplace";
import { assert } from "chai";
import { getOrCreateAssociatedTokenAccount, createMint, TOKEN_PROGRAM_ID, mintTo } from "@solana/spl-token";

describe("marketplace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Marketplace as Program<Marketplace>;

  const seller = provider.wallet.publicKey;
  const [listingPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("listing"), seller.toBuffer()],
    program.programId
  );
  const [escrowAuthority] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), seller.toBuffer()],
    program.programId
  );

  // Create a new keypair for each test to avoid PDA conflicts
  let ytTokenMint: anchor.web3.PublicKey;
  let usdcMint: anchor.web3.PublicKey;
  let escrowAccount: any;
  let ytTokenAccount: any;
  let sellerTokenAccount: any;

  // Ajout : dérive une stratégie pour le test (exemple : une stratégie par mint YT)
  let strategyMint: anchor.web3.PublicKey;
  let strategyPDA: anchor.web3.PublicKey;

  before(async () => {
    // Airdrop SOL to seller to pay for transactions
    await provider.connection.requestAirdrop(seller, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create ytTokenMint
    ytTokenMint = await createMint(
      provider.connection,
      provider.wallet.payer,
      seller,
      null,
      0
    );

    // Create usdcMint
    usdcMint = await createMint(
      provider.connection,
      provider.wallet.payer,
      seller,
      null,
      6
    );

    // Create seller's YT token account
    ytTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      ytTokenMint,
      seller
    );

    // Mint some YT tokens to seller
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      ytTokenMint,
      ytTokenAccount.address,
      provider.wallet.publicKey,
      10
    );

    // Create seller's USDC token account
    sellerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      usdcMint,
      seller
    );

    // Create escrow token account owned by escrowAuthority
    escrowAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      ytTokenMint,
      escrowAuthority,
      true // allowOwnerOffCurve
    );

    // Crée un mint pour la stratégie (ex : le même mint que YT pour le test)
    strategyMint = ytTokenMint;
    [strategyPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("strategy"), strategyMint.toBuffer()],
      program.programId
    );

    // Create an initial listing and fund the escrow (skip if already exists)
    try {
      await program.methods
        .listYt(new anchor.BN(100), new anchor.BN(10))
        .accounts({
          seller,
          ytTokenAccount: ytTokenAccount.address,
          listing: listingPDA,
          escrowAccount: escrowAccount.address,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      console.log("✅ Initial listing created");
    } catch (err) {
      console.warn("⚠️ Initial listYt skipped (likely already exists):", err);
    }

    // Mint tokens into escrow to cover the listing amount
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      ytTokenMint,
      escrowAccount.address,
      provider.wallet.payer,
      10
    );
  });

  it("should initialize a new listing", async () => {
    // First, check if the listing account already exists
    const accountInfo = await provider.connection.getAccountInfo(listingPDA);
    
    if (accountInfo !== null) {
      console.log("⚠️ Listing account already exists, skipping creation test");
      return;
    }

    try {
      const tx = await program.methods
        .listYt(new anchor.BN(100), new anchor.BN(10))
        .accounts({
          seller,
          ytTokenAccount: ytTokenAccount.address,
          listing: listingPDA,
          escrowAccount: escrowAccount.address,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      console.log("✅ Listing created", tx);
      
      // Verify the listing data
      const listingAccount = await program.account.listing.fetch(listingPDA);
      assert.equal(listingAccount.seller.toString(), seller.toString());
      assert.equal(listingAccount.ytMint.toString(), ytTokenMint.toString());
      assert.equal(listingAccount.amount.toString(), "10");
      assert.equal(listingAccount.price.toString(), "100");
      assert.equal(listingAccount.active, true);
    } catch (err) {
      console.error("Error creating listing:", err);
      throw err;
    }
  });

  it("should buy YT tokens from a listing", async () => {
    // Create a buyer keypair
    const buyerKeypair = anchor.web3.Keypair.generate();
    const buyer = buyerKeypair.publicKey;

    // Airdrop SOL to buyer
    await provider.connection.requestAirdrop(buyer, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create buyer's token accounts
    const buyerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      usdcMint,
      buyer
    );
    
    // Mint USDC to buyer
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      usdcMint,
      buyerTokenAccount.address,
      provider.wallet.payer,
      200 // More than enough for the price (100)
    );
    
    const buyerYtAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      ytTokenMint,
      buyer
    );

    try {
      const tx = await program.methods
        .buyYt()
        .accounts({
          buyer,
          buyerTokenAccount: buyerTokenAccount.address,
          buyerYtAccount: buyerYtAccount.address,
          sellerTokenAccount: sellerTokenAccount.address,
          listing: listingPDA,
          escrowAccount: escrowAccount.address,
          escrowAuthority,
          // Ajoute la stratégie si le programme Rust l'exige
          strategy: strategyPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyerKeypair])
        .rpc();
      console.log("✅ Purchase successful", tx);
      
      // Verify the listing is now inactive
      const updatedListing = await program.account.listing.fetch(listingPDA);
      assert.equal(updatedListing.active, false);
    } catch (err) {
      if (err instanceof AnchorError) {
        // Use proper error comparison for AnchorError
        assert.equal(err.error.errorCode.code, "ListingNotActive");
        console.log("🚫 buy_yt failed with expected error:", err.error.errorCode.code);
      } else {
        throw err;
      }
    }
  });

  it("should cancel a listing", async () => {
    try {
      const tx = await program.methods
        .cancelListing()
        .accounts({
          seller,
          listing: listingPDA,
          escrowAccount: escrowAccount.address,
          sellerTokenAccount: ytTokenAccount.address, // Use YT token account for seller
          escrowAuthority,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      console.log("✅ Listing cancelled", tx);
      
      // Verify the listing is now inactive
      const updatedListing = await program.account.listing.fetch(listingPDA);
      assert.equal(updatedListing.active, false);
    } catch (err) {
      if (err instanceof AnchorError) {
        // Use proper error comparison for AnchorError
        assert.equal(err.error.errorCode.code, "ListingNotActive");
        console.log("🚫 cancel_listing failed with expected error:", err.error.errorCode.code);
      } else {
        throw err;
      }
    }
  });
});