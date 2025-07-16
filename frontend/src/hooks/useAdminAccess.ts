import { useWallet } from '@solana/wallet-adapter-react';

// Adresses des wallets administrateurs autorisés
const ADMIN_WALLET_ADDRESSES = [
  '9JNZJADgviPnQWKz6sCrXiqvwVwRWcCKmicGYUD2hkdZ',
  '7bLqvdXRBHAXGpVXYVa9La1WUjCv4TbqaEjTnU3zmETB'
];

export const useAdminAccess = () => {
  const { publicKey } = useWallet();
  
  const isAdmin = publicKey ? ADMIN_WALLET_ADDRESSES.includes(publicKey.toString()) : false;
  
  return {
    isAdmin,
    adminWalletAddresses: ADMIN_WALLET_ADDRESSES
  };
};
