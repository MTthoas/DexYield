import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

// Composant utilisant le bouton Solana natif avec style personnalisé
export function WalletButton() {
  return (
    <div className="hidden md:flex">
      <WalletMultiButton 
        className="!bg-transparent !border !border-input !text-foreground hover:!bg-accent hover:!text-accent-foreground !h-2 !px-1 !text-xs !font-medium !transition-colors !rounded-sm !flex !items-center !gap-0.5 !min-w-0 !leading-none !py-0"
      />
    </div>
  );
}
