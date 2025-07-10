import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Coins, ArrowUpRight, ArrowDownLeft, Loader2, AlertCircle, Search, Filter } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useLending } from "@/hooks/useLending";
import { useLendingSimplified } from "@/hooks/useLendingSimplified";
import { LendingPoolCard } from "./LendingPoolCard";
import { TOKEN_SYMBOLS, TOKEN_DECIMALS } from "@/lib/constants";
// Simple toast utility
const toast = {
  success: (message: string) => {
    console.log("✅ Success:", message);
    alert(`Success: ${message}`);
  },
  error: (message: string) => {
    console.error("❌ Error:", message);
    alert(`Error: ${message}`);
  },
  info: (message: string) => {
    console.info("ℹ️ Info:", message);
    alert(`Info: ${message}`);
  }
};

// Types basés sur le smart contract
interface LendingPool {
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

interface Strategy {
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

interface PoolFilters {
  search: string;
  sortBy: 'apy' | 'tvl' | 'newest';
  riskLevel: 'all' | 'Low' | 'Medium' | 'High';
  activeOnly: boolean;
}

// Mapping des tokens à partir des constantes
const TOKENS = Object.entries(TOKEN_SYMBOLS).map(([mint, symbol]) => ({
  mint,
  symbol,
  decimals: TOKEN_DECIMALS[symbol] || 6
}));

// Convertir les stratégies en pools avec données réalistes
// Correction du mapping des stratégies : conversion BN -> number et usage de tokenAddress
const getPubkeyString = (val: any) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val.toBase58 === 'function') return val.toBase58();
  return String(val);
};
const getBNNumber = (val: any) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val.toNumber === 'function') return val.toNumber();
  return Number(val);
};
const createPoolsFromStrategies = (strategies: Strategy[], userDeposits?: any[]): LendingPool[] => {
  return strategies.map((strategy) => {
    const tokenAddressStr = getPubkeyString(strategy.tokenAddress);
    const tokenConfig = TOKENS.find(t => t.mint === tokenAddressStr);
    const userDeposit = userDeposits?.find(d => d.strategy === strategy.id);
    // Conversion des champs BN en nombre natif
    const rewardApy = getBNNumber(strategy.rewardApy);
    const totalDeposited = getBNNumber(strategy.totalDeposited);
    const createdAt = getBNNumber(strategy.createdAt);
    // Calcul TVL basé sur les dépôts totaux avec prix fictifs
    const tokenPrice = strategy.tokenSymbol === 'USDC' ? 1 : 
                      strategy.tokenSymbol === 'SOL' ? 100 : 
                      strategy.tokenSymbol === 'mSOL' ? 110 : 1;
    const tvl = (totalDeposited / Math.pow(10, tokenConfig?.decimals || 6)) * tokenPrice;
    return {
      id: strategy.id,
      name: strategy.name,
      token: {
        symbol: strategy.tokenSymbol,
        mint: tokenAddressStr,
        decimals: tokenConfig?.decimals || 6,
        icon: `/images/tokens/${strategy.tokenSymbol?.toLowerCase?.()}.png`
      },
      apy: rewardApy / 100, // Convertir basis points en pourcentage
      tvl: tvl,
      totalDeposits: totalDeposited / Math.pow(10, tokenConfig?.decimals || 6),
      totalYieldDistributed: totalDeposited * (rewardApy / 10000) * 0.1 / Math.pow(10, tokenConfig?.decimals || 6),
      userDeposit: userDeposit ? getBNNumber(userDeposit.amount) / Math.pow(10, tokenConfig?.decimals || 6) : undefined,
      userYieldEarned: userDeposit ? getBNNumber(userDeposit.yieldEarned) / Math.pow(10, tokenConfig?.decimals || 6) : undefined,
      isActive: strategy.active,
      description: strategy.description,
      riskLevel: strategy.tokenSymbol === 'USDC' ? 'Low' : 
                strategy.tokenSymbol === 'SOL' ? 'Medium' : 'High',
      createdAt: new Date(createdAt * 1000).toISOString() // timestamp unix -> ISO
    };
  });
};

