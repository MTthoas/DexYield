import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Marketplace } from "../target/types/marketplace";
import { Lending } from "../target/types/lending";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  createMint,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";

describe("🏪 Marketplace Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const marketplaceProgram = anchor.workspace
    .Marketplace as Program<Marketplace>;
  const lendingProgram = anchor.workspace.Lending as Program<Lending>;

  const seller = provider.wallet.publicKey;
  const buyer = Keypair.generate();

  let usdcMint: PublicKey;
  let ytMint: PublicKey;
  let strategyMint: PublicKey;

  let sellerUsdcAccount: any;
  let sellerYtAccount: any;
  let buyerUsdcAccount: any;
  let buyerYtAccount: any;
  let escrowAccount: any;

  let poolPDA: PublicKey;
  let strategyPDA: PublicKey;
  let listingPDA: PublicKey;
  let escrowAuthorityPDA: PublicKey;
  let poolAuthorityPDA: PublicKey;

  before("🔧 Setup", async () => {
    console.log("🚀 Configuration marketplace...");

    const signature = await provider.connection.requestAirdrop(
      buyer.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    usdcMint = await createMint(
      provider.connection,
      provider.wallet.payer,
      seller,
      null,
      6
    );

    strategyMint = await createMint(
      provider.connection,
      provider.wallet.payer,
      seller,
      null,
      6
    );

    [poolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("lending_pool"), seller.toBuffer()],
      lendingProgram.programId
    );

    [strategyPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("strategy"), strategyMint.toBuffer()],
      lendingProgram.programId
    );

    [poolAuthorityPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("authority"), poolPDA.toBuffer()],
      lendingProgram.programId
    );

    [listingPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("listing"), seller.toBuffer()],
      marketplaceProgram.programId
    );

    [escrowAuthorityPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), seller.toBuffer()],
      marketplaceProgram.programId
    );

    ytMint = await createMint(
      provider.connection,
      provider.wallet.payer,
      poolAuthorityPDA,
      null,
      9
    );

    sellerUsdcAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      usdcMint,
      seller
    );

    sellerYtAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      ytMint,
      seller
    );

    buyerUsdcAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      usdcMint,
      buyer.publicKey
    );

    buyerYtAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      ytMint,
      buyer.publicKey
    );

    escrowAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      ytMint,
      escrowAuthorityPDA,
      true
    );

    await mintTo(
      provider.connection,
      provider.wallet.payer,
      usdcMint,
      sellerUsdcAccount.address,
      seller,
      1000 * 1000000
    );

    await mintTo(
      provider.connection,
      provider.wallet.payer,
      usdcMint,
      buyerUsdcAccount.address,
      seller,
      500 * 1000000
    );

    // Simuler que le seller a des YT
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      ytMint,
      sellerYtAccount.address,
      poolAuthorityPDA,
      100 * 1000000000,
      [provider.wallet.payer]
    );

    console.log("✅ Setup marketplace terminé");
  });

  describe("🏷️ Listings", () => {
    it("Liste des YT", async () => {
      console.log("🏷️ Création listing...");

      const listPrice = new anchor.BN(90 * 1000000);
      const listAmount = new anchor.BN(50 * 1000000000);

      await marketplaceProgram.methods
        .listYt(listPrice, listAmount)
        .accounts({
          seller: seller,
          ytTokenAccount: sellerYtAccount.address,
          listing: listingPDA,
          escrowAccount: escrowAccount.address,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const listing = await marketplaceProgram.account.listing.fetch(
        listingPDA
      );
      expect(listing.active).to.be.true;
      console.log("✅ Listing créé");
    });

    it("Achète des YT", async () => {
      console.log("🛒 Achat YT...");

      await marketplaceProgram.methods
        .buyYt()
        .accounts({
          buyer: buyer.publicKey,
          buyerTokenAccount: buyerUsdcAccount.address,
          buyerYtAccount: buyerYtAccount.address,
          sellerTokenAccount: sellerUsdcAccount.address,
          listing: listingPDA,
          escrowAccount: escrowAccount.address,
          escrowAuthority: escrowAuthorityPDA,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyer])
        .rpc();

      const listing = await marketplaceProgram.account.listing.fetch(
        listingPDA
      );
      expect(listing.active).to.be.false;
      console.log("✅ Achat réussi");
    });
  });

  after("🧹 Cleanup", async () => {
    console.log("🎉 Tests marketplace terminés!");
  });
});
