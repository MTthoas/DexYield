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
import { TrendingUp, Coins, ArrowUpRight, ArrowDownLeft, Loader2, AlertCircle } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useLending } from "@/hooks/useLending";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { findStrategyPDA } from "@/lib/contracts";
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
  owner: string;
  totalDeposits: number;
  totalYieldDistributed: number;
  vaultAccount: string;
  createdAt: number;
  active: boolean;
  strategy: Strategy;
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

// Données mock basées sur le smart contract
const mockStrategies: Strategy[] = [
  {
    id: "1",
    tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    rewardApy: 8500, // 8.5%
    name: "USDC Yield Strategy",
    description:
      "Stable yield farming strategy for USDC with low risk and consistent returns",
    createdAt: Date.now() - 86400000 * 30,
    active: true,
    totalDeposited: 2500000,
    tokenSymbol: "USDC",
  },
  {
    id: "2",
    tokenAddress: "So11111111111111111111111111111111111111112",
    rewardApy: 12000, // 12%
    name: "SOL Staking Strategy",
    description: "High-yield SOL staking strategy with automated compounding",
    createdAt: Date.now() - 86400000 * 15,
    active: true,
    totalDeposited: 890000,
    tokenSymbol: "SOL",
  },
  {
    id: "3",
    tokenAddress: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    rewardApy: 15500, // 15.5%
    name: "mSOL Liquidity Pool",
    description: "Premium liquid staking strategy with mSOL tokens",
    createdAt: Date.now() - 86400000 * 7,
    active: true,
    totalDeposited: 1200000,
    tokenSymbol: "mSOL",
  },
];

const mockPools: LendingPool[] = mockStrategies.map((strategy) => ({
  id: strategy.id,
  owner: "BZUEgp9psZegJarKqAH5WC6HSYCQ4fY2XphuCd5RsyeF",
  totalDeposits: strategy.totalDeposited,
  totalYieldDistributed: Math.floor(
    strategy.totalDeposited * (strategy.rewardApy / 10000) * 0.3
  ),
  vaultAccount: `vault_${strategy.id}`,
  createdAt: strategy.createdAt,
  active: strategy.active,
  strategy,
}));

// Helper function to get token symbol from address
const getTokenSymbol = (tokenAddress: string): string => {
  const tokenMap: Record<string, string> = {
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
    "So11111111111111111111111111111111111111112": "SOL",
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": "mSOL",
  };
  return tokenMap[tokenAddress] || "UNKNOWN";
};