export default function LendingPage() {
  const { connected, publicKey } = useWallet();
  const { 
    fetchStrategies, 
    getUserTokenBalance, 
    getUserDeposit,
    loading 
  } = useLending();
  const { 
    deposit, 
    withdraw, 
    initializeStrategy,
    initializeLendingPool 
  } = useLendingSimplified();

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [pools, setPools] = useState<LendingPool[]>([]);
  const [userTokenBalances, setUserTokenBalances] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<PoolFilters>({
    search: '',
    sortBy: 'apy',
    riskLevel: 'all',
    activeOnly: true
  });

  // Charger les stratégies et pools
  const loadPoolsData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Récupérer les stratégies depuis le smart contract
      const strategiesDataRaw = await fetchStrategies();
      console.log('Fetched strategies:', strategiesDataRaw);
      const strategiesData = Array.isArray(strategiesDataRaw) ? strategiesDataRaw : [];
      console.log('Strategies loaded:', strategiesData);
      if (strategiesData.length > 0) {
        setStrategies(strategiesData);
        // Récupérer les dépôts utilisateur si connecté
        let userDeposits: any[] = [];
        if (connected && publicKey) {
          try {
            userDeposits = await Promise.all(
              strategiesData.map(async (strategy) => {
                try {
                  const depositRaw = await getUserDeposit(publicKey, strategy.id);
                  if (depositRaw && typeof depositRaw === 'object' && typeof depositRaw.amount === 'number') {
                    return {
                      amount: Number(depositRaw.amount) || 0,
                      yieldEarned: Number(depositRaw.yieldEarned) || 0,
                      strategy: strategy.id
                    };
                  }
                  return null;
                } catch {
                  return null;
                }
              })
            );
            userDeposits = userDeposits.filter(Boolean);
          } catch (error) {
            console.log('Error fetching user deposits:', error);
          }
        }
        // Création des pools à partir des stratégies et dépôts utilisateur
        const poolsData = createPoolsFromStrategies(strategiesData, userDeposits);
        setPools(poolsData);
      } else {
        // Si aucune stratégie trouvée, on ne montre rien
        setStrategies([]);
        setPools([]);
      }
    } catch (error) {
      console.error('Error loading pools data:', error);
      toast.error('Failed to load pools data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchStrategies, getUserDeposit, connected, publicKey]);

  // Charger les balances utilisateur
  const loadUserBalances = useCallback(async () => {
    if (!connected || !publicKey) return;
    const balances: Record<string, number> = {};
    for (const strategy of strategies) {
      try {
        const mintStr = new PublicKey(strategy.tokenAddress).toString();
        console.log('Appel getUserTokenBalance pour', mintStr);
        const balanceRaw = await getUserTokenBalance(new PublicKey(strategy.tokenAddress));
        const balance =
          typeof balanceRaw === 'bigint'
            ? Number(balanceRaw)
            : (typeof balanceRaw === 'number' && !isNaN(balanceRaw) ? balanceRaw : 0);
        balances[mintStr] = balance;
        console.log('Solde trouvé pour', mintStr, ':', balance);
      } catch (error) {
        console.log(`Error getting balance for ${strategy.tokenSymbol}:`, error);
        balances[new PublicKey(strategy.tokenAddress).toString()] = 0;
      }
    }
    console.log('userTokenBalances:', balances);
    setUserTokenBalances(balances);
  }, [connected, publicKey, strategies, getUserTokenBalance]);

  useEffect(() => {
    loadPoolsData();
  }, [loadPoolsData]);

  useEffect(() => {
    if (strategies.length > 0) {
      loadUserBalances();
    }
  }, [loadUserBalances, strategies]);

  // Filtrage et tri des pools
  const filteredPools = pools
    .filter(pool => {
      if (filters.search && !pool.name.toLowerCase().includes(filters.search.toLowerCase()) && 
          !pool.token.symbol.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.riskLevel !== 'all' && pool.riskLevel !== filters.riskLevel) {
        return false;
      }
      if (filters.activeOnly && !pool.isActive) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'apy':
          return b.apy - a.apy;
        case 'tvl':
          return b.tvl - a.tvl;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

  // Handlers pour les actions des pools
  const handleDeposit = async (poolId: string, amount: number) => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const strategy = strategies.find(s => s.id === poolId);
      if (!strategy) throw new Error('Strategy not found');

      const tokenMint = new PublicKey(strategy.tokenAddress);
      await deposit(tokenMint, amount);
      toast.success(`Successfully deposited ${amount} ${strategy.tokenSymbol}`);
      
      // Recharger les données
      await loadPoolsData();
      await loadUserBalances();
    } catch (error) {
      console.error('Deposit error:', error);
      toast.error('Deposit failed');
    }
  };

  const handleWithdraw = async (poolId: string, amount: number) => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      const strategy = strategies.find(s => s.id === poolId);
      if (!strategy) throw new Error('Strategy not found');

      const tokenMint = new PublicKey(strategy.tokenAddress);
      await withdraw(tokenMint, amount);
      toast.success(`Successfully withdrew ${amount} ${strategy.tokenSymbol}`);
      
      // Recharger les données
      await loadPoolsData();
      await loadUserBalances();
    } catch (error) {
      console.error('Withdraw error:', error);
      toast.error('Withdraw failed');
    }
  };

  const handleRedeem = async (poolId: string) => {
    // TODO: Implémenter la fonction redeem dans les hooks
    toast.info('Redeem functionality coming soon');
  };

  // Calculer les statistiques globales
  const totalTVL = pools.reduce((sum, pool) => sum + (pool.tvl || 0), 0);
  const averageAPY = pools.length > 0 ? pools.reduce((sum, pool) => sum + (pool.apy || 0), 0) / pools.length : 0;
  const activePoolsCount = pools.filter(pool => pool.isActive).length;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-900 to-black"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(14,165,233,0.15),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_40%,rgba(34,197,94,0.05),transparent_50%)]"></div>

      {/* Animated Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>

      <div className="relative z-10">
        {/* Header Section */}
        <section className="w-full px-[5%] lg:px-[8%] xl:px-[12%] py-16 border-b border-white/10">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-cyan-200 to-blue-300 bg-clip-text text-transparent">
              Solana Lending Pools
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Earn yield on your crypto assets through our secure and automated lending strategies
            </p>
          </div>
        </section>

        {/* Stats Section */}
        <section className="w-full px-[5%] lg:px-[8%] xl:px-[12%] py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/8 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="text-4xl font-bold text-green-400 mb-2">
                  ${totalTVL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-white/60 text-sm font-medium">Total Value Locked</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/8 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="text-4xl font-bold text-blue-400 mb-2">
                  {(averageAPY || 0).toFixed(1)}%
                </div>
                <div className="text-white/60 text-sm font-medium">Average APY</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/8 transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="text-4xl font-bold text-purple-400 mb-2">
                  {activePoolsCount}
                </div>
                <div className="text-white/60 text-sm font-medium">Active Pools</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Filters Section */}
        <section className="w-full px-[5%] lg:px-[8%] xl:px-[12%] py-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
              <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
                  <Input
                    placeholder="Search pools..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 h-11 min-w-[200px]"
                  />
                </div>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm h-11 min-w-[140px] focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="apy" className="bg-gray-800">Sort by APY</option>
                  <option value="tvl" className="bg-gray-800">Sort by TVL</option>
                  <option value="newest" className="bg-gray-800">Sort by Newest</option>
                </select>
                <select
                  value={filters.riskLevel}
                  onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value as any }))}
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm h-11 min-w-[140px] focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="all" className="bg-gray-800">All Risk Levels</option>
                  <option value="Low" className="bg-gray-800">Low Risk</option>
                  <option value="Medium" className="bg-gray-800">Medium Risk</option>
                  <option value="High" className="bg-gray-800">High Risk</option>
                </select>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="activeOnly"
                  checked={filters.activeOnly}
                  onChange={(e) => setFilters(prev => ({ ...prev, activeOnly: e.target.checked }))}
                  className="w-4 h-4 text-blue-500 bg-white/10 border-white/20 rounded focus:ring-blue-500/50 focus:ring-2"
                />
                <label htmlFor="activeOnly" className="text-white/70 text-sm font-medium whitespace-nowrap">
                  Active pools only
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Pools Grid */}
        <section className="w-full px-[5%] lg:px-[8%] xl:px-[12%] py-16">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-24">
              <div className="w-12 h-12 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <span className="text-white/70 text-lg">Loading pools...</span>
            </div>
          ) : filteredPools.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-white/50" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">No pools found</h3>
              <p className="text-white/60 text-lg">Try adjusting your filters or check back later.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white">
                  Available Pools ({filteredPools.length})
                </h2>
                <div className="text-white/60 text-sm">
                  Showing {filteredPools.length} of {pools.length} pools
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                {filteredPools.map((pool) => {
                  const mintStr = new PublicKey(pool.token.mint).toString();
                  console.log('pool.token.mint:', mintStr, 'solde:', userTokenBalances[mintStr]);
                  return (
                    <LendingPoolCard
                      key={pool.id}
                      pool={pool}
                      userConnected={connected}
                      userTokenBalance={userTokenBalances[mintStr] || 0}
                      onDeposit={(amount) => handleDeposit(pool.id, amount)}
                      onWithdraw={(amount) => handleWithdraw(pool.id, amount)}
                      onRedeem={() => handleRedeem(pool.id)}
                      loading={loading}
                    />
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
