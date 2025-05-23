// import * as anchor from "@coral-xyz/anchor";
// import { Program } from "@coral-xyz/anchor";
// import { Counter } from "../target/types/counter";
// import { PublicKey } from "@solana/web3.js";

// describe("counter", () => {
//   // Configure the client to use the local cluster.
//   const provider = anchor.AnchorProvider.env();
//   anchor.setProvider(provider);

//   const program = anchor.workspace.Counter as Program<Counter>;

//   const [counterPDA] = PublicKey.findProgramAddressSync(
//     [Buffer.from("counter")],
//     program.programId
//   );

//   it("Is initialized!", async () => {
//     try {
//       const txSig = await program.methods
//         .initialize()
//         .accounts({
//           counter: counterPDA,
//         })
//         .rpc();

//       const accountData = await program.account.counter.fetch(counterPDA);
//       console.log(`Transaction Signature: ${txSig}`);
//       console.log(`Count: ${accountData.count}`);
//     } catch (error) {
//       // If PDA Account already created, then we expect an error
//       console.log(error);
//     }
//   });

//   it("Increment", async () => {
//     const transactionSignature = await program.methods
//       .increment()
//       .accounts({
//         counter: counterPDA,
//       })
//       .rpc();

//     const accountData = await program.account.counter.fetch(counterPDA);

//     console.log(`Transaction Signature: ${transactionSignature}`);
//     console.log(`Count: ${accountData.count}`);
//   });

//   it("Decrement", async () => {
//     const transactionSignature = await program.methods
//       .decrement()
//       .accounts({
//         counter: counterPDA,
//       })
//       .rpc();

//     const accountData = await program.account.counter.fetch(counterPDA);

//     console.log(`Transaction Signature: ${transactionSignature}`);
//     console.log(`Count: ${accountData.count}`);
//   });

//   it("Reset", async () => {
//     const transactionSignature = await program.methods
//       .reset()
//       .accounts({
//         counter: counterPDA,
//       })
//       .rpc();

//     const accountData = await program.account.counter.fetch(counterPDA);

//     console.log(`Transaction Signature: ${transactionSignature}`);
//     console.log(`Count: ${accountData.count}`);
//   });
// });
