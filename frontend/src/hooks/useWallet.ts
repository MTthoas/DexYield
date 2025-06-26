import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { useCallback } from 'react';

export function useWalletExtended() {
  const { connection } = useConnection();
  const { 
    wallet, 
    connect, 
    disconnect, 
    connected, 
    connecting, 
    publicKey,
    sendTransaction,
    signMessage,
    signTransaction
  } = useSolanaWallet();t as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { useCallback } from 'react';

export function useWallet() {
  const { connection } = useConnection();
  const { 
    wallet, 
    connect, 
    disconnect, 
    connected, 
    connecting, 
    publicKey,
    sendTransaction,
    signMessage,
    signTransaction
  } = useSolanaWallet();

  // Fonction pour obtenir le solde du wallet
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

  // Fonction pour envoyer une transaction
  const sendSol = useCallback(async (toAddress: string, amount: number) => {
    if (!publicKey || !connection || !sendTransaction) {
      throw new Error('Wallet non connecté');
    }

    try {
      const transaction = new Transaction();
      // Ici vous ajouteriez les instructions de transfert
      // const instruction = SystemProgram.transfer({...});
      // transaction.add(instruction);
      
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'processed');
      return signature;
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      throw error;
    }
  }, [publicKey, connection, sendTransaction]);

  return {
    // États du wallet
    wallet,
    connected,
    connecting,
    publicKey,
    
    // Actions du wallet
    connect,
    disconnect,
    
    // Fonctions utilitaires
    getBalance,
    sendSol,
    
    // Fonctions de signature
    signMessage,
    signTransaction,
    sendTransaction,
    
    // Connexion Solana
    connection,
    
    // Helpers
    address: publicKey?.toBase58() || '',
    isConnected: connected && !!publicKey,
  };
}
