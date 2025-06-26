# Intégration Wallet Solana

## Vue d'ensemble

Cette application intègre la connexion aux wallets Solana, en particulier Phantom, pour permettre aux utilisateurs de se connecter et d'interagir avec la blockchain Solana.

## Composants installés

### Dépendances
- `@solana/wallet-adapter-base` - Adaptateurs de base pour les wallets
- `@solana/wallet-adapter-react` - Hooks React pour les wallets
- `@solana/wallet-adapter-react-ui` - Composants UI pré-construits
- `@solana/wallet-adapter-phantom` - Adaptateur spécifique pour Phantom
- `@solana/web3.js` - SDK JavaScript pour Solana

## Architecture

### 1. WalletContextProvider (`src/contexts/WalletContext.tsx`)
Fournit le contexte global pour la gestion des wallets dans toute l'application.

**Configuration:**
- Réseau: Devnet (à changer en Mainnet pour la production)
- Wallets supportés: Phantom (extensible)
- Auto-connexion activée

### 2. WalletButton (`src/components/WalletButton.tsx`)
Bouton de connexion/déconnexion personnalisé qui :
- Affiche "Connect Wallet" quand déconnecté
- Affiche l'adresse tronquée quand connecté
- Gère les états de chargement
- Style cohérent avec votre design system

### 3. Hook personnalisé (`src/hooks/useWallet.ts`)
Hook utilitaire qui étend les fonctionnalités de base :
- Obtention du solde
- Envoi de transactions
- Signature de messages
- Helpers pour l'adresse

### 4. WalletInfo (`src/components/WalletInfo.tsx`)
Composant d'information détaillée qui affiche :
- Adresse tronquée avec bouton de copie
- Solde en SOL
- Lien vers l'explorateur Solana
- Bouton de déconnexion

## Utilisation

### Connexion de base
```tsx
import { WalletButton } from '@/components/WalletButton';

function MyComponent() {
  return <WalletButton />;
}
```

### Utilisation avancée avec le hook
```tsx
import { useWallet } from '@/hooks/useWallet';

function MyComponent() {
  const { isConnected, address, getBalance } = useWallet();
  
  if (!isConnected) {
    return <div>Veuillez connecter votre wallet</div>;
  }
  
  return (
    <div>
      <p>Connecté: {address}</p>
      <button onClick={() => getBalance().then(console.log)}>
        Voir le solde
      </button>
    </div>
  );
}
```

## Configuration réseau

Pour changer de réseau (Devnet → Mainnet):

1. Modifier `src/contexts/WalletContext.tsx`:
```tsx
const network = WalletAdapterNetwork.Mainnet; // ou Devnet/Testnet
```

2. L'endpoint sera automatiquement configuré

## Wallets supportés

Actuellement supporté:
- ✅ Phantom

Pour ajouter d'autres wallets:
```tsx
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';

const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  // autres wallets...
];
```

## Sécurité

- ✅ Wallet non-custodial (l'utilisateur garde le contrôle)
- ✅ Signature obligatoire pour les transactions
- ✅ Vérification des connexions
- ⚠️ Actuellement en Devnet (pas d'argent réel)

## Prochaines étapes

1. **Intégration DeFi**: Connecter aux smart contracts de lending/borrowing
2. **Gestion des tokens**: Support pour les tokens SPL
3. **Historique des transactions**: Affichage des transactions passées
4. **Notifications**: Alertes pour les transactions réussies/échouées
5. **Multi-wallet**: Support d'autres wallets (Solflare, Slope, etc.)

## Dépannage

### Phantom non détecté
1. Vérifier que l'extension Phantom est installée
2. Actualiser la page
3. Vérifier que Phantom est déverrouillé

### Erreurs de connexion
1. Vérifier la connexion réseau
2. Changer de RPC endpoint si nécessaire
3. Vérifier les logs de la console

### Transactions échouées
1. Vérifier le solde suffisant pour les frais
2. Vérifier que la transaction est bien formée
3. Attendre la confirmation réseau
