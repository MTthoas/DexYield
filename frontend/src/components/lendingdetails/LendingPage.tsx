import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertCircle, Search } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useLending } from "@/hooks/useLending";
import { useLendingSimplified } from "@/hooks/useLendingSimplified";
import { LendingPoolCard } from "./LendingPoolCard";
import { TOKEN_SYMBOLS, TOKEN_DECIMALS } from "@/lib/constants";
import type { LendingPool, PoolFilters, Strategy } from "./Lending.type";
import { WalletInfo } from "@/components/WalletInfo";
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
  },
};

// Mapping des tokens à partir des constantes
const TOKENS = Object.entries(TOKEN_SYMBOLS).map(([mint, symbol]) => ({
  mint,
  symbol,
  decimals: TOKEN_DECIMALS[symbol] || 6,
}));

// Convertir les stratégies en pools avec données réalistes
// Correction du mapping des stratégies : conversion BN -> number et usage de tokenAddress
const getPubkeyString = (val: any) => {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val.toBase58 === "function") return val.toBase58();
  return String(val);
};
const getBNNumber = (val: any) => {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (typeof val.toNumber === "function") return val.toNumber();
  return Number(val);
};
const createPoolsFromStrategies = (
  strategies: Strategy[],
  userDeposits?: any[]
): LendingPool[] => {
  return strategies.map((strategy) => {
    const tokenAddressStr = getPubkeyString(strategy.tokenAddress);
    const tokenConfig = TOKENS.find((t) => t.mint === tokenAddressStr);
    const userDeposit = userDeposits?.find((d) => d.strategy === strategy.id);
    // Conversion des champs BN en nombre natif
    const rewardApy = getBNNumber(strategy.rewardApy);
    const totalDeposited = getBNNumber(strategy.totalDeposited);
    const createdAt = getBNNumber(strategy.createdAt);
    // Calcul TVL basé sur les dépôts totaux avec prix fictifs
    const tokenPrice =
      strategy.tokenSymbol === "USDC"
        ? 1
        : strategy.tokenSymbol === "SOL"
        ? 100
        : strategy.tokenSymbol === "mSOL"
        ? 110
        : 1;
    const tvl =
      (totalDeposited / Math.pow(10, tokenConfig?.decimals || 6)) * tokenPrice;
    return {
      id: strategy.id,
      name: strategy.name,
      token: {
        symbol: strategy.tokenSymbol,
        mint: tokenAddressStr,
        decimals: tokenConfig?.decimals || 6,
        icon: `/images/tokens/${strategy.tokenSymbol?.toLowerCase?.()}.png`,
      },
      apy: rewardApy / 100, // Convertir basis points en pourcentage
      tvl: tvl,
      totalDeposits: totalDeposited / Math.pow(10, tokenConfig?.decimals || 6),
      totalYieldDistributed:
        (totalDeposited * (rewardApy / 10000) * 0.1) /
        Math.pow(10, tokenConfig?.decimals || 6),
      userDeposit: userDeposit
        ? getBNNumber(userDeposit.amount) /
          Math.pow(10, tokenConfig?.decimals || 6)
        : undefined,
      userYieldEarned: userDeposit
        ? getBNNumber(userDeposit.yieldEarned) /
          Math.pow(10, tokenConfig?.decimals || 6)
        : undefined,
      isActive: strategy.active,
      description: strategy.description,
      riskLevel:
        strategy.tokenSymbol === "USDC"
          ? "Low"
          : strategy.tokenSymbol === "SOL"
          ? "Medium"
          : "High",
      createdAt: new Date(createdAt * 1000).toISOString(), // timestamp unix -> ISO
    };
  });
};

