# Script d'initialisation automatisé DexYield
# Exécuter avec : .\setup-devnet.ps1

Write-Host "🚀 Configuration DexYield pour devnet..." -ForegroundColor Green

# Vérifier les prérequis
Write-Host "`n📋 Vérification des prérequis..." -ForegroundColor Yellow

# Vérifier Solana CLI
try {
    $solanaVersion = solana --version
    Write-Host "✅ Solana CLI trouvé: $solanaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Solana CLI non trouvé. Installez-le depuis https://docs.solana.com/cli/install-solana-cli-tools" -ForegroundColor Red
    exit 1
}

# Vérifier Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js trouvé: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js non trouvé. Installez-le depuis https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Configuration Solana
Write-Host "`n🔧 Configuration Solana..." -ForegroundColor Yellow
solana config set --url devnet
$config = solana config get
Write-Host $config

# Vérifier le solde
$balance = solana balance
Write-Host "💰 Solde actuel: $balance"

if ($balance -match "^0") {
    Write-Host "💸 Airdrop de SOL en cours..." -ForegroundColor Yellow
    solana airdrop 2
}

# Installation des dépendances
Write-Host "`n📦 Installation des dépendances..." -ForegroundColor Yellow
npm install

# Vérifier si Anchor est installé
try {
    $anchorVersion = anchor --version
    Write-Host "✅ Anchor CLI trouvé: $anchorVersion" -ForegroundColor Green
} catch {
    Write-Host "📥 Installation d'Anchor CLI..." -ForegroundColor Yellow
    npm install -g @coral-xyz/anchor-cli
}

# Build les programmes
Write-Host "`n🔨 Build des programmes..." -ForegroundColor Yellow
anchor build

# Déployer sur devnet
Write-Host "`n🚢 Déploiement sur devnet..." -ForegroundColor Yellow
anchor deploy --provider.cluster devnet

# Exécuter l'initialisation
Write-Host "`n⚡ Initialisation des programmes..." -ForegroundColor Yellow
npx ts-node scripts/initialize-devnet.ts

Write-Host "`n🎉 Configuration terminée!" -ForegroundColor Green
Write-Host "📝 Consultez le fichier de log généré pour les adresses importantes." -ForegroundColor Yellow
Write-Host "🔧 Modifiez scripts/test-features.ts avec les valeurs générées pour tester." -ForegroundColor Yellow
