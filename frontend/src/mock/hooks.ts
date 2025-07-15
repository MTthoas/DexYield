// Mock hooks qui remplacent les vrais hooks en mode mock

import { useCallback, useState } from 'react';
import { useMock } from './context';

// Mock wallet hook
export const useMockWallet = () => {
  const { user, isWalletConnected, connectWallet, disconnectWallet } = useMock();
  
  return {
    connected: isWalletConnected,
    connecting: false,
    publicKey: isWalletConnected ? { toBase58: () => user.publicKey } : null,
    wallet: isWalletConnected ? { adapter: { name: 'Mock Wallet' } } : null,
    connect: connectWallet,
    disconnect: disconnectWallet
  };
};

// Mock lending hook
export const useMockLending = () => {
  const { fetchStrategies, getUserDeposit, getUserTokenBalance, loading } = useMock();
  
  return {
    fetchStrategies,
    getUserDeposit,
    getUserTokenBalance,
    loading
  };
};

// Mock lending simplified hook
export const useMockLendingSimplified = () => {
  const { deposit, withdraw, redeem, createStrategy, createPool, loading } = useMock();
  
  return {
    deposit,
    withdraw,
    redeem,
    initializeStrategy: createStrategy,
    initializeLendingPool: createPool,
    loading,
    error: null
  };
};

// Mock admin access hook
export const useMockAdminAccess = () => {
  const { user } = useMock();
  
  return {
    isAdmin: user.isAdmin
  };
};

// Mock contracts hook
export const useMockContracts = () => {
  const { strategies, lendingPools } = useMock();
  
  return {
    strategies,
    lendingPools,
    loading: false
  };
};

// Mock marketplace hook
export const useMockMarketplace = () => {
  const { marketplaceItems } = useMock();
  const [loading, setLoading] = useState(false);
  
  const createListing = useCallback(async (_item: any) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    return 'mock-marketplace-transaction-' + Date.now();
  }, []);
  
  const buyItem = useCallback(async (_itemId: string) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    return 'mock-buy-transaction-' + Date.now();
  }, []);
  
  return {
    items: marketplaceItems,
    loading,
    createListing,
    buyItem,
    error: null
  };
};
