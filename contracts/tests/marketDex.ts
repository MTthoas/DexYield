import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Marketplace } from "../target/types/marketplace";
import { assert } from "chai";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

describe("marketplace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Marketplace as Program<Marketplace>;

  it("list_yt", async () => {
    const seller = provider.wallet.publicKey;

    // Assume ytTokenMint is created and available
    const ytTokenMint = anchor.web3.Keypair.generate();
    // Create seller's YT token account
    const ytTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      ytTokenMint.publicKey,
      seller
    );
    // Create escrow token account (PDA)
    const [escrowAccount, _escrowBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), seller.toBuffer()],
      program.programId
    );

    const [listingPDA, _listingBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), seller.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .listYt(new anchor.BN(100), new anchor.BN(10))
      .accounts({
        seller,
        ytTokenAccount: ytTokenAccount.address,
        listing: listingPDA,
        escrowAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Listing créé", tx);
  });

  it("buy_yt", async () => {
    const buyer = provider.wallet.publicKey;
    const seller = buyer; // For local test, same wallet

    // Assume token mints are created and available
    const ytTokenMint = anchor.web3.Keypair.generate();
    const usdcMint = anchor.web3.Keypair.generate();

    // Create buyer's token accounts
    const buyerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      usdcMint.publicKey,
      buyer
    );
    const buyerYtAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      ytTokenMint.publicKey,
      buyer
    );

    // Create seller's token account
    const sellerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      usdcMint.publicKey,
      seller
    );

    // PDA accounts
    const [listingPDA, _listingBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), seller.toBuffer()],
      program.programId
    );

    const [escrowAuthority, _escrowBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), seller.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .buyYt()
      .accounts({
        buyer,
        buyerTokenAccount: buyerTokenAccount.address,
        buyerYtAccount: buyerYtAccount.address,
        sellerTokenAccount: sellerTokenAccount.address,
        listing: listingPDA,
        escrowAccount: escrowAuthority,
        escrowAuthority,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("✅ Achat effectué", tx);
  });

  it("cancel_listing", async () => {
    const seller = provider.wallet.publicKey;

    // Assume token mints are created and available
    const ytTokenMint = anchor.web3.Keypair.generate();
    const usdcMint = anchor.web3.Keypair.generate();

    // Seller token account
    const sellerTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      usdcMint.publicKey,
      seller
    );

    // PDA accounts
    const [listingPDA, _listingBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), seller.toBuffer()],
      program.programId
    );

    const [escrowAuthority, _escrowBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), seller.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .cancelListing()
      .accounts({
        seller,
        listing: listingPDA,
        escrowAccount: escrowAuthority,
        sellerTokenAccount: sellerTokenAccount.address,
        escrowAuthority,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("✅ Listing annulé", tx);
  });
});