export default function LendingPage() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const { fetchStrategies, getUserTokenBalance, getUserDeposit, loading } =
    useLending();
  const {
    deposit,
    withdraw,
    redeem,
    initializeStrategy,
    initializeLendingPool,
  } = useLendingSimplified();

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [pools, setPools] = useState<LendingPool[]>([]);
  const [userTokenBalances, setUserTokenBalances] = useState<
    Record<string, number>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<PoolFilters>({
    search: "",
    sortBy: "apy",
    riskLevel: "all",
    activeOnly: true,
  });

  // Charger les stratégies et pools
  const loadPoolsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const strategiesDataRaw = await fetchStrategies();
      const strategiesData = Array.isArray(strategiesDataRaw)
        ? strategiesDataRaw
        : [];
      if (strategiesData.length > 0) {
        setStrategies(strategiesData);
        let userDeposits: any[] = [];
        if (connected && publicKey) {
          try {
            userDeposits = await Promise.all(
              strategiesData.map(async (strategy) => {
                try {
                  const depositRaw = await getUserDeposit(
                    publicKey,
                    strategy.id
                  );
                  if (
                    depositRaw &&
                    typeof depositRaw === "object" &&
                    typeof depositRaw.amount === "number"
                  ) {
                    return {
                      amount: Number(depositRaw.amount) || 0,
                      yieldEarned: Number(depositRaw.yieldEarned) || 0,
                      strategy: strategy.id,
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
            toast.error("Failed to fetch user deposits");
          }
        }
        const poolsData = createPoolsFromStrategies(
          strategiesData,
          userDeposits
        );
        setPools(poolsData);
      } else {
        setStrategies([]);
        setPools([]);
      }
    } catch (error) {
      toast.error("Failed to load pools data");
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
        const balanceRaw = await getUserTokenBalance(
          new PublicKey(strategy.tokenAddress)
        );
        const balance =
          typeof balanceRaw === "bigint"
            ? Number(balanceRaw)
            : typeof balanceRaw === "number" && !isNaN(balanceRaw)
            ? balanceRaw
            : 0;
        balances[mintStr] = balance;
      } catch {
        balances[new PublicKey(strategy.tokenAddress).toString()] = 0;
      }
    }
    setUserTokenBalances(balances);
  }, [connected, publicKey, strategies, getUserTokenBalance]);

  // --- Section Wallet SPL tokens ---
  const [splTokens, setSplTokens] = useState<any[]>([]);
  const [splLoading, setSplLoading] = useState(false);

  // Prix fictifs pour l'affichage (à remplacer par un fetch API si besoin)
  const TOKEN_PRICES: Record<string, number> = {
    USDC: 1,
    SOL: 100,
    mSOL: 110,
  };

  // Récupérer tous les tokens SPL du wallet
  useEffect(() => {
    const fetchSplTokens = async () => {
      if (!connected || !publicKey) {
        setSplTokens([]);
        return;
      }
      setSplLoading(true);
      try {
        const resp = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: new PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          ),
        });
        const tokens = resp.value
          .map((acc) => {
            const info = acc.account.data.parsed.info;
            const mint = info.mint;
            const amount = parseFloat(info.tokenAmount.uiAmountString || "0");
            const decimals = info.tokenAmount.decimals;
            // On tente de matcher avec TOKENS pour le logo/symbole, sinon fallback
            const meta = TOKENS.find((t) => t.mint === mint) || {
              symbol: mint.slice(0, 4) + "...",
              icon: "/images/tokens/unknown.png",
              decimals,
            };
            const price = TOKEN_PRICES[meta.symbol] || 0;
            return {
              mint,
              symbol: meta.symbol,
              icon:
                meta.icon ||
                `/images/tokens/${meta.symbol?.toLowerCase?.()}.png`,
              amount,
              value: amount * price,
              decimals,
            };
          })
          .filter((t) => t.amount > 0);
        setSplTokens(tokens);
      } catch (e) {
        setSplTokens([]);
      } finally {
        setSplLoading(false);
      }
    };
    fetchSplTokens();
  }, [connected, publicKey, connection]);

  useEffect(() => {
    loadPoolsData();
  }, [loadPoolsData]);

  useEffect(() => {
    if (strategies.length > 0) {
      loadUserBalances();
    }
  }, [loadUserBalances, strategies]);

  // Filtrage et tri des pools (optimisé avec useMemo)
  const filteredPools = useMemo(
    () =>
      pools
        .filter((pool) => {
          if (
            filters.search &&
            !pool.name.toLowerCase().includes(filters.search.toLowerCase()) &&
            !pool.token.symbol
              .toLowerCase()
              .includes(filters.search.toLowerCase())
          ) {
            return false;
          }
          if (
            filters.riskLevel !== "all" &&
            pool.riskLevel !== filters.riskLevel
          ) {
            return false;
          }
          if (filters.activeOnly && !pool.isActive) {
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          switch (filters.sortBy) {
            case "apy":
              return b.apy - a.apy;
            case "tvl":
              return b.tvl - a.tvl;
            case "newest":
              return (
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
              );
            default:
              return 0;
          }
        }),
    [pools, filters]
  );

  // Statistiques globales optimisées avec useMemo
  const totalTVL = useMemo(
    () => pools.reduce((sum, pool) => sum + (pool.tvl || 0), 0),
    [pools]
  );
  const averageAPY = useMemo(
    () =>
      pools.length > 0
        ? pools.reduce((sum, pool) => sum + (pool.apy || 0), 0) / pools.length
        : 0,
    [pools]
  );
  const activePoolsCount = useMemo(
    () => pools.filter((pool) => pool.isActive).length,
    [pools]
  );

  // Handlers pour les actions des pools
  const handleDeposit = async (poolId: string, amount: number) => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      const strategy = strategies.find((s) => s.id === poolId);
      if (!strategy) throw new Error("Strategy not found");

      const tokenMint = new PublicKey(strategy.tokenAddress);
      await deposit(tokenMint, amount);
      toast.success(`Successfully deposited ${amount} ${strategy.tokenSymbol}`);

      // Recharger les données
      await loadPoolsData();
      await loadUserBalances();
    } catch (error) {
      console.error("Deposit error:", error);
      toast.error("Deposit failed");
    }
  };

  const handleWithdraw = async (poolId: string, amount: number) => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      const strategy = strategies.find((s) => s.id === poolId);
      if (!strategy) throw new Error("Strategy not found");

      const tokenMint = new PublicKey(strategy.tokenAddress);
      await withdraw(tokenMint, amount);
      toast.success(`Successfully withdrew ${amount} ${strategy.tokenSymbol}`);

      // Recharger les données
      await loadPoolsData();
      await loadUserBalances();
    } catch (error) {
      console.error("Withdraw error:", error);
      toast.error("Withdraw failed");
    }
  };

  const handleRedeem = async (poolId: string) => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      const strategy = strategies.find((s) => s.id === poolId);
      if (!strategy) throw new Error("Strategy not found");

      const pool = pools.find((p) => p.id === poolId);
      if (!pool || !pool.userDeposit || pool.userDeposit <= 0) {
        toast.error("No deposits found to redeem");
        return;
      }

      // Récupérer le solde yield du user en respectant le ratio 1:1
      const userYTBalance = pool.userYieldEarned || 0;
      if (userYTBalance <= 0) {
        toast.error("No yield tokens to redeem");
        return;
      }

      const tokenMint = new PublicKey(strategy.tokenAddress);

      // Appel de la redeem
      await redeem(tokenMint, userYTBalance);

      toast.success(
        `Successfully redeemed ${userYTBalance.toFixed(6)} ${
          strategy.tokenSymbol
        } yield tokens`
      );

      // Recharger les données
      await loadPoolsData();
      await loadUserBalances();
    } catch (error) {
      console.error("Redeem error:", error);
      toast.error(
        "Redeem failed: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-20">
      {/* Section Wallet dédiée */}

      {/* Header minimaliste + Wallet */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-[5%] lg:px-[8%] xl:px-[12%] mt-4 mb-8">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Solana Lending Pools
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto md:mx-0">
            Earn yield on your crypto assets through secure and automated
            lending strategies.
          </p>
        </div>
      </div>

      <WalletInfo />

      {/* Statistiques */}
      <section className="w-full px-[5%] lg:px-[8%] xl:px-[12%] mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border border-border shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold mb-1">
                $
                {totalTVL.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </div>
              <div className="text-muted-foreground text-xs">
                Total Value Locked
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border border-border shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold mb-1">
                {(averageAPY || 0).toFixed(1)}%
              </div>
              <div className="text-muted-foreground text-xs">Average APY</div>
            </CardContent>
          </Card>
          <Card className="bg-card border border-border shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold mb-1">{activePoolsCount}</div>
              <div className="text-muted-foreground text-xs">Active Pools</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Filtres */}
      <section className="w-full px-[5%] lg:px-[8%] xl:px-[12%] mb-8">
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search pools..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground h-10 min-w-[180px]"
              />
            </div>
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  sortBy: e.target.value as any,
                }))
              }
              className="bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm h-10 min-w-[120px]"
            >
              <option value="apy">Sort by APY</option>
              <option value="tvl">Sort by TVL</option>
              <option value="newest">Sort by Newest</option>
            </select>
            <select
              value={filters.riskLevel}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  riskLevel: e.target.value as any,
                }))
              }
              className="bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm h-10 min-w-[120px]"
            >
              <option value="all">All Risk Levels</option>
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="activeOnly"
              checked={filters.activeOnly}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  activeOnly: e.target.checked,
                }))
              }
              className="w-4 h-4 text-accent bg-background border-border rounded focus:ring-accent/50 focus:ring-2"
            />
            <label
              htmlFor="activeOnly"
              className="text-muted-foreground text-sm font-medium whitespace-nowrap"
            >
              Active pools only
            </label>
          </div>
        </div>
      </section>

      {/* Pools Grid */}
      <section className="w-full px-[5%] lg:px-[8%] xl:px-[12%] pb-16">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-24">
            <div className="w-10 h-10 border-4 border-border border-t-accent rounded-full animate-spin mb-4"></div>
            <span className="text-muted-foreground text-base">
              Loading pools...
            </span>
          </div>
        ) : filteredPools.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No pools found</h3>
            <p className="text-muted-foreground text-base">
              Try adjusting your filters or check back later.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">
                Available Pools ({filteredPools.length})
              </h2>
              <div className="text-muted-foreground text-xs">
                Showing {filteredPools.length} of {pools.length} pools
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredPools.map((pool) => {
                const mintStr = new PublicKey(pool.token.mint).toString();
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
  );
}
