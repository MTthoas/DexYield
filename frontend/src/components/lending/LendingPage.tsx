import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TrendingUp, Coins, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

// Types basés sur le smart contract
interface LendingPool {
  id: string
  owner: string
  totalDeposits: number
  totalYieldDistributed: number
  vaultAccount: string
  createdAt: number
  active: boolean
  strategy: Strategy
}

interface Strategy {
  id: string
  tokenAddress: string
  rewardApy: number
  name: string
  description: string
  createdAt: number
  active: boolean
  totalDeposited: number
  tokenSymbol: string
}

// Données mock basées sur le smart contract
const mockStrategies: Strategy[] = [
  {
    id: '1',
    tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    rewardApy: 8500, // 8.5%
    name: 'USDC Yield Strategy',
    description: 'Stable yield farming strategy for USDC with low risk and consistent returns',
    createdAt: Date.now() - 86400000 * 30,
    active: true,
    totalDeposited: 2500000,
    tokenSymbol: 'USDC'
  },
  {
    id: '2',
    tokenAddress: 'So11111111111111111111111111111111111111112',
    rewardApy: 12000, // 12%
    name: 'SOL Staking Strategy',
    description: 'High-yield SOL staking strategy with automated compounding',
    createdAt: Date.now() - 86400000 * 15,
    active: true,
    totalDeposited: 890000,
    tokenSymbol: 'SOL'
  },
  {
    id: '3',
    tokenAddress: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
    rewardApy: 15500, // 15.5%
    name: 'mSOL Liquidity Pool',
    description: 'Premium liquid staking strategy with mSOL tokens',
    createdAt: Date.now() - 86400000 * 7,
    active: true,
    totalDeposited: 1200000,
    tokenSymbol: 'mSOL'
  }
]

const mockPools: LendingPool[] = mockStrategies.map(strategy => ({
  id: strategy.id,
  owner: 'BZUEgp9psZegJarKqAH5WC6HSYCQ4fY2XphuCd5RsyeF',
  totalDeposits: strategy.totalDeposited,
  totalYieldDistributed: Math.floor(strategy.totalDeposited * (strategy.rewardApy / 10000) * 0.3),
  vaultAccount: `vault_${strategy.id}`,
  createdAt: strategy.createdAt,
  active: strategy.active,
  strategy
}))