export default function LendingPage() {
  const { connected, publicKey } = useWallet();
  const { 
    loading, 
    error, 
    strategies, 
    fetchStrategies, 
    deposit, 
    withdraw, 
    initializeUserDeposit,
    getUserDeposit,
    getStrategy,
    getUserTokenBalance,
    createStrategy,
    initializeLendingPool
  } = useLending();
  
  const [selectedPool, setSelectedPool] = useState<LendingPool | null>(null);
  const [actionType, setActionType] = useState<"deposit" | "withdraw" | null>(
    null
  );
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [realStrategies, setRealStrategies] = useState<any[]>([]);
  const [userBalances, setUserBalances] = useState<Record<string, number>>({});
  const [showInitializationPanel, setShowInitializationPanel] = useState(false);
  const [initializingStrategy, setInitializingStrategy] = useState<string | null>(null);

  // Load strategies from blockchain
  useEffect(() => {
    if (connected && fetchStrategies) {
      fetchStrategies().catch(err => {
        console.error("Error in fetchStrategies:", err);
        toast.error("Failed to load strategies from blockchain");
        setRealStrategies([]);
      });
    }
  }, [connected, fetchStrategies]);

  // Update real strategies when blockchain data changes
  useEffect(() => {
    if (strategies && strategies.length > 0) {
      console.log("Raw strategies from blockchain:", strategies);
      
      try {
        // Transform blockchain data to match expected format
        const transformedStrategies = strategies.map((strategy, index) => {
          console.log("Processing strategy:", strategy);
          
          // Handle different possible data structures
          const account = strategy.account || strategy;
          const publicKey = strategy.publicKey || `strategy_${index}`;
          
          // Safe conversion helper
          const safeConvertBN = (value: any, fallback: number = 0) => {
            try {
              if (!value) return fallback;
              if (typeof value === 'number') return value;
              if (value._bn) return value.toNumber();
              if (value.toNumber) return value.toNumber();
              if (value.toString) {
                const parsed = parseInt(value.toString());
                return isNaN(parsed) ? fallback : parsed;
              }
              return fallback;
            } catch (e) {
              console.error("Error converting value:", value, e);
              return fallback;
            }
          };
          
          return {
            id: typeof publicKey === 'string' ? publicKey : publicKey.toString(),
            owner: "BZUEgp9psZegJarKqAH5WC6HSYCQ4fY2XphuCd5RsyeF",
            totalDeposits: safeConvertBN(account?.totalDeposited, 0),
            totalYieldDistributed: 0,
            vaultAccount: `vault_${index}`,
            createdAt: Date.now(),
            active: true,
            strategy: {
              id: typeof publicKey === 'string' ? publicKey : publicKey.toString(),
              tokenAddress: account?.tokenAddress?.toString() || "",
              rewardApy: safeConvertBN(account?.rewardApy, 0),
              name: account?.name || `Strategy ${index + 1}`,
              description: account?.description || "Blockchain strategy",
              createdAt: Date.now(),
              active: true,
              totalDeposited: safeConvertBN(account?.totalDeposited, 0),
              tokenSymbol: getTokenSymbol(account?.tokenAddress?.toString() || "")
            }
          };
        });
        
        console.log("Transformed strategies:", transformedStrategies);
        setRealStrategies(transformedStrategies);
      } catch (error) {
        console.error("Error transforming strategies:", error);
        // Fall back to mock data if transformation fails
        setRealStrategies([]);
      }
    } else {
      // No strategies from blockchain, use mock data
      setRealStrategies([]);
    }
  }, [strategies]);

  // Get user balance for a specific pool
  const getUserBalance = (poolId: string) => {
    return userBalances[poolId] || 0;
  };

  // Load user balances for all strategies
  const loadUserBalances = useCallback(async () => {
    if (!connected || !publicKey) return;
    
    const balances: Record<string, number> = {};
    
    for (const strategy of mockStrategies) {
      try {
        const tokenMint = new PublicKey(strategy.tokenAddress);
        const balanceInfo = await getUserTokenBalance(tokenMint);
        
        if (balanceInfo && balanceInfo.exists && balanceInfo.balance) {
          // Convert balance from lamports to tokens (assuming 6 decimals for most tokens)
          const decimals = 6;
          const balance = Number(balanceInfo.balance) / Math.pow(10, decimals);
          balances[strategy.id] = balance;
        } else {
          balances[strategy.id] = 0;
        }
      } catch (error) {
        console.error(`Error loading balance for ${strategy.tokenSymbol}:`, error);
        balances[strategy.id] = 0;
      }
    }
    
    setUserBalances(balances);
  }, [connected, publicKey, getUserTokenBalance]);

  // Load user balances when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      loadUserBalances();
    }
  }, [connected, publicKey, loadUserBalances]);

  const formatCurrency = (amount: number, symbol: string = "USDC") => {
    return `${amount.toLocaleString()} ${symbol}`;
  };

  const formatApy = (apy: number) => {
    return `${(apy / 100).toFixed(2)}%`;
  };

  const handleDeposit = async () => {
    if (!selectedPool || !amount || !publicKey || !connected) {
      toast.error("Please connect your wallet and enter a valid amount");
      return;
    }

    // Check if strategy exists on blockchain
    try {
      const tokenAddress = new PublicKey(selectedPool.strategy.tokenAddress);
      const strategyData = await getStrategy(tokenAddress);
      if (!strategyData) {
        toast.error("Strategy not found on blockchain. Please initialize the strategy first.");
        return;
      }
    } catch (error) {
      toast.error("Strategy not initialized. Please initialize the strategy first.");
      return;
    }

    setIsProcessing(true);
    try {
      // Validate PublicKey inputs
      let poolOwnerPubkey: PublicKey;
      let tokenAddressPubkey: PublicKey;
      let strategyPubkey: PublicKey;
      
      try {
        poolOwnerPubkey = new PublicKey(selectedPool.owner);
      } catch (e) {
        throw new Error(`Invalid pool owner address: ${selectedPool.owner}`);
      }
      
      try {
        tokenAddressPubkey = new PublicKey(selectedPool.strategy.tokenAddress || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
      } catch (e) {
        throw new Error(`Invalid token address: ${selectedPool.strategy.tokenAddress}`);
      }
      
      try {
        // For real strategies, use the strategy PDA derived from token address
        if (selectedPool.strategy.tokenAddress) {
          strategyPubkey = findStrategyPDA(tokenAddressPubkey)[0];
        } else {
          // Fallback for mock data
          strategyPubkey = new PublicKey("11111111111111111111111111111111");
        }
      } catch (e) {
        throw new Error(`Invalid strategy: ${selectedPool.strategy.id}`);
      }
      
      // Get associated token accounts
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenAddressPubkey,
        publicKey
      );
      
      // Create a mock YT mint address (you should get this from your strategy)
      const ytMint = new PublicKey("So11111111111111111111111111111111111111112"); // SOL mint as example
      const userYtAccount = await getAssociatedTokenAddress(
        ytMint,
        publicKey
      );
      
      // Create a mock vault account (you should get this from your pool)
      const vaultAccount = new PublicKey("So11111111111111111111111111111111111111112"); // SOL mint as example
      
      // Convert amount to the proper format (considering decimals)
      const amountBN = Math.floor(parseFloat(amount) * Math.pow(10, 6)); // Assuming 6 decimals
      
      // Try to initialize user deposit if needed
      try {
        await initializeUserDeposit(poolOwnerPubkey, strategyPubkey);
        toast.info("User deposit account initialized");
      } catch (initError) {
        console.log("User deposit may already exist:", initError);
      }
      
      // Perform the actual deposit
      const txId = await deposit(
        poolOwnerPubkey,
        strategyPubkey,
        amountBN,
        userTokenAccount,
        userYtAccount,
        vaultAccount,
        ytMint
      );
      
      toast.success(`Deposit successful! Transaction: ${txId}`);
      setAmount("");
      setActionType(null);
      
      // Refresh data
      fetchStrategies();
      loadUserBalances();
      
    } catch (error) {
      console.error("Deposit error:", error);
      toast.error(`Deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedPool || !amount || !publicKey || !connected) {
      toast.error("Please connect your wallet and enter a valid amount");
      return;
    }

    setIsProcessing(true);
    try {
      // Validate PublicKey inputs
      let poolOwnerPubkey: PublicKey;
      let tokenAddressPubkey: PublicKey;
      let strategyPubkey: PublicKey;
      
      try {
        poolOwnerPubkey = new PublicKey(selectedPool.owner);
      } catch (e) {
        throw new Error(`Invalid pool owner address: ${selectedPool.owner}`);
      }
      
      try {
        tokenAddressPubkey = new PublicKey(selectedPool.strategy.tokenAddress || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
      } catch (e) {
        throw new Error(`Invalid token address: ${selectedPool.strategy.tokenAddress}`);
      }
      
      try {
        // For real strategies, use the strategy PDA derived from token address
        if (selectedPool.strategy.tokenAddress) {
          strategyPubkey = findStrategyPDA(tokenAddressPubkey)[0];
        } else {
          // Fallback for mock data
          strategyPubkey = new PublicKey("11111111111111111111111111111111");
        }
      } catch (e) {
        throw new Error(`Invalid strategy: ${selectedPool.strategy.id}`);
      }
      
      // Get associated token accounts
      const userTokenAccount = await getAssociatedTokenAddress(
        tokenAddressPubkey,
        publicKey
      );
      
      // Create a mock YT mint address (you should get this from your strategy)
      const ytMint = new PublicKey("So11111111111111111111111111111111111111112"); // SOL mint as example
      const userYtAccount = await getAssociatedTokenAddress(
        ytMint,
        publicKey
      );
      
      // Create a mock vault account (you should get this from your pool)
      const vaultAccount = new PublicKey("So11111111111111111111111111111111111111112"); // SOL mint as example
      
      // Convert amount to the proper format (considering decimals)
      const amountBN = Math.floor(parseFloat(amount) * Math.pow(10, 6)); // Assuming 6 decimals
      
      // Perform the actual withdrawal
      const txId = await withdraw(
        poolOwnerPubkey,
        strategyPubkey,
        amountBN,
        userTokenAccount,
        userYtAccount,
        vaultAccount,
        ytMint
      );
      
      toast.success(`Withdrawal successful! Transaction: ${txId}`);
      setAmount("");
      setActionType(null);
      
      // Refresh data
      fetchStrategies();
      loadUserBalances();
      
    } catch (error) {
      console.error("Withdrawal error:", error);
      toast.error(`Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetMaxAmount = () => {
    if (!selectedPool) return;

    if (actionType === "withdraw") {
      const userBalance = getUserBalance(selectedPool.id);
      setAmount(userBalance.toString());
    } else if (actionType === "deposit") {
      // Pour le deposit, on peut simuler un wallet balance
      setAmount("1000"); // Exemple de montant max
    }
  };

  const closeActionModal = () => {
    setActionType(null);
    setAmount("");
  };

  // Initialize a strategy on the blockchain
  const handleInitializeStrategy = async (strategyData: Strategy) => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    setInitializingStrategy(strategyData.id);
    try {
      const tokenAddress = new PublicKey(strategyData.tokenAddress);
      const txId = await createStrategy(
        tokenAddress,
        strategyData.rewardApy,
        strategyData.name,
        strategyData.description
      );
      
      toast.success(`Strategy initialized! Transaction: ${txId}`);
      
      // Refresh strategies
      fetchStrategies();
      
    } catch (error) {
      console.error("Strategy initialization error:", error);
      toast.error(`Failed to initialize strategy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setInitializingStrategy(null);
    }
  };

  // Initialize a lending pool on the blockchain
  const handleInitializeLendingPool = async (strategy: Strategy) => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    setInitializingStrategy(strategy.id);
    try {
      // Create a mock vault account (in a real implementation, this would be a proper token account)
      const vaultAccount = new PublicKey("So11111111111111111111111111111111111111112");
      
      // Initialize the lending pool
      const txId = await initializeLendingPool(publicKey, vaultAccount);
      
      toast.success(`Lending pool initialized! Transaction: ${txId}`);
      
      // Refresh data
      fetchStrategies();
      
    } catch (error) {
      console.error("Pool initialization error:", error);
      toast.error(`Failed to initialize pool: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setInitializingStrategy(null);
    }
  };

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
              Earn yield on your crypto assets through our secure and automated
              lending strategies
            </p>
          </div>
        </section>

        <div className="w-full px-[5%] lg:px-[8%] xl:px-[12%] py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Total Value Locked
                </CardTitle>
                <Coins className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  $
                  {(realStrategies.length > 0 ? realStrategies : mockPools)
                    .reduce((sum, pool) => {
                      const deposits = typeof pool.totalDeposits === 'number' ? pool.totalDeposits : 0;
                      return sum + deposits;
                    }, 0)
                    .toLocaleString()}
                </div>
                <p className="text-xs text-white/60">
                  Across {(realStrategies.length > 0 ? realStrategies : mockPools).filter((p) => p.active).length} active pools
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Average APY
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {(() => {
                    const pools = realStrategies.length > 0 ? realStrategies : mockPools;
                    const totalApy = pools.reduce((sum, pool) => {
                      const apy = typeof pool.strategy?.rewardApy === 'number' ? pool.strategy.rewardApy : 0;
                      return sum + apy;
                    }, 0);
                    return formatApy(pools.length > 0 ? totalApy / pools.length : 0);
                  })()}
                </div>
                <p className="text-xs text-white/60">
                  Weighted average across all strategies
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Total Yield Distributed
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  $
                  {(realStrategies.length > 0 ? realStrategies : mockPools)
                    .reduce((sum, pool) => {
                      const distributed = typeof pool.totalYieldDistributed === 'number' ? pool.totalYieldDistributed : 0;
                      return sum + distributed;
                    }, 0)
                    .toLocaleString()}
                </div>
                <p className="text-xs text-white/60">
                  Lifetime rewards to users
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Initialization Panel */}
          {connected && (
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-white mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-white">
                    Pool & Strategy Management
                  </CardTitle>
                  <Button
                    onClick={() => setShowInitializationPanel(!showInitializationPanel)}
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-slate-800/80"
                  >
                    {showInitializationPanel ? "Hide" : "Show"} Admin Panel
                  </Button>
                </div>
                <CardDescription className="text-white/70">
                  Initialize strategies and pools on the blockchain
                </CardDescription>
              </CardHeader>
              
              {showInitializationPanel && (
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mockStrategies.map((strategy) => (
                      <div
                        key={strategy.id}
                        className="p-4 bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm"
                      >
                        <h3 className="font-semibold text-white mb-2">{strategy.name}</h3>
                        <p className="text-sm text-white/70 mb-3 line-clamp-2">
                          {strategy.description}
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-white/70">Token:</span>
                            <span className="text-white">{strategy.tokenSymbol}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70">APY:</span>
                            <span className="text-green-400">{formatApy(strategy.rewardApy)}</span>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <Button
                            onClick={() => handleInitializeStrategy(strategy)}
                            disabled={initializingStrategy === strategy.id || loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 text-sm py-2"
                          >
                            {initializingStrategy === strategy.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                Initializing...
                              </>
                            ) : (
                              "Initialize Strategy"
                            )}
                          </Button>
                          <Button
                            onClick={() => handleInitializeLendingPool(strategy)}
                            disabled={initializingStrategy === strategy.id || loading}
                            variant="outline"
                            className="w-full border-white/20 text-white hover:bg-slate-800/80 text-sm py-2"
                          >
                            {initializingStrategy === strategy.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                Initializing...
                              </>
                            ) : (
                              "Initialize Pool"
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-500/10 border border-blue-400/20 rounded-lg">
                    <h4 className="font-semibold text-blue-300 mb-2">Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-200">
                      <li>First, initialize the strategies you want to use</li>
                      <li>Then, initialize the lending pools for those strategies</li>
                      <li>Once initialized, users can deposit and withdraw from the pools</li>
                    </ol>
                  </div>
                  
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-400/20 rounded-lg">
                    <h4 className="font-semibold text-red-300 mb-2">Debug Tools:</h4>
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          console.log("=== DEBUG: Testing program initialization ===");
                          console.log("Connected:", connected);
                          console.log("PublicKey:", publicKey?.toString());
                          console.log("Wallet:", useWallet());
                          
                          try {
                            const { useContracts } = await import('../../hooks/useContracts');
                            const contractService = useContracts();
                            console.log("Contract service:", contractService);
                            
                            if (contractService) {
                              console.log("Contract service initialized:", contractService.isInitialized());
                            } else {
                              console.error("Contract service is null");
                            }
                          } catch (error) {
                            console.error("Error testing initialization:", error);
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="border-red-400/30 text-red-300 hover:bg-red-500/20"
                      >
                        Test Connection
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Lending Pools Table */}
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-2xl text-white">
                Lending Pools
              </CardTitle>
              <CardDescription className="text-white/70">
                Browse and interact with available lending pools
                {!connected && (
                  <div className="flex items-center mt-2 text-yellow-400">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Connect your wallet to interact with pools
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mr-2" />
                  <span className="text-white/70">Loading pools...</span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8">
                  <AlertCircle className="h-6 w-6 text-red-400 mr-2" />
                  <span className="text-red-400">Error loading pools: {error}</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-4 px-4 font-medium text-white/70">
                          Pool
                        </th>
                        <th className="text-left py-4 px-4 font-medium text-white/70">
                          Token
                        </th>
                        <th className="text-left py-4 px-4 font-medium text-white/70">
                          APY
                        </th>
                        <th className="text-left py-4 px-4 font-medium text-white/70">
                          TVL
                        </th>
                        <th className="text-left py-4 px-4 font-medium text-white/70">
                          Yield Distributed
                        </th>
                        <th className="text-left py-4 px-4 font-medium text-white/70">
                          Status
                        </th>
                        <th className="text-left py-4 px-4 font-medium text-white/70">
                          Created
                        </th>
                        <th className="text-left py-4 px-4 font-medium text-white/70">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(realStrategies.length > 0 ? realStrategies : mockPools).map((pool) => (
                        <tr
                          key={pool.id}
                          className="border-b border-white/5 hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium text-white">
                                {pool.strategy?.name || "Unknown Strategy"}
                              </div>
                              <div className="text-sm text-white/60 line-clamp-1">
                                {pool.strategy?.description || "No description available"}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge
                              variant="outline"
                              className="font-mono border-cyan-400/30 text-cyan-300 bg-cyan-400/10"
                            >
                              {pool.strategy?.tokenSymbol || "UNKNOWN"}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-green-400">
                              {formatApy(pool.strategy?.rewardApy || 0)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-medium text-white">
                              {formatCurrency(
                                pool.totalDeposits || 0,
                                pool.strategy?.tokenSymbol || "UNKNOWN"
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-medium text-white">
                              ${(pool.totalYieldDistributed || 0).toLocaleString()}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant={pool.active ? "default" : "secondary"}
                                className={
                                  pool.active
                                    ? "bg-green-500/20 text-green-300 border-green-400/30"
                                    : "bg-gray-500/20 text-gray-300 border-gray-400/30"
                                }
                              >
                                {pool.active ? "Active" : "Inactive"}
                              </Badge>
                              {realStrategies.length === 0 && (
                                <Badge
                                  variant="secondary"
                                  className="bg-orange-500/20 text-orange-300 border-orange-400/30 text-xs"
                                >
                                  Not Initialized
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-white/60">
                              {new Date(pool.createdAt || Date.now()).toLocaleDateString(
                                "fr-FR"
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Button
                              onClick={() => setSelectedPool(pool)}
                              size="sm"
                              variant="outline"
                              className="border-white/20 text-white hover:bg-slate-800/80 hover:border-cyan-400/50 hover:text-cyan-300 transition-all duration-200"
                              disabled={loading}
                            >
                              {loading ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  Loading
                                </>
                              ) : (
                                'Détails'
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details Modal */}
          {selectedPool && (
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedPool(null)}
            >
              <Card
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900/90 backdrop-blur-xl border-white/20 text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl text-white">
                        {selectedPool.strategy?.name || "Unknown Strategy"}
                      </CardTitle>
                      <CardDescription className="mt-2 text-white/70">
                        {selectedPool.strategy?.description || "No description available"}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={selectedPool.active ? "default" : "secondary"}
                      className={
                        selectedPool.active
                          ? "bg-green-500/20 text-green-300 border-green-400/30"
                          : "bg-gray-500/20 text-gray-300 border-gray-400/30"
                      }
                    >
                      {selectedPool.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Pool Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">
                        Pool Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-white/70">Pool ID:</span>
                          <span className="font-mono text-sm text-white">
                            {selectedPool.id}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Token:</span>
                          <Badge
                            variant="outline"
                            className="border-cyan-400/30 text-cyan-300 bg-cyan-400/10"
                          >
                            {selectedPool.strategy.tokenSymbol}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">APY:</span>
                          <span className="font-semibold text-green-400">
                            {formatApy(selectedPool.strategy.rewardApy)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">TVL:</span>
                          <span className="font-semibold text-white">
                            {formatCurrency(
                              selectedPool.totalDeposits,
                              selectedPool.strategy.tokenSymbol
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">
                            Yield Distributed:
                          </span>
                          <span className="font-semibold text-white">
                            $
                            {selectedPool.totalYieldDistributed.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Created:</span>
                          <span className="text-sm text-white">
                            {new Date(
                              selectedPool.createdAt
                            ).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">
                        Technical Details
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-white/70">Owner:</span>
                          <span className="font-mono text-xs text-white">
                            {selectedPool.owner.slice(0, 8)}...
                            {selectedPool.owner.slice(-8)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Vault Account:</span>
                          <span className="font-mono text-xs text-white">
                            {selectedPool.vaultAccount}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/70">Token Address:</span>
                          <span className="font-mono text-xs text-white">
                            {selectedPool.strategy.tokenAddress.slice(0, 8)}...
                            {selectedPool.strategy.tokenAddress.slice(-8)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Strategy Performance */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">
                      Performance Metrics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-center backdrop-blur-sm">
                        <div className="text-2xl font-bold text-green-400">
                          {formatApy(selectedPool.strategy.rewardApy)}
                        </div>
                        <div className="text-sm text-white/70">Current APY</div>
                      </div>
                      <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-center backdrop-blur-sm">
                        <div className="text-2xl font-bold text-white">
                          {(
                            (selectedPool.totalYieldDistributed /
                              selectedPool.totalDeposits) *
                            100
                          ).toFixed(2)}
                          %
                        </div>
                        <div className="text-sm text-white/70">Yield Rate</div>
                      </div>
                      <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-center backdrop-blur-sm">
                        <div className="text-2xl font-bold text-white">
                          {Math.floor(
                            (Date.now() - selectedPool.createdAt) /
                              (1000 * 60 * 60 * 24)
                          )}
                        </div>
                        <div className="text-sm text-white/70">Days Active</div>
                      </div>
                    </div>
                  </div>

                  {/* Initialization Warning */}
                  {realStrategies.length === 0 && (
                    <div className="p-4 bg-orange-500/10 border border-orange-400/20 rounded-lg">
                      <div className="flex items-center text-orange-300 mb-2">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <span className="font-semibold">Pool Not Initialized</span>
                      </div>
                      <p className="text-sm text-orange-200">
                        This strategy and pool need to be initialized on the blockchain before you can deposit or withdraw.
                        Use the "Pool & Strategy Management" panel above to initialize them.
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 transition-all duration-200"
                      disabled={!selectedPool.active || !connected || loading || realStrategies.length === 0}
                      onClick={() => setActionType("deposit")}
                    >
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Deposit
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-slate-800/80 hover:border-cyan-400/50 hover:text-cyan-300 transition-all duration-200"
                      disabled={!selectedPool.active || !connected || loading || realStrategies.length === 0}
                      onClick={() => setActionType("withdraw")}
                    >
                      <ArrowDownLeft className="h-4 w-4 mr-2" />
                      Withdraw
                    </Button>
                    <Button
                      onClick={() => setSelectedPool(null)}
                      variant="ghost"
                      className="text-white hover:bg-slate-800/60 hover:text-cyan-300 transition-all duration-200"
                      disabled={loading}
                    >
                      Fermer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Action Modal (Deposit/Withdraw) */}
          {selectedPool && actionType && (
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
              onClick={closeActionModal}
            >
              <Card
                className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border-white/20 text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <CardHeader>
                  <CardTitle className="capitalize text-white">
                    {actionType} {selectedPool.strategy.tokenSymbol}
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    {actionType === "deposit"
                      ? `Déposer des ${selectedPool.strategy.tokenSymbol} dans ${selectedPool.strategy.name}`
                      : `Retirer des ${selectedPool.strategy.tokenSymbol} de ${selectedPool.strategy.name}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Pool Information */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/70">APY:</span>
                      <div className="font-semibold text-green-400">
                        {formatApy(selectedPool.strategy.rewardApy)}
                      </div>
                    </div>
                    <div>
                      <span className="text-white/70">
                        {actionType === "deposit"
                          ? "Min. Deposit:"
                          : "Your Balance:"}
                      </span>
                      <div className="font-semibold text-white">
                        {actionType === "deposit"
                          ? `1 ${selectedPool.strategy.tokenSymbol}`
                          : `${getUserBalance(selectedPool.id)} ${
                              selectedPool.strategy.tokenSymbol
                            }`}
                      </div>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-white">
                      Montant à{" "}
                      {actionType === "deposit" ? "déposer" : "retirer"}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="amount"
                        type="number"
                        placeholder={`Entrer le montant en ${selectedPool.strategy.tokenSymbol}`}
                        value={amount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setAmount(e.target.value)
                        }
                        className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-cyan-400"
                      />
                      <Button
                        variant="outline"
                        onClick={handleSetMaxAmount}
                        className="px-6 border-white/20 text-white hover:bg-slate-800/80 hover:border-cyan-400/50 hover:text-cyan-300 transition-all duration-200"
                      >
                        All
                      </Button>
                    </div>
                    {amount && (
                      <p className="text-sm text-white/60">
                        ≈ ${(parseFloat(amount || "0") * 1).toLocaleString()}{" "}
                        USD
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <Button
                      onClick={
                        actionType === "deposit"
                          ? handleDeposit
                          : handleWithdraw
                      }
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0"
                      disabled={!amount || parseFloat(amount) <= 0 || isProcessing || !connected}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {actionType === "deposit" ? "Déposer" : "Retirer"}{" "}
                          {selectedPool.strategy.tokenSymbol}
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={closeActionModal}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-slate-800/80 hover:border-cyan-400/50 hover:text-cyan-300 transition-all duration-200"
                      disabled={isProcessing}
                    >
                      Annuler
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
