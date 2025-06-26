# Tests DexYield

## Description

Cette suite de tests vérifie le bon fonctionnement du protocole DexYield, qui comprend :

1. **Protocole de Lending** : Dépôts, retraits, stratégies de yield
2. **Yield Tokens (YT)** : Mint et burn de tokens représentant le rendement
3. **Place de marché** : Échange de YT entre utilisateurs
4. **Système de rachat** : Récupération des actifs avec yield accumulé

## Fonctionnalités testées

### 📊 Protocole de Lending

- ✅ Création de pools de lending
- ✅ Gestion des stratégies de yield avec APY configurable
- ✅ Dépôts d'actifs (USDC) dans le protocole
- ✅ Retraits partiels et complets
- ✅ Calcul du yield en temps réel
- ✅ Mint automatique de Yield Tokens lors des dépôts

### 🏪 Place de marché décentralisée

- ✅ Listing de YT avec prix personnalisé
- ✅ Achat de YT entre utilisateurs
- ✅ Système d'escrow sécurisé
- ✅ Annulation de listings
- ✅ Frais de plateforme (0.25%)

### 🔄 Système de rachat

- ✅ Rachat de YT contre actifs + yield
- ✅ Système de maturité (7 jours minimum)
- ✅ Calcul proportionnel du yield
- ✅ Burn automatique des YT lors du rachat

### 🎛️ Administration

- ✅ Activation/désactivation des stratégies
- ✅ Activation/désactivation des pools
- ✅ Gestion des permissions

## Structure des tests

### `dexYield.ts` - Tests complets

Tests d'intégration couvrant l'ensemble du workflow :

1. Setup des comptes et mints
2. Création de pools et stratégies
3. Dépôts et génération de YT
4. Échanges sur la place de marché
5. Rachat avec yield

### `lending.ts` - Tests du protocole de lending

Tests spécifiques au protocole de prêt et de yield.

### `marketDex.ts` - Tests de la place de marché

Tests spécifiques aux échanges de Yield Tokens.

## Exécution des tests

### Prérequis

```bash
# Installer les dépendances
npm install

# Compiler les contrats
anchor build
```

### Lancer tous les tests

```bash
npm run test
```

### Lancer des tests spécifiques

```bash
# Tests complets DexYield
npm run test:dexYield

# Tests du protocole de lending uniquement
npm run test:lending

# Tests de la place de marché uniquement
npm run test:marketplace
```

### Avec validateur local

```bash
# Démarrer un validateur de test
npm run start-validator

# Dans un autre terminal, lancer les tests
anchor test --skip-deploy
```

## Données de test

Les tests utilisent :

- **USDC simulé** : 6 décimales, mint contrôlé
- **Yield Tokens** : 9 décimales, mint par PDA
- **Stratégies** : APY de 12% pour les tests
- **Utilisateurs** : 3 comptes (creator + 2 utilisateurs de test)
- **Montants** : 100-1000 USDC pour les tests

## Cas d'erreur testés

- ❌ Dépôt insuffisant (< 1 USDC)
- ❌ Rachat trop précoce (< 7 jours)
- ❌ Fonds insuffisants
- ❌ Stratégies inactives
- ❌ Pools désactivées
- ❌ Achats de ses propres listings

## Métriques attendues

Après exécution complète des tests :

- **Dépôts totaux** : ~200 USDC
- **YT mintés** : ~200 YT
- **Échanges** : 2-3 transactions sur la place de marché
- **Yield généré** : Variable selon le temps d'exécution
- **Frais collectés** : ~0.25% des échanges

## Sécurité

Les tests vérifient :

- 🔒 Autorisations appropriées (seuls les propriétaires peuvent gérer)
- 🔒 Calculs overflow/underflow
- 🔒 Validation des montants
- 🔒 Système d'escrow sécurisé
- 🔒 PDAs correctement dérivées
- 🔒 Burn des tokens lors des rachats

## Remarques importantes

1. **Maturité** : Les tests de rachat échoueront normalement car la maturité de 7 jours n'est pas atteinte
2. **Yield** : Le calcul de yield est basé sur le temps réel, donc variable selon l'exécution
3. **Frais** : Les frais de plateforme sont optionnels et configurables
4. **Décimales** : Attention aux décimales (USDC=6, YT=9) dans les calculs

## Debugging

Pour debugger les tests :

```bash
# Logs détaillés
ANCHOR_LOG=true npm run test

# Logs Solana
npm run logs
```

Les erreurs communes :

- `Account not found` : Vérifier les PDAs
- `Insufficient funds` : Vérifier les balances des comptes
- `Custom error: 0x...` : Consulter les codes d'erreur dans les contrats
