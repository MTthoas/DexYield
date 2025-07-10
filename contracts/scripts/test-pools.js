const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");
const lendingIdl = require("../target/idl/lending.json");

// Program ID
const LENDING_PROGRAM_ID = new PublicKey("GBhdq8ypCAdTEqPLm4ZQA4mSUjHik7U43FMoou3qwLxo");

async function main() {
    // Setup provider
    const provider = anchor.AnchorProvider.local("https://api.devnet.solana.com");
    anchor.setProvider(provider);
    const lending = new anchor.Program(lendingIdl, provider);

    console.log("🔍 Fetching strategies (pools) from blockchain...");
    try {
        const strategies = await lending.account.strategy.all();
        if (!strategies || !strategies.length) {
            console.log("❌ No strategies found on-chain.");
            return;
        }
        strategies.forEach(({ publicKey, account }, i) => {
            console.log(`--- Strategy #${i + 1} ---`);
            console.log("Address:", publicKey.toBase58());
            console.log("Raw account:", account);
            console.log("Name:", account.name);
            // Affiche le champ tokenAddress (prioritaire sur tokenMint)
            if (account.tokenAddress) {
                console.log("Token Address:", account.tokenAddress.toBase58 ? account.tokenAddress.toBase58() : account.tokenAddress);
            } else if (account.tokenMint) {
                console.log("Token Mint:", account.tokenMint.toBase58 ? account.tokenMint.toBase58() : account.tokenMint);
            } else {
                console.log("No token address/mint field found.");
            }
            // Conversion BN -> number
            console.log("APY:", account.rewardApy?.toNumber?.() ?? account.rewardApy);
            console.log("Active:", account.active);
            console.log("Total Deposited:", account.totalDeposited?.toNumber?.() ?? account.totalDeposited);
            console.log("Created At:", account.createdAt?.toNumber?.() ?? account.createdAt);
            console.log("-------------------------");
        });
    } catch (err) {
        console.error("❌ Error fetching strategies:", err.message || err);
        if (lendingIdl && lendingIdl.accounts) {
            console.log("IDL accounts:", Object.keys(lendingIdl.accounts));
        } else {
            console.log("IDL format issue. Check lending.json.");
        }
    }
}

main().catch(console.error);