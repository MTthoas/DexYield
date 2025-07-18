import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertCircle, Search } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useLending } from "@/hooks/useLending";
import { useLendingSimplified } from "@/hooks/useLendingSimplified";
import { useLendingActions } from "@/hooks/useLendingActions";
import { LendingPoolCard } from "./LendingPoolCard";
import {
  TOKEN_SYMBOLS,
  TOKEN_DECIMALS,
  DEVNET_CONFIG,
  DEFAULT_POOL_OWNER,
  USDC_MINT,
} from "@/lib/constants";
import type { LendingPool, PoolFilters, Strategy } from "./Lending.type";
import { WalletInfo } from "@/components/WalletInfo";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Simple toast utility
const toast = {
  success: (message: string) => {
    alert(`Success: ${message}`);
  },
  error: (message: string) => {
    alert(`Error: ${message}`);
  },
  info: (message: string) => {
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
  userDeposits?: any[],
  poolData?: any
): LendingPool[] => {
  // Remove duplicates based on strategy ID
  const uniqueStrategies = strategies.reduce((acc, strategy) => {
    const existingStrategy = acc.find((s) => s.id === strategy.id);
    if (!existingStrategy) {
      acc.push(strategy);
    }
    return acc;
  }, [] as Strategy[]);

  console.log(
    `🔍 Creating pools: ${strategies.length} strategies → ${uniqueStrategies.length} unique strategies`
  );

  return uniqueStrategies.map((strategy) => {
    const tokenAddressStr = getPubkeyString(strategy.tokenAddress);
    const tokenConfig = TOKENS.find((t) => t.mint === tokenAddressStr);
    const userDeposit = userDeposits?.find((d) => d.strategy === strategy.id);
    // Conversion des champs BN en nombre natif
    const rewardApy = getBNNumber(strategy.rewardApy);
    const totalDeposited = getBNNumber(strategy.totalDeposited);
    const createdAt = getBNNumber(strategy.createdAt);
    // Calcul TVL basé sur les vraies données du pool
    const tokenPrice =
      strategy.tokenSymbol === "USDC"
        ? 1
        : strategy.tokenSymbol === "SOL"
          ? 100
          : strategy.tokenSymbol === "mSOL"
            ? 110
            : 1;

    const userDepositAmount = userDeposit ? getBNNumber(userDeposit.amount) : 0;

    // Utiliser directement vaultBalance de la stratégie (comme dans le script)
    const vaultBalance = strategy.vaultBalance || 0;
    
    // Calculer TVL basé sur le vault balance réel (comme dans le script)
    const tvlInTokens = vaultBalance; // vaultBalance est déjà en UI amount
    const tvl = tvlInTokens * tokenPrice;
    
    console.log(`🔍 TVL Debug for ${strategy.name}:`, {
      vaultBalance: strategy.vaultBalance,
      tvlInTokens,
      tokenPrice,
      calculatedTVL: tvl,
      tokenSymbol: strategy.tokenSymbol,
      userDeposit: userDeposit,
      vaultPda: strategy.vaultPda,
    });

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
      tvl: tvl, // Toujours dynamique
      totalDeposits: tvlInTokens, // Toujours dynamique
      totalYieldDistributed: 0, // À calculer en fonction des données réelles
      userDeposit: userDeposit
        ? getBNNumber(userDeposit.amount) /
          Math.pow(10, tokenConfig?.decimals || TOKEN_DECIMALS[strategy.tokenSymbol as keyof typeof TOKEN_DECIMALS] || 6)
        : undefined,
      userYieldEarned: userDeposit
        ? getBNNumber(userDeposit.yieldEarned) /
          Math.pow(10, tokenConfig?.decimals || TOKEN_DECIMALS[strategy.tokenSymbol as keyof typeof TOKEN_DECIMALS] || 6)
        : undefined,
      userDepositTime: userDeposit ? userDeposit.depositTime : undefined,
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
  const { isAdmin } = useAdminAccess();
  const {
    fetchStrategies,
    getUserTokenBalance,
    getUserDeposit,
    getPool,
    loading,
    toggleStrategyStatus,
  } = useLending();
  const {
    redeem,
    initializeStrategy,
    initializeLendingPool,
    checkRedeemAvailability,
    resetUserYield,
  } = useLendingSimplified();
  
  // Utiliser le nouveau hook pour les actions deposit/withdraw
  const {
    deposit,
    withdraw,
    loading: actionsLoading,
    error: actionsError,
  } = useLendingActions();

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [pools, setPools] = useState<LendingPool[]>([]);
  const [userTokenBalances, setUserTokenBalances] = useState<
    Record<string, number>
  >({});
  const [isLoading, setIsLoading] = useState(false); // Par défaut false
  const [filters, setFilters] = useState<PoolFilters>({
    search: "",
    sortBy: "apy",
    riskLevel: "all",
    activeOnly: true,
  });
  const [devMode, setDevMode] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);


  // Refs for component lifecycle management
  const mountedRef = useRef(true);
  const loadingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Charger les stratégies et pools
  const loadPoolsData = useCallback(async () => {
    if (!connected || !publicKey) {
      setIsLoading(false); // Ne pas loader si pas connecté
      return;
    }
    setIsLoading(true);
    try {
      console.log("📞 Calling fetchStrategies...");
      const strategiesDataRaw = await fetchStrategies();
      console.log("📈 strategiesDataRaw received:", strategiesDataRaw);

      const strategiesData = Array.isArray(strategiesDataRaw)
        ? strategiesDataRaw
        : [];
      console.log(
        "📊 strategiesData processed:",
        strategiesData.length,
        "items"
      );

      if (!strategiesDataRaw) {
        console.error(
          "[DEBUG] fetchStrategies returned falsy value:",
          strategiesDataRaw
        );
      }

      if (!mountedRef.current) return; // Vérifier si le composant est encore monté

      setStrategies(strategiesData);

      if (strategiesData.length > 0) {
        // fetchStrategies already includes user deposits and vault balances
        console.log("📊 Using data from fetchStrategies (includes user deposits and vault balances)");
        
        // Extract user deposits from the strategy data that fetchStrategies already populated
        const userDeposits = strategiesData
          .filter(strategy => strategy.userDeposit)
          .map(strategy => strategy.userDeposit);

        if (!mountedRef.current) return; // Vérifier à nouveau avant setState

        console.log("🏊 Creating pools from strategies...");
        const poolsData = createPoolsFromStrategies(
          strategiesData,
          userDeposits,
          null // poolData not needed since fetchStrategies gets vault balances directly
        );
        console.log("🏊 Pools created:", poolsData.length, "pools");
        console.log("🏊 Pools data:", poolsData);
        setPools(poolsData);
      } else {
        if (mountedRef.current) {
          setPools([]);
        }
      }
    } catch (error) {
      console.error("Error loading pools data:", error);
      toast.error("Failed to load pools data");
      if (mountedRef.current) {
        setStrategies([]);
        setPools([]);
      }
    } finally {
      console.log(
        "🔚 loadPoolsData finally block - mounted:",
        mountedRef.current
      );
      if (mountedRef.current) {
        setIsLoading(false);
        console.log("✅ Set isLoading to false");
      } else {
        console.log(
          "❌ Not setting isLoading to false because component is unmounted"
        );
      }
    }
  }, [fetchStrategies, getUserDeposit, connected, publicKey]);

  // Charger les balances utilisateur
  const loadUserBalances = useCallback(async () => {
    if (!connected || !publicKey || strategies.length === 0) return;

    const balances: Record<string, number> = {};

    // Récupérer directement le solde USDC
    try {
      const usdcBalanceRaw = await getUserTokenBalance(USDC_MINT);
      let usdcBalance = 0;
      if (
        usdcBalanceRaw &&
        typeof usdcBalanceRaw === "object" &&
        "balance" in usdcBalanceRaw
      ) {
        // Si c'est un objet TokenAccountInfo avec balance
        usdcBalance = usdcBalanceRaw.balance
          ? Number(usdcBalanceRaw.balance) / Math.pow(10, TOKEN_DECIMALS.USDC)
          : 0;
      } else if (typeof usdcBalanceRaw === "bigint") {
        usdcBalance =
          Number(usdcBalanceRaw) / Math.pow(10, TOKEN_DECIMALS.USDC);
      } else if (typeof usdcBalanceRaw === "number" && !isNaN(usdcBalanceRaw)) {
        usdcBalance = usdcBalanceRaw / Math.pow(10, TOKEN_DECIMALS.USDC);
      }

      balances[USDC_MINT.toString()] = usdcBalance;
    } catch (error) {
      console.error("Error loading USDC balance:", error);
      balances[USDC_MINT.toString()] = 0;
    }

    // Récupérer les balances YT tokens
    try {
      const ytMintAddress = new PublicKey(DEVNET_CONFIG.lending.ytMint);
      const ytBalanceRaw = await getUserTokenBalance(ytMintAddress);
      let ytBalance = 0;
      if (
        ytBalanceRaw &&
        typeof ytBalanceRaw === "object" &&
        "balance" in ytBalanceRaw
      ) {
        ytBalance = ytBalanceRaw.balance
          ? Number(ytBalanceRaw.balance) / Math.pow(10, 6) // YT decimals = 6
          : 0;
      } else if (typeof ytBalanceRaw === "bigint") {
        ytBalance = Number(ytBalanceRaw) / Math.pow(10, 6);
      } else if (typeof ytBalanceRaw === "number" && !isNaN(ytBalanceRaw)) {
        ytBalance = ytBalanceRaw / Math.pow(10, 6);
      }

      balances["YT"] = ytBalance;
      console.log("🪙 YT Balance:", ytBalance);
    } catch (error) {
      console.error("Error loading YT balance:", error);
      balances["YT"] = 0;
    }

    // Récupérer les balances pour les autres stratégies
    for (const strategy of strategies) {
      try {
        const mintStr = new PublicKey(strategy.tokenAddress).toString();
        if (mintStr !== USDC_MINT.toString()) {
          // Check if this is SOL native token
          const SOL_MINT = "So11111111111111111111111111111111111111112";
          if (mintStr === SOL_MINT) {
            // For SOL, use getBalance instead of token account
            const solBalance = await connection.getBalance(publicKey);
            balances[mintStr] = solBalance / 1e9; // Convert lamports to SOL
            console.log(`💰 SOL balance for pool: ${balances[mintStr]} SOL`);
          } else {
            // For other SPL tokens
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
          }
        }
      } catch (error) {
        console.error(
          `Error getting balance for ${strategy.tokenAddress}:`,
          error
        );
        balances[new PublicKey(strategy.tokenAddress).toString()] = 0;
      }
    }
    setUserTokenBalances(balances);
  }, [connected, publicKey, connection, strategies, getUserTokenBalance]);

  // --- Section Wallet SPL tokens (removed unused variables) ---

  // Prix fictifs pour l'affichage (à remplacer par un fetch API si besoin)
  const TOKEN_PRICES: Record<string, number> = {
    USDC: 1,
    SOL: 100,
    mSOL: 110,
  };

  // SPL tokens section removed as it was unused

  // Refs are defined above

  useEffect(() => {
    console.log(
      "🔧 useEffect for loadPoolsData triggered - connected:",
      connected,
      "publicKey:",
      !!publicKey
    );

    if (loadingRef.current) {
      console.log("🔧 loadingRef.current is true, returning early");
      return;
    }

    if (!connected || !publicKey) {
      console.log("🔧 Not connected or no publicKey, skipping loadPoolsData");
      return;
    }

    // Reset mounted ref when wallet connects
    mountedRef.current = true;
    console.log("🔧 Reset mountedRef to true");

    // Débounce pour éviter les appels trop fréquents
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      console.log("🔧 Timeout executed, calling loadPoolsData");
      loadingRef.current = true;
      loadPoolsData().finally(() => {
        loadingRef.current = false;
      });
    }, 100); // Délai de 100ms

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [connected, publicKey, loadPoolsData]); // Added loadPoolsData dependency

  useEffect(() => {
    if (connected && publicKey && strategies.length > 0) {
      loadUserBalances();
    }
  }, [connected, publicKey, strategies.length]); // Seulement dépendant de strategies.length

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      loadingRef.current = false;
    };
  }, []);

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
  const handleDeposit = useCallback(
    async (poolId: string, amount: number) => {
      if (!connected || !publicKey) {
        toast.error("Please connect your wallet");
        return;
      }

      try {
        const strategy = strategies.find((s) => s.id === poolId);
        if (!strategy) throw new Error("Strategy not found");

        const tokenMint = new PublicKey(strategy.tokenAddress);
        const tokenDecimals = TOKEN_DECIMALS[strategy.tokenSymbol as keyof typeof TOKEN_DECIMALS] || 6;
        
        await deposit(
          strategy.id, // strategyAddress (l'ID de la stratégie qui est l'adresse)
          tokenMint,
          strategy.strategyId,
          amount,
          tokenDecimals
        );
        
        toast.success(
          `Successfully deposited ${amount} ${strategy.tokenSymbol}`
        );

        // Recharger les données seulement si nécessaire
        loadingRef.current = false; // Reset loading flag
        await loadPoolsData();
        await loadUserBalances();
      } catch (error) {
        console.error("Deposit error:", error);
        toast.error("Deposit failed");
      }
    },
    [connected, publicKey, strategies, deposit, loadPoolsData, loadUserBalances]
  );

  const handleWithdraw = useCallback(
    async (poolId: string, amount: number) => {
      if (!connected || !publicKey) {
        toast.error("Please connect your wallet");
        return;
      }

      try {
        const strategy = strategies.find((s) => s.id === poolId);
        if (!strategy) throw new Error("Strategy not found");

        const tokenMint = new PublicKey(strategy.tokenAddress);
        const tokenDecimals = TOKEN_DECIMALS[strategy.tokenSymbol as keyof typeof TOKEN_DECIMALS] || 6;
        
        await withdraw(
          strategy.id, // strategyAddress (l'ID de la stratégie qui est l'adresse)
          tokenMint,
          strategy.strategyId,
          amount,
          tokenDecimals
        );
        
        toast.success(
          `Successfully withdrew ${amount} ${strategy.tokenSymbol}`
        );

        // Recharger les données seulement si nécessaire
        loadingRef.current = false; // Reset loading flag
        await loadPoolsData();
        await loadUserBalances();
      } catch (error) {
        console.error("Withdraw error:", error);
        toast.error("Withdraw failed");
      }
    },
    [
      connected,
      publicKey,
      strategies,
      withdraw,
      loadPoolsData,
      loadUserBalances,
    ]
  );

  // Handle toggle strategy status
  const handleToggleStrategy = useCallback(
    async (strategy: Strategy) => {
      if (!connected || !publicKey) {
        toast.error("Please connect your wallet");
        return;
      }

      try {
        const tokenMint = new PublicKey(strategy.tokenAddress);
        await toggleStrategyStatus(tokenMint, strategy.strategyId);

        toast.success(
          `Strategy ${strategy.active ? "deactivated" : "activated"} successfully`
        );

        // Reload data
        loadingRef.current = false;
        await loadPoolsData();
      } catch (error) {
        console.error("Toggle strategy error:", error);
        toast.error("Failed to toggle strategy status");
      }
    },
    [connected, publicKey, toggleStrategyStatus, loadPoolsData]
  );

  const handleRedeem = useCallback(
    async (poolId: string) => {
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

        // Appel de la redeem with strategy information
        await redeem(
          tokenMint,
          userYTBalance,
          strategy.strategyId,
          strategy.id
        );

        toast.success(
          `Successfully redeemed ${userYTBalance.toFixed(6)} ${
            strategy.tokenSymbol
          } yield tokens`
        );

        // Recharger les données seulement si nécessaire
        loadingRef.current = false; // Reset loading flag
        await loadPoolsData();
        await loadUserBalances();
      } catch (error) {
        console.error("Redeem error:", error);

        // Show user-friendly error message
        let errorMessage = "Redeem failed";
        if (error instanceof Error) {
          if (error.message.includes("1 hour after your initial deposit")) {
            errorMessage = error.message; // Use the user-friendly message from useLendingSimplified
          } else {
            errorMessage = `Redeem failed: ${error.message}`;
          }
        }

        toast.error(errorMessage);
      }
    },
    [
      connected,
      publicKey,
      strategies,
      pools,
      redeem,
      loadPoolsData,
      loadUserBalances,
    ]
  );

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
              <div className="text-3xl font-bold mb-1 text-green-400">
                $
                {totalTVL.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
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
          <div className="flex items-center space-x-6">
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
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="devMode"
                checked={devMode}
                onChange={(e) => setDevMode(e.target.checked)}
                className="w-4 h-4 text-accent bg-background border-border rounded focus:ring-accent/50 focus:ring-2"
              />
              <label
                htmlFor="devMode"
                className="text-muted-foreground text-sm font-medium whitespace-nowrap"
              >
                Dev mode
              </label>
            </div>
            {isAdmin && (
              <Button
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                variant="outline"
                size="sm"
                className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50"
              >
                {showAdminPanel ? "Hide Admin" : "Manage Strategies"}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Section Admin pour gérer les stratégies */}
      {isAdmin && showAdminPanel && (
        <section className="w-full px-[5%] lg:px-[8%] xl:px-[12%] mb-8">
          <Card className="bg-orange-950/20 border border-orange-500/30 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                <h3 className="text-xl font-bold text-orange-400">
                  Admin Panel - Manage Strategies
                </h3>
              </div>

              {strategies.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No strategies found</p>
                  <Button
                    onClick={() => loadPoolsData()}
                    variant="outline"
                    className="mt-4 border-border text-foreground hover:bg-muted"
                  >
                    Refresh
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {strategies.map((strategy, index) => (
                    <div
                      key={strategy.id || index}
                      className="p-4 bg-card/50 border border-border rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold text-foreground">
                              {strategy.name ||
                                `Strategy ${strategy.strategyId}`}
                            </h4>
                            <Badge
                              variant={
                                strategy.active ? "default" : "secondary"
                              }
                              className={
                                strategy.active
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-red-500/20 text-red-400 border-red-500/30"
                              }
                            >
                              {strategy.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm mb-2">
                            {strategy.description || "No description"}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span>Token: {strategy.tokenSymbol}</span>
                            <span>
                              APY: {(strategy.rewardApy / 100).toFixed(2)}%
                            </span>
                            <span>ID: {strategy.strategyId}</span>
                          </div>
                        </div>
                        <div className="ml-6">
                          <Button
                            onClick={() => handleToggleStrategy(strategy)}
                            variant={
                              strategy.active ? "destructive" : "default"
                            }
                            size="sm"
                            className={
                              strategy.active
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-green-600 hover:bg-green-700 text-white"
                            }
                            disabled={loading}
                          >
                            {loading ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : strategy.active ? (
                              "Deactivate"
                            ) : (
                              "Activate"
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Debug rapide : nombre de stratégies et pools */}
      {devMode && (
        <section className="w-full px-[5%] lg:px-[8%] xl:px-[12%] mb-2">
          <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
            <div>Strategies: {strategies.length}</div>
            <div>Pools: {pools.length}</div>
            <div>Filtered: {filteredPools.length}</div>
          </div>
          {/* Debug log */}
          <pre className="text-xs text-muted-foreground bg-muted rounded p-2 overflow-x-auto max-h-32 mt-2">
            {JSON.stringify({ strategies, pools, filteredPools }, null, 2)}
          </pre>
        </section>
      )}

      {/* Pools Grid */}
      <section className="w-full px-[5%] lg:px-[8%] xl:px-[12%] pb-16">
        {!connected ? (
          <div className="flex flex-col justify-center items-center py-24">
            <span className="text-muted-foreground text-base">
              Connect your wallet to view pools
            </span>
          </div>
        ) : isLoading ? (
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
                    userBalances={userTokenBalances}
                    onDeposit={(amount) => handleDeposit(pool.id, amount)}
                    onWithdraw={(amount) => handleWithdraw(pool.id, amount)}
                    onRedeem={handleRedeem}
                    checkRedeemAvailability={checkRedeemAvailability}
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
