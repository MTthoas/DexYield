# Mode Mock pour DexYield Frontend

## Description

Le mode mock permet de lancer l'application avec des données de test prédéfinies sans avoir besoin de connexion blockchain ou de portefeuille réel. Cela facilite le développement, les tests et les démonstrations.

## Démarrage

Pour lancer l'application en mode mock, utilisez la commande :

```bash
pnpm run dev:fake
```

Cette commande lance Vite avec le mode `mock` activé.

## Fonctionnalités Mock

### 🔑 Authentification
- Portefeuille automatiquement connecté
- Utilisateur admin par défaut
- Balances de tokens prédéfinies

### 💰 Lending & Yield Farming
- 5 stratégies de test avec différents tokens (USDC, SOL, mSOL)
- Pools avec TVL et APY réalistes
- Fonctionnalités de dépôt, retrait et récupération des récompenses
- Historique des dépôts utilisateur

### 👨‍💼 Administration
- Accès admin complet
- Création de nouvelles stratégies
- Création de nouveaux pools
- Dashboard avec statistiques

### 🛍️ Marketplace
- Items de démonstration (NFTs, guides, récompenses)
- Système d'achat simulé
- Filtres et recherche

## Données Mock

### Utilisateur par défaut
- **Clé publique**: `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`
- **Statut**: Admin
- **Balances**: 15.5 SOL, 1250.75 USDC, 8.2 mSOL
- **Dépôts actifs**: 3 positions dans différents pools

### Stratégies disponibles
1. **USDC Stable Yield** - 8.5% APY (Risque faible)
2. **SOL Liquid Staking** - 12% APY (Risque moyen)
3. **mSOL High Yield** - 14.5% APY (Risque élevé)
4. **USDC Conservative** - 6.5% APY (Risque faible)
5. **SOL Aggressive Growth** - 18.5% APY (Risque élevé, inactif)

### Statistiques globales
- **TVL Total**: $2,850,000
- **Utilisateurs**: 1,247
- **Rendement distribué**: $89,500
- **APY Moyen**: 11.2%

## Architecture

### Fichiers principaux
- `src/mock/data.ts` - Données de test
- `src/mock/context.tsx` - Context provider mock
- `src/mock/hooks.ts` - Hooks mock
- `src/mock/index.ts` - Configuration principale

### Pages mock
- `src/routes/explore/home/index.mock.tsx` - Page d'accueil
- `src/routes/lending/index.mock.tsx` - Page de lending
- `src/routes/admin/index.mock.tsx` - Page d'administration
- `src/routes/marketplace/index.mock.tsx` - Page marketplace

### Composants mock
- `src/components/lendingdetails/LendingPage.mock.tsx`
- `src/components/admin/AdminPage.mock.tsx`
- `src/components/marketplace/MarketplacePage.mock.tsx`

## Utilisation

### Développement
Le mode mock est idéal pour :
- Développer de nouvelles fonctionnalités UI
- Tester l'interface utilisateur
- Démonstrations sans dépendances blockchain
- Tests d'intégration frontend

### Indicateurs visuels
En mode mock, l'interface affiche :
- Bannières colorées indiquant le mode mock
- Statistiques en temps réel
- Notifications simulées
- Données de test réalistes

### Interactions
Toutes les interactions sont simulées avec :
- Délais d'API réalistes
- Notifications de succès/erreur
- Mise à jour des données en temps réel
- Transactions simulées

## Personnalisation

### Modifier les données
Éditez `src/mock/data.ts` pour :
- Ajouter/modifier des stratégies
- Changer les balances utilisateur
- Personnaliser les statistiques globales
- Ajouter des items marketplace

### Ajouter de nouvelles fonctionnalités
1. Créer des hooks mock dans `src/mock/hooks.ts`
2. Ajouter des données dans `src/mock/data.ts`
3. Mettre à jour le context dans `src/mock/context.tsx`
4. Créer des pages mock si nécessaire

## Développement

### Ajout d'une nouvelle page mock
1. Créer `src/routes/[route]/index.mock.tsx`
2. Créer le composant mock correspondant
3. Ajouter les données mock nécessaires
4. Mettre à jour le routeTree si nécessaire

### Debugging
- Console logs automatiques pour les transactions
- Alertes pour les actions utilisateur
- Messages d'erreur simulés
- État visible dans React DevTools

## Production

⚠️ **Attention**: Le mode mock est uniquement pour le développement. En production, seul le mode normal doit être utilisé.

Le mode mock est automatiquement désactivé si `NODE_ENV=production` ou si le mode Vite n'est pas `mock`.
