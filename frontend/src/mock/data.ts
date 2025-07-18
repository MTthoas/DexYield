// Mock data pour toutes les pages

export interface MockLendingPool {
  id: string;
  name: string;
  token: {
    symbol: string;
    mint: string;
    decimals: number;
    icon?: string;
  };
  apy: number;
  tvl: number;
  totalDeposits: number;
  totalYieldDistributed: number;
  userDeposit?: number;
  userYieldEarned?: number;
  isActive: boolean;
  description: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  createdAt: string;
}

export interface MockStrategy {
  id: string;
  tokenAddress: string;
  rewardApy: number;
  name: string;
  description: string;
  createdAt: number;
  active: boolean;
  totalDeposited: number;
  tokenSymbol: string;
}

export interface MockUser {
  publicKey: string;
  isAdmin: boolean;
  walletConnected: boolean;
  balance: {
    sol: number;
    usdc: number;
    msol: number;
  };
  totalDeposited: number;
  totalYieldEarned: number;
  deposits: {
    strategyId: string;
    amount: number;
    yieldEarned: number;
  }[];
}

// Mock user data
export const mockUser: MockUser = {
  publicKey: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  isAdmin: true,
  walletConnected: true,
  balance: {
    sol: 15.5,
    usdc: 1250.75,
    msol: 8.2
  },
  totalDeposited: 2500.0,
  totalYieldEarned: 127.35,
  deposits: [
    {
      strategyId: "strategy-1",
      amount: 1000.0,
      yieldEarned: 85.2
    },
    {
      strategyId: "strategy-2",
      amount: 800.0,
      yieldEarned: 32.5
    },
    {
      strategyId: "strategy-3",
      amount: 700.0,
      yieldEarned: 9.65
    }
  ]
};

// Mock strategies data
export const mockStrategies: MockStrategy[] = [
  {
    id: "strategy-1",
    tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    rewardApy: 850, // 8.5% en basis points
    name: "USDC Stable Yield",
    description: "Pool de prêt stable avec rendement conservateur en USDC",
    createdAt: 1703980800,
    active: true,
    totalDeposited: 45000000000, // 45,000 USDC en micro-unités
    tokenSymbol: "USDC"
  },
  {
    id: "strategy-2",
    tokenAddress: "So11111111111111111111111111111111111111112",
    rewardApy: 1200, // 12% en basis points
    name: "SOL Liquid Staking",
    description: "Stratégie de staking liquide SOL avec rendement élevé",
    createdAt: 1703894400,
    active: true,
    totalDeposited: 150000000000, // 150 SOL en lamports
    tokenSymbol: "SOL"
  },
  {
    id: "strategy-3",
    tokenAddress: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    rewardApy: 1450, // 14.5% en basis points
    name: "mSOL High Yield",
    description: "Pool de rendement élevé avec mSOL - risque modéré",
    createdAt: 1703808000,
    active: true,
    totalDeposited: 85000000000, // 85 mSOL en micro-unités
    tokenSymbol: "mSOL"
  },
  {
    id: "strategy-4",
    tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    rewardApy: 650, // 6.5% en basis points
    name: "USDC Conservative",
    description: "Pool USDC ultra-conservateur pour débutants",
    createdAt: 1703721600,
    active: true,
    totalDeposited: 25000000000, // 25,000 USDC en micro-unités
    tokenSymbol: "USDC"
  },
  {
    id: "strategy-5",
    tokenAddress: "So11111111111111111111111111111111111111112",
    rewardApy: 1850, // 18.5% en basis points
    name: "SOL Aggressive Growth",
    description: "Stratégie SOL à haut rendement - risque élevé",
    createdAt: 1703635200,
    active: false,
    totalDeposited: 75000000000, // 75 SOL en lamports
    tokenSymbol: "SOL"
  }
];

