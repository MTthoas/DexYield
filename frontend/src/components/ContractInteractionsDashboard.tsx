import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Connection } from '@solana/web3.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Search,
  Filter,
  ExternalLink,
  Calendar,
  Clock,
  Copy,
  RefreshCw
} from 'lucide-react';
import { useLending } from '@/hooks/useLending';
import { useContracts } from '@/hooks/useContracts';
import { TOKEN_SYMBOLS, LENDING_PROGRAM_ID, MARKETPLACE_PROGRAM_ID } from '@/lib/constants';

interface Transaction {
  signature: string;
  type: 'deposit' | 'withdraw' | 'strategy_created' | 'strategy_toggled' | 'yield_claimed' | 'unknown';
  timestamp: number;
  user: string;
  amount?: number;
  token?: string;
  details?: any;
  status: 'success' | 'failed' | 'pending';
  programId: string;
}

interface DashboardStats {
  totalTransactions: number;
  totalUsers: number;
  totalVolume: number;
  activeStrategies: number;
  last24hTransactions: number;
  last24hVolume: number;
}

const TRANSACTION_TYPES = {
  deposit: { label: 'Deposit', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: ArrowDownRight },
  withdraw: { label: 'Withdraw', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: ArrowUpRight },
  strategy_created: { label: 'Strategy Created', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: TrendingUp },
  strategy_toggled: { label: 'Strategy Toggled', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Activity },
  yield_claimed: { label: 'Yield Claimed', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: DollarSign },
  unknown: { label: 'Unknown', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Activity }
};

