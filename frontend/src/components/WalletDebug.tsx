import { useWallet } from '@solana/wallet-adapter-react';

export function WalletDebug() {
  const { 
    wallet, 
    connected, 
    connecting, 
    disconnecting,
    publicKey,
    wallets 
  } = useWallet();

  // Afficher seulement en développement
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 p-4 bg-gray-800 text-white text-xs rounded-lg max-w-xs z-50">
      <h3 className="font-bold mb-2">Wallet Debug</h3>
      <div>Wallet: {wallet?.adapter.name || 'None'}</div>
      <div>Connected: {connected ? 'Yes' : 'No'}</div>
      <div>Connecting: {connecting ? 'Yes' : 'No'}</div>
      <div>Disconnecting: {disconnecting ? 'Yes' : 'No'}</div>
      <div>PublicKey: {publicKey ? publicKey.toBase58().slice(0, 8) + '...' : 'None'}</div>
      <div>Available wallets: {wallets.length}</div>
      <div className="mt-2">
        {wallets.map((w) => (
          <div key={w.adapter.name} className="text-xs">
            - {w.adapter.name} ({w.readyState})
          </div>
        ))}
      </div>
    </div>
  );
}
