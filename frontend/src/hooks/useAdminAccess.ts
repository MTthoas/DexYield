import { useWallet } from '@solana/wallet-adapter-react';

// Adresses des wallets administrateurs autorisés
const ADMIN_WALLET_ADDRESSES = [
  '9HrzbxQYaaiGei6WvLDVKQEHgsS2Q5d4EbqP8LFAFtBm',
];

export const useAdminAccess = () => {
  const { publicKey } = useWallet();
  
  const isAdmin = publicKey ? ADMIN_WALLET_ADDRESSES.includes(publicKey.toString()) : false;
  
  return {
    isAdmin,
    adminWalletAddresses: ADMIN_WALLET_ADDRESSES
  };
};
