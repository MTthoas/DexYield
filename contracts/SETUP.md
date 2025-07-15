# Script d'installation et d'initialisation DexYield

## Prérequis

Avant de continuer, assurez-vous d'avoir installé :

1. **Solana CLI** : https://docs.solana.com/cli/install-solana-cli-tools
2. **Anchor CLI** : https://www.anchor-lang.com/docs/installation
3. **Node.js et npm/yarn**

## Configuration Solana

```powershell
# Configurer Solana pour devnet
solana config set --url devnet

# Créer un wallet si vous n'en avez pas
solana-keygen new --outfile ~/.config/solana/id.json

# Vérifier votre configuration
solana config get

# Airdrop de SOL pour les frais de transaction
solana airdrop 2
```

## Installation des dépendances

```powershell
cd contracts
npm install

# Installer Anchor CLI (si pas encore fait)
npm install -g @coral-xyz/anchor-cli
```

## Build et déploiement

```powershell
# Build les programmes
anchor build

# Déployer sur devnet
anchor deploy --provider.cluster devnet
```

## Initialisation

```powershell
# Exécuter le script d'initialisation
npx ts-node scripts/initialize-devnet.ts
```

## Test des fonctionnalités

```powershell
# Modifier le script test-features.ts avec les valeurs générées
# puis exécuter :
npx ts-node scripts/test-features.ts
```

## Informations importantes

Après l'exécution du script d'initialisation, notez bien :
- L'adresse du token USDC de test
- L'adresse de la clé privée de l'utilisateur de test
- Les adresses des PDAs créés

Ces informations seront nécessaires pour votre frontend et vos tests.

## Prochaines étapes

Une fois l'initialisation terminée, vous pourrez :

1. **Intégrer avec le frontend** : Utiliser les adresses des programmes dans votre application React
2. **Tester les fonctionnalités** : Dépôts, retraits, yield farming
3. **Configurer le marketplace** : Pour l'échange de YT tokens
4. **Ajouter des stratégies** : Créer d'autres pools de tokens

## Dépannage

Si vous rencontrez des erreurs :

1. Vérifiez que votre wallet a suffisamment de SOL
2. Vérifiez que les programmes sont bien déployés
3. Vérifiez la configuration de votre cluster Solana

Pour voir les logs détaillés : `solana logs` dans un terminal séparé pendant l'exécution.
