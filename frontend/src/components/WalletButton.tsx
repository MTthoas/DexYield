import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// Composant utilisant le bouton Solana natif avec style personnalisé
export function WalletButton() {
  return (
    <div className="hidden md:flex">
      <WalletMultiButton 
        className="!bg-transparent !border !border-input !text-foreground hover:!bg-accent hover:!text-accent-foreground !h-4 !px-2 !text-sm !font-medium !transition-colors !rounded-md !flex !items-center !gap-1 !min-w-0"
      />
    </div>
  );
}
