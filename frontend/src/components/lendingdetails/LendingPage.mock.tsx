// Mock version of the LendingPage with mock data
import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TrendingUp, Coins, Loader2, AlertCircle, Search, Filter } from "lucide-react";
import { useMock } from "@/mock/context";
import { LendingPoolCard } from "./LendingPoolCard";
import { mockLendingPools, type MockLendingPool } from "@/mock/data";
import { MockBadge } from "@/components/ui/MockBadge";

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

interface PoolFilters {
  search: string;
  sortBy: 'apy' | 'tvl' | 'newest';
  riskLevel: 'all' | 'Low' | 'Medium' | 'High';
  activeOnly: boolean;
}

export default function MockLendingPage() {
  const { 
    user, 
    isWalletConnected, 
    loading, 
    deposit, 
    withdraw, 
    redeem,
    globalStats
  } = useMock();

  const [pools, setPools] = useState<MockLendingPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<PoolFilters>({
    search: '',
    sortBy: 'apy',
    riskLevel: 'all',
    activeOnly: false // Changer pour afficher toutes les pools par défaut
  });

  // Charger les pools mock
  const loadPoolsData = useCallback(async () => {
    setIsLoading(true);
    // Simuler un délai de chargement
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Utiliser les pools mock avec les dépôts utilisateur
    const poolsWithUserData = mockLendingPools.map(pool => ({
      ...pool,
      userDeposit: user.deposits.find(d => d.strategyId === pool.id)?.amount,
      userYieldEarned: user.deposits.find(d => d.strategyId === pool.id)?.yieldEarned
    }));
    
    setPools(poolsWithUserData);
    setIsLoading(false);
  }, [user.deposits]);

  useEffect(() => {
    loadPoolsData();
  }, [loadPoolsData]);

  // Filtrer et trier les pools
  const filteredPools = pools.filter(pool => {
    const matchesSearch = pool.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                         pool.token.symbol.toLowerCase().includes(filters.search.toLowerCase());
    const matchesRisk = filters.riskLevel === 'all' || pool.riskLevel === filters.riskLevel;
    const matchesActive = !filters.activeOnly || pool.isActive;
    
    return matchesSearch && matchesRisk && matchesActive;
  }).sort((a, b) => {
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

  // Calculer les statistiques utilisateur
  const userStats = {
    totalDeposited: user.deposits.reduce((sum, dep) => sum + dep.amount, 0),
    totalYieldEarned: user.deposits.reduce((sum, dep) => sum + dep.yieldEarned, 0),
    activePositions: user.deposits.length
  };

  const handleDeposit = async (poolId: string, amount: number) => {
    try {
      const txId = await deposit(poolId, amount);
      toast.success(`Dépôt réussi! Transaction: ${txId}`);
      await loadPoolsData();
    } catch (error) {
      toast.error(`Erreur lors du dépôt: ${error}`);
    }
  };

  const handleWithdraw = async (poolId: string, amount: number) => {
    try {
      const txId = await withdraw(poolId, amount);
      toast.success(`Retrait réussi! Transaction: ${txId}`);
      await loadPoolsData();
    } catch (error) {
      toast.error(`Erreur lors du retrait: ${error}`);
    }
  };

  const handleRedeem = async (poolId: string) => {
    try {
      const txId = await redeem(poolId);
      toast.success(`Récompenses récupérées! Transaction: ${txId}`);
      await loadPoolsData();
    } catch (error) {
      toast.error(`Erreur lors de la récupération: ${error}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Chargement des pools mock...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">{/* pt-24 pour compenser le header fixed + un peu d'espace */}
      {/* Mock Badge */}
      <MockBadge />
      
      {/* Mock mode banner */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-4 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-2">🎭 Mode Mock - Lending & Yield Farming</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="opacity-80">TVL Total</p>
            <p className="font-semibold">${globalStats.totalValueLocked.toLocaleString()}</p>
          </div>
          <div>
            <p className="opacity-80">Utilisateurs</p>
            <p className="font-semibold">{globalStats.totalUsers.toLocaleString()}</p>
          </div>
          <div>
            <p className="opacity-80">APY Moyen</p>
            <p className="font-semibold">{globalStats.averageApy}%</p>
          </div>
          <div>
            <p className="opacity-80">Rendement Distribué</p>
            <p className="font-semibold">${globalStats.totalYieldDistributed.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-center mb-4">
          DexYield Lending Pools
        </h1>
        <p className="text-lg text-gray-600 text-center max-w-2xl mx-auto">
          Découvrez nos pools de prêt optimisés pour maximiser vos rendements DeFi
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TVL Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${globalStats.totalValueLocked.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12.5% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">APY Moyen</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.averageApy}%</div>
            <p className="text-xs text-muted-foreground">
              Calculé sur tous les pools actifs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pools Actifs</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pools.filter(p => p.isActive).length}</div>
            <p className="text-xs text-muted-foreground">
              Sur {pools.length} pools disponibles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Stats (if connected) */}
      {isWalletConnected && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Vos Positions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Déposé</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">${userStats.totalDeposited.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Rendement Gagné</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-green-600">${userStats.totalYieldEarned.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Positions Actives</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{userStats.activePositions}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un pool..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-64"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as PoolFilters['sortBy'] })}
                className="px-3 py-1 border rounded"
              >
                <option value="apy">APY</option>
                <option value="tvl">TVL</option>
                <option value="newest">Plus récent</option>
              </select>
            </div>
            
            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value as PoolFilters['riskLevel'] })}
              className="px-3 py-1 border rounded"
            >
              <option value="all">Tous les risques</option>
              <option value="Low">Faible risque</option>
              <option value="Medium">Risque moyen</option>
              <option value="High">Risque élevé</option>
            </select>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.activeOnly}
                onChange={(e) => setFilters({ ...filters, activeOnly: e.target.checked })}
              />
              <span className="text-sm">Actifs uniquement</span>
            </label>
          </div>
        </div>
      </div>

      {/* Pools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPools.map((pool) => (
          <LendingPoolCard
            key={pool.id}
            pool={pool}
            userConnected={isWalletConnected}
            userTokenBalance={user.balance[pool.token.symbol.toLowerCase() as keyof typeof user.balance] || 0}
            onDeposit={(amount) => handleDeposit(pool.id, amount)}
            onWithdraw={(amount) => handleWithdraw(pool.id, amount)}
            onRedeem={() => handleRedeem(pool.id)}
            loading={loading}
          />
        ))}
      </div>

      {filteredPools.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Aucun pool trouvé
          </h3>
          <p className="text-gray-500">
            Essayez de modifier vos filtres pour voir plus de pools
          </p>
        </div>
      )}
    </div>
  );
}
