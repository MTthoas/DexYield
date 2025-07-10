const { PublicKey } = require("@solana/web3.js");

const LENDING_PROGRAM_ID = new PublicKey("74Ds3Rq5RT1yHZmy66Eg95pp344ubx2HnAhLskd5hk2H");
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

const [strategyPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("strategy"), USDC_MINT.toBuffer()],
    LENDING_PROGRAM_ID
);
