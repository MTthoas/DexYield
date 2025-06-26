import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Button } from './ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

export function WalletInfo() {
  const { connected, publicKey, disconnect } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number>(0);
  const [copying, setCopying] = useState(false);

  const getBalance = useCallback(async () => {
    if (!publicKey || !connection) return 0;
    try {
      const balance = await connection.getBalance(publicKey);
      return balance / 1e9; // Convertir de lamports en SOL
    } catch (error) {
      console.error('Erreur lors de la récupération du solde:', error);
      return 0;
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (connected && publicKey) {
      getBalance().then(setBalance);
    }
  }, [connected, publicKey, getBalance]);

  const copyAddress = async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  if (!connected || !publicKey) return null;

  const address = publicKey.toBase58();

  return (
    <div className="flex flex-col gap-2 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Wallet connecté</span>
        <Button
          variant="outline"
          size="sm"
          onClick={disconnect}
        >
          Déconnecter
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {truncateAddress(address)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={copyAddress}
          disabled={copying}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          asChild
        >
          <a
            href={`https://explorer.solana.com/address/${address}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </div>
      
      <div className="text-sm">
        <span className="text-muted-foreground">Solde: </span>
        <span className="font-medium">{balance.toFixed(4)} SOL</span>
      </div>
      
      {copying && (
        <div className="text-xs text-green-600">
          Adresse copiée !
        </div>
      )}
    </div>
  );
}