// Mock lending pools (derived from strategies)
export const mockLendingPools: MockLendingPool[] = mockStrategies.map((strategy) => {
  const tokenPrice = strategy.tokenSymbol === 'USDC' ? 1 : 
                    strategy.tokenSymbol === 'SOL' ? 100 : 
                    strategy.tokenSymbol === 'mSOL' ? 110 : 1;

  const decimals = strategy.tokenSymbol === 'SOL' || strategy.tokenSymbol === 'mSOL' ? 9 : 6;
  const totalDeposits = strategy.totalDeposited / Math.pow(10, decimals);
  const tvl = totalDeposits * tokenPrice;
  
  const userDeposit = mockUser.deposits.find(d => d.strategyId === strategy.id);

  return {
    id: strategy.id,
    name: strategy.name,
    token: {
      symbol: strategy.tokenSymbol,
      mint: strategy.tokenAddress,
      decimals: decimals,
      icon: `/images/tokens/${strategy.tokenSymbol.toLowerCase()}.png`
    },
    apy: strategy.rewardApy / 10000,
    tvl: tvl,
    totalDeposits: totalDeposits,
    totalYieldDistributed: totalDeposits * (strategy.rewardApy / 10000) * 0.1,
    userDeposit: userDeposit?.amount,
    userYieldEarned: userDeposit?.yieldEarned,
    isActive: strategy.active,
    description: strategy.description,
    riskLevel: strategy.tokenSymbol === 'USDC' ? 'Low' : 
              strategy.tokenSymbol === 'SOL' ? 'Medium' : 'High',
    createdAt: new Date(strategy.createdAt * 1000).toISOString()
  };
});

// Mock marketplace data
export interface MockMarketplaceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  tokenSymbol: string;
  seller: string;
  category: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export const mockMarketplaceItems: MockMarketplaceItem[] = [
  {
    id: "item-1",
    name: "Yield Farming NFT Collection",
    description: "Collection exclusive de NFTs liés au yield farming",
    price: 2.5,
    tokenSymbol: "SOL",
    seller: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    category: "NFT",
    imageUrl: "/images/nft-collection.jpg",
    isActive: true,
    createdAt: "2024-01-15T10:00:00Z"
  },
  {
    id: "item-2",
    name: "DeFi Strategy Guide",
    description: "Guide complet pour maximiser vos rendements DeFi",
    price: 100.0,
    tokenSymbol: "USDC",
    seller: "9yHJfxr7V3s4b2PqLzKwRt8N6mVcXdEfGhUi1QwErTyU",
    category: "Education",
    imageUrl: "/images/defi-guide.jpg",
    isActive: true,
    createdAt: "2024-01-10T14:30:00Z"
  },
  {
    id: "item-3",
    name: "Liquidity Provider Rewards",
    description: "Récompenses pour les fournisseurs de liquidité",
    price: 1.8,
    tokenSymbol: "mSOL",
    seller: "3kJHgXc9VwBp7RtYfQsZ1aEbCdFrGhUi8QwErTyU9Vx",
    category: "Rewards",
    imageUrl: "/images/lp-rewards.jpg",
    isActive: true,
    createdAt: "2024-01-05T09:15:00Z"
  }
];

// Mock global statistics
export const mockGlobalStats = {
  totalValueLocked: 2850000, // Total TVL across all pools
  totalUsers: 1247,
  totalYieldDistributed: 89500,
  averageApy: 11.2,
  topPerformingToken: "mSOL",
  marketplaceVolume: 45600
};

// Mock FAQ data
export const mockFAQs = [
  {
    id: "faq-1",
    question: "Comment fonctionne le yield farming sur DexYield ?",
    answer: "DexYield utilise des stratégies automatisées pour maximiser vos rendements. Vous déposez vos tokens dans nos pools de liquidité et notre algorithme optimise automatiquement les placements pour obtenir le meilleur APY possible."
  },
  {
    id: "faq-2",
    question: "Quels sont les risques ?",
    answer: "Comme tout investissement DeFi, il existe des risques incluant l'impermanent loss, les risques de smart contract, et la volatilité des tokens. Nos pools sont classés par niveau de risque pour vous aider à choisir."
  },
  {
    id: "faq-3",
    question: "Comment puis-je retirer mes fonds ?",
    answer: "Vous pouvez retirer vos fonds à tout moment via l'interface de lending. Les retraits sont traités instantanément sur la blockchain Solana."
  }
];

// Mock notifications
export const mockNotifications = [
  {
    id: "notif-1",
    type: "success" as const,
    message: "Dépôt de 1000 USDC confirmé dans le pool Stable Yield",
    timestamp: "2024-01-15T10:30:00Z"
  },
  {
    id: "notif-2",
    type: "info" as const,
    message: "Nouveau pool SOL disponible avec 18.5% APY",
    timestamp: "2024-01-15T09:15:00Z"
  },
  {
    id: "notif-3",
    type: "warning" as const,
    message: "Le pool mSOL High Yield approche de sa capacité maximale",
    timestamp: "2024-01-15T08:45:00Z"
  }
];
