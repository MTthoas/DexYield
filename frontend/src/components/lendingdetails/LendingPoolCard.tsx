import React, { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { formatTokenAmount } from '@/lib/tokenAccounts';

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

interface LendingPoolCardProps {
  pool: LendingPool;
  userConnected: boolean;
  userTokenBalance?: number;
  onDeposit: (amount: number) => Promise<void>;
  onWithdraw: (amount: number) => Promise<void>;
  onRedeem: () => Promise<void>;
  loading?: boolean;
}

export function LendingPoolCard({ 
  pool, 
  userConnected, 
  userTokenBalance = 0,
  onDeposit, 
  onWithdraw, 
  onRedeem,
  loading = false 
}: LendingPoolCardProps) {
  const [amount, setAmount] = useState<string>('');
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const formatNumber = (num: number | undefined | null, decimals = 2) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '0';
    }
    
    const numValue = Number(num);
    if (numValue >= 1e6) return `${(numValue / 1e6).toFixed(decimals)}M`;
    if (numValue >= 1e3) return `${(numValue / 1e3).toFixed(decimals)}K`;
    return numValue.toFixed(decimals);
  };

  const formatCurrency = (amount: number | undefined | null) => {
    const numValue = Number(amount) || 0;
    if (numValue >= 1e6) return `$${(numValue / 1e6).toFixed(1)}M`;
    if (numValue >= 1e3) return `$${(numValue / 1e3).toFixed(1)}K`;
    return `$${numValue.toFixed(0)}`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'Medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'High': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    setActionLoading(true);
    try {
      if (mode === 'deposit') {
        await onDeposit(parseFloat(amount));
      } else {
        await onWithdraw(parseFloat(amount));
      }
      setAmount('');
    } catch (error) {
      console.error(`${mode} failed:`, error);
    } finally {
      setActionLoading(false);
    }
  };

  const maxAmount = mode === 'deposit' 
    ? Math.min(userTokenBalance || 0, 1000000) 
    : pool.userDeposit || 0;

  const canWithdraw = userConnected && pool.userDeposit && pool.userDeposit > 0;

  // Ajout : formatage du solde disponible selon les décimales du token (utilitaire universel)
  const formatAvailable = () => {
    // Convertir le nombre décimal en entier en multipliant par 10^decimals
    const decimals = pool.token.decimals || 6;
    const integerBalance = Math.floor(userTokenBalance * Math.pow(10, decimals));
    return formatTokenAmount(BigInt(integerBalance), decimals);
  };

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/8 transition-all duration-300 hover:border-white/20 group">
      <div className="p-6 space-y-6">
        
        {/* Header avec token et statut */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
              {pool.token.symbol.charAt(0)}
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">{pool.token.symbol}</h3>
              <p className="text-white/60 text-sm">{pool.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`${getRiskColor(pool.riskLevel)} border text-xs px-2 py-1`}>
              {pool.riskLevel}
            </Badge>
            {!pool.isActive && (
              <Badge className="text-gray-400 bg-gray-400/10 border-gray-400/20 text-xs">
                Inactive
              </Badge>
            )}
          </div>
        </div>

        {/* Métriques principales */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {(pool.apy || 0).toFixed(1)}%
            </div>
            <div className="text-white/50 text-sm">APY</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white mb-1">
              {formatCurrency(pool.tvl)}
            </div>
            <div className="text-white/50 text-sm">TVL</div>
          </div>
        </div>

        {/* Position utilisateur si connecté */}
        {userConnected && pool.userDeposit && pool.userDeposit > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-blue-300 text-sm font-medium">Your Position</span>
              {pool.userYieldEarned && pool.userYieldEarned > 0 && (
                <Button
                  onClick={onRedeem}
                  disabled={actionLoading}
                  size="sm"
                  className="bg-green-500/20 hover:bg-green-500/30 text-green-300 border-green-500/30 h-6 px-2 text-xs"
                >
                  Claim
                </Button>
              )}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Deposited</span>
              <span className="text-white font-medium">
                {formatNumber(pool.userDeposit)} {pool.token.symbol}
              </span>
            </div>
            {pool.userYieldEarned && pool.userYieldEarned > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-white/70">Earned</span>
                <span className="text-green-400 font-medium">
                  +{formatNumber(pool.userYieldEarned)} {pool.token.symbol}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Interface d'action */}
        {userConnected && pool.isActive && (
          <div className="space-y-4">
            {/* Toggle Deposit/Withdraw */}
            <div className="flex bg-white/5 rounded-lg p-1">
              <Button
                onClick={() => setMode('deposit')}
                variant={mode === 'deposit' ? 'default' : 'ghost'}
                className={`flex-1 h-8 text-sm ${
                  mode === 'deposit' 
                    ? 'bg-white text-black hover:bg-white/90' 
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                Deposit
              </Button>
              <Button
                onClick={() => setMode('withdraw')}
                variant={mode === 'withdraw' ? 'default' : 'ghost'}
                disabled={!canWithdraw}
                className={`flex-1 h-8 text-sm ${
                  mode === 'withdraw' 
                    ? 'bg-white text-black hover:bg-white/90' 
                    : 'text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30'
                }`}
              >
                Withdraw
              </Button>
            </div>

            {/* Input et info */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-white/60">
                <span>Available:</span>
                <span>{formatAvailable()} {pool.token.symbol}</span>
              </div>
              
              <div className="relative">
                <Input
                  type="number"
                  placeholder={`0.0 ${pool.token.symbol}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={maxAmount}
                  min={0}
                  step={0.000001}
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40 pr-16 h-12"
                />
                <Button
                  onClick={() => setAmount(maxAmount.toString())}
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 px-2 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                >
                  MAX
                </Button>
              </div>

              <Button
                onClick={handleAction}
                disabled={
                  !amount || 
                  parseFloat(amount) <= 0 || 
                  parseFloat(amount) > maxAmount ||
                  actionLoading
                }
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>{mode === 'deposit' ? 'Depositing...' : 'Withdrawing...'}</span>
                  </div>
                ) : (
                  `${mode === 'deposit' ? 'Deposit' : 'Withdraw'} ${pool.token.symbol}`
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Connect wallet CTA */}
        {!userConnected && (
          <div className="text-center py-6">
            <p className="text-white/60 text-sm mb-3">
              Connect wallet to start earning
            </p>
            <Button 
              variant="outline" 
              className="border-white/20 text-white hover:bg-white/10 hover:border-white/30"
            >
              Connect Wallet
            </Button>
          </div>
        )}

        {/* Détails supplémentaires (collapsible) */}
        <details className="group/details">
          <summary className="cursor-pointer text-white/60 text-sm hover:text-white/80 transition-colors list-none flex items-center justify-between">
            <span>Pool Details</span>
            <svg 
              className="w-4 h-4 transition-transform group-open/details:rotate-180" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Total Deposits</span>
              <span className="text-white/80">{formatNumber(pool.totalDeposits)} {pool.token.symbol}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Yield Distributed</span>
              <span className="text-white/80">{formatNumber(pool.totalYieldDistributed)} {pool.token.symbol}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Created</span>
              <span className="text-white/80">{new Date(pool.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-white/60 text-xs leading-relaxed mt-2 pt-2 border-t border-white/5">
              {pool.description}
            </p>
          </div>
        </details>
      </div>
    </Card>
  );
}