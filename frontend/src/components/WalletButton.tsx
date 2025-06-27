import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "./WalletButton.css";

// Composant utilisant le bouton Solana natif avec style personnalisé
export function WalletButton() {
  return (
    <div className="hidden md:flex">
      <WalletMultiButton />
    </div>
  );
}
