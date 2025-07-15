// Mock context qui remplace les vrais hooks quand on est en mode mock

import { createContext, useContext, useState, useCallback } from 'react';
import { 
  mockUser, 
  mockStrategies, 
  mockLendingPools, 
  mockMarketplaceItems, 
  mockGlobalStats,
  mockFAQs,
  mockNotifications,
  type MockUser,
  type MockStrategy,
  type MockLendingPool,
  type MockMarketplaceItem
} from './data';

interface MockContextType {
  // User data
  user: MockUser;
  isWalletConnected: boolean;
  connectWallet: () => void;
  disconnectWallet: () => void;
  
  // Lending data
  strategies: MockStrategy[];
  lendingPools: MockLendingPool[];
  userDeposits: any[];
  loading: boolean;
  
  // Marketplace data
  marketplaceItems: MockMarketplaceItem[];
  
  // Global stats
  globalStats: typeof mockGlobalStats;
  
  // FAQs
  faqs: typeof mockFAQs;
  
  // Notifications
  notifications: typeof mockNotifications;
  
  // Actions
  deposit: (poolId: string, amount: number) => Promise<string>;
  withdraw: (poolId: string, amount: number) => Promise<string>;
  redeem: (poolId: string) => Promise<string>;
  createStrategy: (data: any) => Promise<string>;
  createPool: (data: any) => Promise<string>;
  fetchStrategies: () => Promise<MockStrategy[]>;
  getUserDeposit: (publicKey: any, strategyId: string) => Promise<any>;
  getUserTokenBalance: (publicKey: any, token: string) => Promise<number>;
}

const MockContext = createContext<MockContextType | null>(null);

export const MockProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<MockUser>(mockUser);
  const [isWalletConnected, setIsWalletConnected] = useState(true);
  const [strategies] = useState<MockStrategy[]>(mockStrategies);
  const [lendingPools] = useState<MockLendingPool[]>(mockLendingPools);
  const [marketplaceItems] = useState<MockMarketplaceItem[]>(mockMarketplaceItems);
  const [loading, setLoading] = useState(false);

  const connectWallet = useCallback(() => {
    setIsWalletConnected(true);
  }, []);

  const disconnectWallet = useCallback(() => {
    setIsWalletConnected(false);
  }, []);

  const deposit = useCallback(async (poolId: string, amount: number): Promise<string> => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update user deposits
    const existingDeposit = user.deposits.find(d => d.strategyId === poolId);
    if (existingDeposit) {
      existingDeposit.amount += amount;
    } else {
      user.deposits.push({
        strategyId: poolId,
        amount,
        yieldEarned: 0
      });
    }
    
    // Update user balance
    const pool = lendingPools.find(p => p.id === poolId);
    if (pool) {
      const tokenSymbol = pool.token.symbol.toLowerCase() as keyof typeof user.balance;
      if (tokenSymbol in user.balance) {
        user.balance[tokenSymbol] -= amount;
      }
    }
    
    setUser({ ...user });
    setLoading(false);
    return 'mock-transaction-id-deposit-' + Date.now();
  }, [user, lendingPools]);

  const withdraw = useCallback(async (poolId: string, amount: number): Promise<string> => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update user deposits
    const existingDeposit = user.deposits.find(d => d.strategyId === poolId);
    if (existingDeposit) {
      existingDeposit.amount -= amount;
      if (existingDeposit.amount <= 0) {
        user.deposits = user.deposits.filter(d => d.strategyId !== poolId);
      }
    }
    
    // Update user balance
    const pool = lendingPools.find(p => p.id === poolId);
    if (pool) {
      const tokenSymbol = pool.token.symbol.toLowerCase() as keyof typeof user.balance;
      if (tokenSymbol in user.balance) {
        user.balance[tokenSymbol] += amount;
      }
    }
    
    setUser({ ...user });
    setLoading(false);
    return 'mock-transaction-id-withdraw-' + Date.now();
  }, [user, lendingPools]);

  const redeem = useCallback(async (poolId: string): Promise<string> => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find user deposit and add yield to balance
    const deposit = user.deposits.find(d => d.strategyId === poolId);
    if (deposit) {
      const pool = lendingPools.find(p => p.id === poolId);
      if (pool) {
        const tokenSymbol = pool.token.symbol.toLowerCase() as keyof typeof user.balance;
        if (tokenSymbol in user.balance) {
          user.balance[tokenSymbol] += deposit.yieldEarned;
        }
      }
      deposit.yieldEarned = 0;
    }
    
    setUser({ ...user });
    setLoading(false);
    return 'mock-transaction-id-redeem-' + Date.now();
  }, [user, lendingPools]);

  const createStrategy = useCallback(async (_data: any): Promise<string> => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    return 'mock-transaction-id-create-strategy-' + Date.now();
  }, []);

  const createPool = useCallback(async (_data: any): Promise<string> => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    return 'mock-transaction-id-create-pool-' + Date.now();
  }, []);

  const fetchStrategies = useCallback(async (): Promise<MockStrategy[]> => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setLoading(false);
    return strategies;
  }, [strategies]);

  const getUserDeposit = useCallback(async (_publicKey: any, strategyId: string): Promise<any> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const deposit = user.deposits.find(d => d.strategyId === strategyId);
    return deposit || null;
  }, [user.deposits]);

  const getUserTokenBalance = useCallback(async (_publicKey: any, token: string): Promise<number> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const tokenSymbol = token.toLowerCase() as keyof typeof user.balance;
    return user.balance[tokenSymbol] || 0;
  }, [user.balance]);

  const value: MockContextType = {
    user,
    isWalletConnected,
    connectWallet,
    disconnectWallet,
    strategies,
    lendingPools,
    userDeposits: user.deposits,
    loading,
    marketplaceItems,
    globalStats: mockGlobalStats,
    faqs: mockFAQs,
    notifications: mockNotifications,
    deposit,
    withdraw,
    redeem,
    createStrategy,
    createPool,
    fetchStrategies,
    getUserDeposit,
    getUserTokenBalance
  };

  return (
    <MockContext.Provider value={value}>
      {children}
    </MockContext.Provider>
  );
};

export const useMock = () => {
  const context = useContext(MockContext);
  if (!context) {
    throw new Error('useMock must be used within a MockProvider');
  }
  return context;
};