export function ContractInteractionsDashboard() {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const { fetchStrategies } = useLending();
  const contractService = useContracts();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalTransactions: 0,
    totalUsers: 0,
    totalVolume: 0,
    activeStrategies: 0,
    last24hTransactions: 0,
    last24hVolume: 0
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [copying, setCopying] = useState<string | null>(null);

  // Fetch transactions from program accounts
  const fetchTransactions = useCallback(async () => {
    if (!connection || !contractService) return;

    setLoading(true);
    try {
      // Get all confirmed signatures for our program IDs
      const lendingSignatures = await connection.getSignaturesForAddress(
        LENDING_PROGRAM_ID,
        { limit: 100 }
      );

      const marketplaceSignatures = await connection.getSignaturesForAddress(
        MARKETPLACE_PROGRAM_ID,
        { limit: 100 }
      );

      const allSignatures = [...lendingSignatures, ...marketplaceSignatures];
      
      // Process transactions
      const txPromises = allSignatures.map(async (sig) => {
        try {
          const tx = await connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0
          });

          if (!tx) return null;

          // Determine transaction type based on instruction data
          const type = determineTransactionType(tx);
          
          // Extract user address (first account that's not a program)
          const accounts = tx.transaction.message.getAccountKeys();
          const user = accounts.get(0)?.toString() || 'Unknown';

          return {
            signature: sig.signature,
            type,
            timestamp: (tx.blockTime || 0) * 1000,
            user,
            status: sig.err ? 'failed' : 'success',
            programId: type.includes('strategy') ? LENDING_PROGRAM_ID.toString() : MARKETPLACE_PROGRAM_ID.toString(),
            details: tx
          } as Transaction;
        } catch (error) {
          console.error('Error processing transaction:', error);
          return null;
        }
      });

      const processedTxs = (await Promise.all(txPromises)).filter(Boolean) as Transaction[];
      
      // Sort by timestamp (newest first)
      processedTxs.sort((a, b) => b.timestamp - a.timestamp);
      
      setTransactions(processedTxs);
      
      // Calculate stats
      const now = Date.now();
      const last24h = now - 24 * 60 * 60 * 1000;
      
      const last24hTxs = processedTxs.filter(tx => tx.timestamp >= last24h);
      const uniqueUsers = new Set(processedTxs.map(tx => tx.user));
      
      setStats({
        totalTransactions: processedTxs.length,
        totalUsers: uniqueUsers.size,
        totalVolume: 0, // Would need to calculate from transaction data
        activeStrategies: 0, // Would need to fetch from strategies
        last24hTransactions: last24hTxs.length,
        last24hVolume: 0
      });

    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [connection, contractService]);

  // Determine transaction type from instruction data
  const determineTransactionType = (tx: any): Transaction['type'] => {
    try {
      const instructions = tx.transaction.message.instructions;
      
      for (const instruction of instructions) {
        const programId = tx.transaction.message.getAccountKeys().get(instruction.programIdIndex)?.toString();
        
        if (programId === LENDING_PROGRAM_ID.toString()) {
          // Simple heuristic based on instruction data
          const data = instruction.data;
          if (data && data.length > 0) {
            // First byte often indicates instruction type
            const discriminator = data[0];
            switch (discriminator) {
              case 0: return 'deposit';
              case 1: return 'withdraw';
              case 2: return 'strategy_created';
              case 3: return 'strategy_toggled';
              case 4: return 'yield_claimed';
              default: return 'unknown';
            }
          }
        }
      }
      
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  };

  // Filter transactions based on search and filter criteria
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = searchTerm === '' || 
      tx.signature.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.user.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || tx.type === filterType;
    
    // Time range filter
    const now = Date.now();
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const matchesTime = tx.timestamp >= (now - timeRangeMs[timeRange]);
    
    return matchesSearch && matchesFilter && matchesTime;
  });

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying(type);
      setTimeout(() => setCopying(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Format address (shortened)
  const formatAddress = (address: string) => {
    if (address.length <= 8) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  useEffect(() => {
    if (connected && contractService) {
      fetchTransactions();
    }
  }, [connected, contractService, fetchTransactions]);

  return (
    <div className="min-h-screen bg-black text-white pt-20">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Smart Contract Interactions</h1>
              <p className="text-white/70">Real-time view of all DexYield protocol interactions</p>
            </div>
            <Button
              onClick={fetchTransactions}
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
                <div className="text-xs text-white/50">Total</div>
              </div>
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {stats.totalTransactions}
              </div>
              <div className="text-white/60 text-sm">Transactions</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                <div className="text-xs text-white/50">Unique</div>
              </div>
              <div className="text-2xl font-bold text-green-400 mb-1">
                {stats.totalUsers}
              </div>
              <div className="text-white/60 text-sm">Users</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-xs text-white/50">24h</div>
              </div>
              <div className="text-2xl font-bold text-purple-400 mb-1">
                {stats.last24hTransactions}
              </div>
              <div className="text-white/60 text-sm">Recent TXs</div>
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
                {stats.activeStrategies}
              </div>
              <div className="text-white/60 text-sm">Strategies</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
                  <Input
                    placeholder="Search by signature or user address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/40 min-w-[280px]"
                  />
                </div>
                
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="all" className="bg-slate-800 text-white">All Types</option>
                  {Object.entries(TRANSACTION_TYPES).map(([key, config]) => (
                    <option key={key} value={key} className="bg-slate-800 text-white">
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-2">
                {(['1h', '24h', '7d', '30d'] as const).map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange(range)}
                    className={timeRange === range ? 'bg-blue-600 hover:bg-blue-700' : 'border-white/20 text-white hover:bg-white/10'}
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Transactions ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin"></div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/60">No transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/70">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/70">User</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/70">Signature</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/70">Time</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/70">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-white/70">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => {
                      const typeConfig = TRANSACTION_TYPES[tx.type];
                      const IconComponent = typeConfig.icon;
                      
                      return (
                        <tr key={tx.signature} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <Badge className={`${typeConfig.color} border text-xs`}>
                              <IconComponent className="w-3 h-3 mr-1" />
                              {typeConfig.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white/80">{formatAddress(tx.user)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(tx.user, `user-${tx.signature}`)}
                                className="h-6 w-6 p-0 hover:bg-white/10"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white/80 font-mono">{formatAddress(tx.signature)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(tx.signature, `sig-${tx.signature}`)}
                                className="h-6 w-6 p-0 hover:bg-white/10"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-white/40" />
                              <span className="text-sm text-white/70">{formatTimestamp(tx.timestamp)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              className={`${
                                tx.status === 'success'
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                  : tx.status === 'failed'
                                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                  : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                              } border text-xs`}
                            >
                              {tx.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`, '_blank')}
                              className="h-6 px-2 text-xs hover:bg-white/10"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}