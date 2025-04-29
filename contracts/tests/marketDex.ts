import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Marketplace } from "../target/types/marketplace";
import { assert } from "chai";

describe("marketplace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Marketplace as Program<Marketplace>;

  it("list_yt", async () => {
    const seller = provider.wallet.publicKey;
    const ytTokenMint = anchor.web3.Keypair.generate().publicKey;
    const ytTokenAccount = anchor.web3.Keypair.generate().publicKey;
    const escrowAccount = anchor.web3.Keypair.generate().publicKey;

    const [listingPDA, _] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), seller.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .listYt(new anchor.BN(100), new anchor.BN(10))
      .accounts({
        seller,
        ytTokenAccount,
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
    const seller = buyer; // Pour le test local, même wallet
    const buyerTokenAccount = anchor.web3.Keypair.generate().publicKey;
    const buyerYtAccount = anchor.web3.Keypair.generate().publicKey;
    const sellerTokenAccount = anchor.web3.Keypair.generate().publicKey;
    const escrowAccount = anchor.web3.Keypair.generate().publicKey;

    const [listingPDA, _] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), seller.toBuffer()],
      program.programId
    );

    const [escrowAuthority, __] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), seller.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .buyYt()
      .accounts({
        buyer,
        buyerTokenAccount,
        buyerYtAccount,
        sellerTokenAccount,
        listing: listingPDA,
        escrowAccount,
        escrowAuthority,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("✅ Achat effectué", tx);
  });

  it("cancel_listing", async () => {
    const seller = provider.wallet.publicKey;
    const sellerTokenAccount = anchor.web3.Keypair.generate().publicKey;
    const escrowAccount = anchor.web3.Keypair.generate().publicKey;

    const [listingPDA, _] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), seller.toBuffer()],
      program.programId
    );

    const [escrowAuthority, __] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), seller.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .cancelListing()
      .accounts({
        seller,
        listing: listingPDA,
        escrowAccount,
        sellerTokenAccount,
        escrowAuthority,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("✅ Listing annulé", tx);
  });
});