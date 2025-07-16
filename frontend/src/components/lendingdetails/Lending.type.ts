export interface LendingPool {
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
  userDepositTime?: number; // Unix timestamp of user's deposit
  isActive: boolean;
  description: string;
  riskLevel: "Low" | "Medium" | "High";
  createdAt: string;
}

export interface Strategy {
  id: string;
  strategyId: number;
  tokenAddress: string;
  rewardApy: number;
  name: string;
  description: string;
  createdAt: number;
  active: boolean;
  totalDeposited: number;
  tokenSymbol: string;
}

export interface PoolFilters {
  search: string;
  sortBy: "apy" | "tvl" | "newest";
  riskLevel: "all" | "Low" | "Medium" | "High";
  activeOnly: boolean;
}
