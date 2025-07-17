// Code à exécuter dans la console du navigateur (F12) sur la page lending

// Fonction pour réinitialiser le yield
async function resetYieldData() {
    console.log("🔄 Starting yield reset from browser console...");
    
    // Vérifier que le wallet est connecté
    if (!window.solana || !window.solana.isConnected) {
        console.error("❌ Wallet not connected!");
        return;
    }
    
    const userPublicKey = window.solana.publicKey;
    console.log("👤 User wallet:", userPublicKey.toString());
    
    // Paramètres pour SOL strategy
    const poolOwner = userPublicKey; // Vous êtes le propriétaire du pool
    const solMint = new PublicKey("So11111111111111111111111111111111111111112");
    const strategyId = 1;
    
    // Calculer la strategy PDA
    const strategySeeds = [
        Buffer.from("strategy"),
        solMint.toBuffer(),
        poolOwner.toBuffer(),
        new BN(strategyId).toArray('le', 8)
    ];
    
    const [strategyPDA] = PublicKey.findProgramAddressSync(
        strategySeeds,
        new PublicKey("BHByEUQjZokRDuBacssntFnQnWEsTnxe73B3ofhRTx1J")
    );
    
    console.log("📍 Strategy PDA:", strategyPDA.toString());
    
    try {
        // Utiliser la fonction resetUserYield du hook
        // Cette fonction devrait être disponible dans le contexte React
        const result = await resetUserYield(poolOwner, strategyPDA);
        console.log("✅ Reset successful! TX:", result);
        
        // Recharger la page pour voir les nouvelles données
        window.location.reload();
        
    } catch (error) {
        console.error("❌ Reset failed:", error);
        
        // Essayer d'utiliser directement le contract service si disponible
        if (window.contractService) {
            try {
                const result = await window.contractService.resetUserYield(
                    userPublicKey,
                    poolOwner,
                    strategyPDA
                );
                console.log("✅ Reset successful via contract service! TX:", result);
                window.location.reload();
            } catch (contractError) {
                console.error("❌ Contract service also failed:", contractError);
            }
        }
    }
}

// Exécuter la fonction
resetYieldData();