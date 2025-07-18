import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  DollarSign, 
  RefreshCw,
  AlertCircle,
  Wallet,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useLending } from '@/hooks/useLending';
import { TOKEN_DECIMALS } from '@/lib/constants';

interface Strategy {
  id: string;
  name: string;
  tokenSymbol: string;
  rewardApy: number;
  totalDeposited: number;
  active: boolean;
  vaultBalance: number;
  userDeposit?: any;
}

interface UserTransaction {
  type: 'deposit' | 'withdraw' | 'redeem';
  amount: number;
  token: string;
  timestamp: number;
  strategy: string;
  strategyName: string;
}

export function SimpleDashboard() {
  const { connected, publicKey } = useWallet();
  const { fetchStrategies, loading: strategiesLoading } = useLending();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [userTransactions, setUserTransactions] = useState<UserTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Load strategies data
  const loadStrategies = async () => {
    if (!connected || !publicKey) return;
    
    setLoading(true);
    try {
      const strategiesData = await fetchStrategies();
      if (strategiesData && Array.isArray(strategiesData)) {
        setStrategies(strategiesData);
        
        // Extract user transactions from user deposits
        const transactions: UserTransaction[] = [];
        strategiesData.forEach(strategy => {
          if (strategy.userDeposit && strategy.userDeposit.amount > 0) {
            // Add deposit transaction
            transactions.push({
              type: 'deposit',
              amount: strategy.userDeposit.amount / Math.pow(10, TOKEN_DECIMALS[strategy.tokenSymbol as keyof typeof TOKEN_DECIMALS] || 6),
              token: strategy.tokenSymbol,
              timestamp: strategy.userDeposit.depositTime * 1000 || Date.now(),
              strategy: strategy.id,
              strategyName: strategy.name
            });
          }
        });
        
        // Sort by timestamp (newest first)
        transactions.sort((a, b) => b.timestamp - a.timestamp);
        setUserTransactions(transactions);
      }
    } catch (error) {
      console.error('Error loading strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (connected && publicKey) {
      loadStrategies();
    }
  }, [connected, publicKey]);

  // Calculate stats from real data
  const totalUserDeposits = strategies.reduce((sum, strategy) => {
    if (strategy.userDeposit && strategy.userDeposit.amount > 0) {
      const amount = strategy.userDeposit.amount / Math.pow(10, TOKEN_DECIMALS[strategy.tokenSymbol as keyof typeof TOKEN_DECIMALS] || 6);
      return sum + amount;
    }
    return sum;
  }, 0);

  const totalTVL = strategies.reduce((sum, strategy) => {
    return sum + (strategy.vaultBalance || 0);
  }, 0);

  const activeStrategies = strategies.filter(s => s.active).length;

  if (!connected) {
    return (
      <div className="min-h-screen bg-black text-white pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm w-96">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
                <p className="text-white/60">
                  Please connect your wallet to access the dashboard
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-20">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Your DexYield Dashboard</h1>
              <p className="text-white/70">Overview of your lending activity and strategies</p>
            </div>
            <Button
              onClick={loadStrategies}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-xs text-white/50">Your</div>
              </div>
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {userTransactions.length}
              </div>
              <div className="text-white/60 text-sm">Transactions</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Wallet className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-xs text-white/50">Your</div>
              </div>
              <div className="text-2xl font-bold text-green-400 mb-1">
                {totalUserDeposits.toFixed(2)}
              </div>
              <div className="text-white/60 text-sm">Total Deposits</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-xs text-white/50">Total</div>
              </div>
              <div className="text-2xl font-bold text-purple-400 mb-1">
                ${totalTVL.toLocaleString()}
              </div>
              <div className="text-white/60 text-sm">TVL</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="text-xs text-white/50">Active</div>
              </div>
              <div className="text-2xl font-bold text-yellow-400 mb-1">
                {activeStrategies}
              </div>
              <div className="text-white/60 text-sm">Strategies</div>
            </CardContent>
          </Card>
        </div>

        {/* Your Transactions */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Your Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No transactions found</p>
                <p className="text-white/40 text-sm mt-2">
                  Start by making a deposit in a lending strategy
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {userTransactions.map((tx, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        tx.type === 'deposit' ? 'bg-green-500/20' : 
                        tx.type === 'withdraw' ? 'bg-red-500/20' : 
                        'bg-blue-500/20'
                      }`}>
                        {tx.type === 'deposit' ? 
                          <ArrowDownRight className="w-4 h-4 text-green-400" /> :
                          tx.type === 'withdraw' ? 
                          <ArrowUpRight className="w-4 h-4 text-red-400" /> :
                          <TrendingUp className="w-4 h-4 text-blue-400" />
                        }
                      </div>
                      <div>
                        <div className="font-semibold text-white">
                          {tx.type === 'deposit' ? 'Deposit' : 
                           tx.type === 'withdraw' ? 'Withdraw' : 'Redeem'}
                        </div>
                        <div className="text-sm text-white/60">
                          {tx.strategyName}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-white">
                        {tx.amount.toFixed(4)} {tx.token}
                      </div>
                      <div className="text-sm text-white/60">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Strategies */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Your Active Strategies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strategies.filter(s => s.userDeposit && s.userDeposit.amount > 0).length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No active strategies</p>
                <p className="text-white/40 text-sm mt-2">
                  Visit the lending page to start earning yields
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {strategies
                  .filter(s => s.userDeposit && s.userDeposit.amount > 0)
                  .map((strategy) => (
                    <div key={strategy.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <TrendingUp className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-white">
                            {strategy.name}
                          </div>
                          <div className="text-sm text-white/60">
                            {strategy.tokenSymbol} • {(strategy.rewardApy / 10000).toFixed(2)}% APY
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-white">
                          {(strategy.userDeposit.amount / Math.pow(10, TOKEN_DECIMALS[strategy.tokenSymbol as keyof typeof TOKEN_DECIMALS] || 6)).toFixed(4)} {strategy.tokenSymbol}
                        </div>
                        <Badge variant={strategy.active ? 'default' : 'secondary'} className={
                          strategy.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }>
                          {strategy.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}