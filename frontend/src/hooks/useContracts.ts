import { useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ContractService, getProvider } from '../lib/contracts';

export const useContracts = () => {
  const wallet = useWallet();
  
  const contractService = useMemo(() => {
    console.log('=== useContracts START ===');
    console.log('Wallet connected:', wallet.connected);
    console.log('Wallet publicKey:', wallet.publicKey?.toString());
    console.log('Wallet signTransaction:', typeof wallet.signTransaction);
    console.log('Wallet object:', wallet);
    
    if (!wallet.connected) {
      console.log('Wallet not connected, returning null');
      return null;
    }
    
    if (!wallet.publicKey) {
      console.log('Wallet publicKey missing, returning null');
      return null;
    }
    
    if (!wallet.signTransaction) {
      console.log('Wallet signTransaction missing, returning null');
      return null;
    }
    
    try {
      console.log('Creating provider...');
      const provider = getProvider(wallet);
      console.log('Provider created:', provider);
      
      console.log('Creating ContractService...');
      const service = new ContractService(provider);
      console.log('ContractService created:', service);
      console.log('=== useContracts SUCCESS ===');
      return service;
    } catch (error) {
      console.error('=== useContracts ERROR ===');
      console.error('Error creating contract service:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('=== END ERROR ===');
      return null;
    }
  }, [wallet.connected, wallet.publicKey, wallet.signTransaction]);

  return contractService;
};