export default function LendingPage() {
  const [selectedPool, setSelectedPool] = useState<LendingPool | null>(null)
  const [actionType, setActionType] = useState<'deposit' | 'withdraw' | null>(null)
  const [amount, setAmount] = useState('')
  
  // Mock user balance pour le withdraw
  const getUserBalance = (poolId: string) => {
    // Simulation d'un balance utilisateur
    const mockBalances: Record<string, number> = {
      '1': 5000, // USDC
      '2': 2.5,  // SOL
      '3': 1.2   // mSOL
    }
    return mockBalances[poolId] || 0
  }

  const formatCurrency = (amount: number, symbol: string = 'USDC') => {
    return `${amount.toLocaleString()} ${symbol}`
  }

  const formatApy = (apy: number) => {
    return `${(apy / 100).toFixed(2)}%`
  }

  const handleDeposit = () => {
    if (!selectedPool || !amount) return
    console.log(`Depositing ${amount} ${selectedPool.strategy.tokenSymbol} to pool ${selectedPool.id}`)
    // Ici, vous intégreriez l'appel au smart contract
    setAmount('')
    setActionType(null)
  }

  const handleWithdraw = () => {
    if (!selectedPool || !amount) return
    console.log(`Withdrawing ${amount} ${selectedPool.strategy.tokenSymbol} from pool ${selectedPool.id}`)
    // Ici, vous intégreriez l'appel au smart contract
    setAmount('')
    setActionType(null)
  }

  const handleSetMaxAmount = () => {
    if (!selectedPool) return
    
    if (actionType === 'withdraw') {
      const userBalance = getUserBalance(selectedPool.id)
      setAmount(userBalance.toString())
    } else if (actionType === 'deposit') {
      // Pour le deposit, on peut simuler un wallet balance
      setAmount('1000') // Exemple de montant max
    }
  }

  const closeActionModal = () => {
    setActionType(null)
    setAmount('')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section */}
      <section className="w-full px-[5%] lg:px-[8%] xl:px-[12%] py-16 border-b">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Solana Lending Pools
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Earn yield on your crypto assets through our secure and automated lending strategies
          </p>
        </div>
      </section>

      <div className="w-full px-[5%] lg:px-[8%] xl:px-[12%] py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value Locked</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${mockPools.reduce((sum, pool) => sum + pool.totalDeposits, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across {mockPools.filter(p => p.active).length} active pools
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average APY</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatApy(mockPools.reduce((sum, pool) => sum + pool.strategy.rewardApy, 0) / mockPools.length)}
              </div>
              <p className="text-xs text-muted-foreground">
                Weighted average across all strategies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Yield Distributed</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${mockPools.reduce((sum, pool) => sum + pool.totalYieldDistributed, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Lifetime rewards to users
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lending Pools Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Lending Pools</CardTitle>
            <CardDescription>
              Browse and interact with available lending pools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Pool</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Token</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">APY</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">TVL</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Yield Distributed</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Created</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mockPools.map((pool) => (
                    <tr key={pool.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium">{pool.strategy.name}</div>
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {pool.strategy.description}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="outline" className="font-mono">
                          {pool.strategy.tokenSymbol}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-green-600">
                          {formatApy(pool.strategy.rewardApy)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium">
                          {formatCurrency(pool.totalDeposits, pool.strategy.tokenSymbol)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-medium">
                          ${pool.totalYieldDistributed.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant={pool.active ? "default" : "secondary"}>
                          {pool.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-muted-foreground">
                          {new Date(pool.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Button 
                          onClick={() => setSelectedPool(pool)}
                          size="sm"
                          variant="outline"
                        >
                          Détails
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Details Modal */}
        {selectedPool && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedPool(null)}
          >
            <Card 
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{selectedPool.strategy.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {selectedPool.strategy.description}
                    </CardDescription>
                  </div>
                  <Badge variant={selectedPool.active ? "default" : "secondary"}>
                    {selectedPool.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pool Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Pool Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pool ID:</span>
                        <span className="font-mono text-sm">{selectedPool.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token:</span>
                        <Badge variant="outline">{selectedPool.strategy.tokenSymbol}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">APY:</span>
                        <span className="font-semibold text-green-600">
                          {formatApy(selectedPool.strategy.rewardApy)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">TVL:</span>
                        <span className="font-semibold">
                          {formatCurrency(selectedPool.totalDeposits, selectedPool.strategy.tokenSymbol)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Yield Distributed:</span>
                        <span className="font-semibold">
                          ${selectedPool.totalYieldDistributed.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span className="text-sm">
                          {new Date(selectedPool.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Technical Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Owner:</span>
                        <span className="font-mono text-xs">
                          {selectedPool.owner.slice(0, 8)}...{selectedPool.owner.slice(-8)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vault Account:</span>
                        <span className="font-mono text-xs">
                          {selectedPool.vaultAccount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token Address:</span>
                        <span className="font-mono text-xs">
                          {selectedPool.strategy.tokenAddress.slice(0, 8)}...{selectedPool.strategy.tokenAddress.slice(-8)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strategy Performance */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Performance Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatApy(selectedPool.strategy.rewardApy)}
                      </div>
                      <div className="text-sm text-muted-foreground">Current APY</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold">
                        {((selectedPool.totalYieldDistributed / selectedPool.totalDeposits) * 100).toFixed(2)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Yield Rate</div>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      <div className="text-2xl font-bold">
                        {Math.floor((Date.now() - selectedPool.createdAt) / (1000 * 60 * 60 * 24))}
                      </div>
                      <div className="text-sm text-muted-foreground">Days Active</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button 
                    className="flex-1" 
                    disabled={!selectedPool.active}
                    onClick={() => setActionType('deposit')}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Deposit
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    disabled={!selectedPool.active}
                    onClick={() => setActionType('withdraw')}
                  >
                    <ArrowDownLeft className="h-4 w-4 mr-2" />
                    Withdraw
                  </Button>
                  <Button 
                    onClick={() => setSelectedPool(null)} 
                    variant="ghost"
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
            onClick={closeActionModal}
          >
            <Card 
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle className="capitalize">
                  {actionType} {selectedPool.strategy.tokenSymbol}
                </CardTitle>
                <CardDescription>
                  {actionType === 'deposit' 
                    ? `Déposer des ${selectedPool.strategy.tokenSymbol} dans ${selectedPool.strategy.name}`
                    : `Retirer des ${selectedPool.strategy.tokenSymbol} de ${selectedPool.strategy.name}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pool Information */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">APY:</span>
                    <div className="font-semibold text-green-600">
                      {formatApy(selectedPool.strategy.rewardApy)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {actionType === 'deposit' ? 'Min. Deposit:' : 'Your Balance:'}
                    </span>
                    <div className="font-semibold">
                      {actionType === 'deposit' 
                        ? `1 ${selectedPool.strategy.tokenSymbol}`
                        : `${getUserBalance(selectedPool.id)} ${selectedPool.strategy.tokenSymbol}`
                      }
                    </div>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    Montant à {actionType === 'deposit' ? 'déposer' : 'retirer'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="amount"
                      type="number"
                      placeholder={`Entrer le montant en ${selectedPool.strategy.tokenSymbol}`}
                      value={amount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleSetMaxAmount}
                      className="px-6"
                    >
                      All
                    </Button>
                  </div>
                  {amount && (
                    <p className="text-sm text-muted-foreground">
                      ≈ ${(parseFloat(amount || '0') * 1).toLocaleString()} USD
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button 
                    onClick={actionType === 'deposit' ? handleDeposit : handleWithdraw}
                    className="flex-1"
                    disabled={!amount || parseFloat(amount) <= 0}
                  >
                    {actionType === 'deposit' ? 'Déposer' : 'Retirer'} {selectedPool.strategy.tokenSymbol}
                  </Button>
                  <Button 
                    onClick={closeActionModal}
                    variant="outline"
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
  )
}
