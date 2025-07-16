const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram, LAMPORTS_PER_SOL } = require("@solana/web3.js");

// Import IDL correctly
const lendingIdl = require("../target/idl/lending.json");

// Program IDs from your deploy
const LENDING_PROGRAM_ID = new PublicKey("GBhdq8ypCAdTEqPLm4ZQA4mSUjHik7U43FMoou3qwLxo");
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const DEFAULT_POOL_OWNER = new PublicKey("6xKr3QyuZ2SY2egretDk9WYfnFzpae3njD8pjpXynqcR");

// Stratégie SOL
const SOL_STRATEGY = {
  tokenAddress: SOL_MINT,
  rewardApy: 8000, // 80% APY
  name: "SOL Strategy",
  description: "High yield SOL strategy for DexYield"
};

async function createSolStrategy() {
  try {
    console.log('🚀 Creating SOL Strategy...');
    
    // Setup connection and provider
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    
    // Load program
    const lendingProgram = new anchor.Program(lendingIdl, LENDING_PROGRAM_ID, provider);
    
    // Generate strategy PDA
    const [strategyPDA] = await PublicKey.findProgramAddress(
      [
        Buffer.from('strategy'),
        SOL_STRATEGY.tokenAddress.toBuffer(),
      ],
      LENDING_PROGRAM_ID
    );
    
    console.log('📋 Strategy PDA:', strategyPDA.toString());
    
    // Check if strategy already exists
    try {
      const existingStrategy = await lendingProgram.account.strategy.fetch(strategyPDA);
      console.log('⚠️  Strategy already exists:', existingStrategy);
      return strategyPDA;
    } catch (error) {
      console.log('✅ Strategy does not exist, creating new one...');
    }
    
    // Create strategy
    const tx = await lendingProgram.methods
      .createStrategy(
        SOL_STRATEGY.rewardApy,
        SOL_STRATEGY.name,
        SOL_STRATEGY.description
      )
      .accounts({
        strategy: strategyPDA,
        tokenAddress: SOL_STRATEGY.tokenAddress,
        creator: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log('✅ SOL Strategy created successfully!');
    console.log('📝 Transaction:', tx);
    console.log('🏦 Strategy PDA:', strategyPDA.toString());
    
    // Verify the strategy was created
    const strategy = await lendingProgram.account.strategy.fetch(strategyPDA);
    console.log('📊 Strategy details:', {
      name: strategy.name,
      description: strategy.description,
      tokenAddress: strategy.tokenAddress.toString(),
      rewardApy: strategy.rewardApy.toString(),
      active: strategy.active,
      createdAt: new Date(strategy.createdAt.toNumber() * 1000).toISOString(),
      totalDeposited: strategy.totalDeposited.toString(),
    });
    
    return strategyPDA;
    
  } catch (error) {
    console.error('❌ Error creating SOL strategy:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createSolStrategy()
    .then((strategyPDA) => {
      console.log('\n🎉 SOL Strategy created successfully!');
      console.log('Strategy PDA:', strategyPDA.toString());
      console.log('\nNext steps:');
      console.log('1. Update your frontend constants with the new strategy PDA');
      console.log('2. The strategy will appear in your lending pools');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to create SOL strategy:', error);
      process.exit(1);
    });
}

module.exports = { createSolStrategy };