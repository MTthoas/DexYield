import React, { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { formatTokenAmount } from "@/lib/tokenAccounts";

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
  riskLevel: "Low" | "Medium" | "High";
  createdAt: string;
}

interface LendingPoolCardProps {
  pool: LendingPool;
  userConnected: boolean;
  userTokenBalance?: number;
  userBalances?: Record<string, number>;
  onDeposit: (amount: number) => Promise<void>;
  onWithdraw: (amount: number) => Promise<void>;
  onRedeem: (poolId: string) => Promise<void>;
  checkRedeemAvailability?: (depositTime: number) => {
    available: boolean;
    timeRemaining: number;
    availableAt: Date | null;
  };
  loading?: boolean;
  isAdmin?: boolean;
  onToggleStatus?: (poolId: string, currentStatus: boolean) => Promise<void>;
}

export function LendingPoolCard({
  pool,
  userConnected,
  userTokenBalance = 0,
  userBalances,
  onDeposit,
  onWithdraw,
  onRedeem,
  checkRedeemAvailability,
  loading = false,
  isAdmin = false,
  onToggleStatus,
}: LendingPoolCardProps) {
  const [amount, setAmount] = useState<string>("");
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const formatNumber = (num: number | undefined | null, decimals = 2) => {
    if (num === undefined || num === null || isNaN(num)) {
      return "0";
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
    if (numValue >= 1) return `$${numValue.toFixed(0)}`;
    return `$${numValue.toFixed(2)}`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Low":
        return "text-green-400 bg-green-400/10 border-green-400/20";
      case "Medium":
        return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "High":
        return "text-red-400 bg-red-400/10 border-red-400/20";
      default:
        return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    }
  };

  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setActionLoading(true);
    try {
      if (mode === "deposit") {
        await onDeposit(parseFloat(amount));
      } else {
        await onWithdraw(parseFloat(amount));
      }
      setAmount("");
    } catch (error) {
      console.error(`${mode} failed:`, error);
    } finally {
      setActionLoading(false);
    }
  };

  const maxAmount =
    mode === "deposit"
      ? Math.min(userTokenBalance || 0, 1000000)
      : pool.userDeposit || 0;

  const canWithdraw = userConnected && pool.userDeposit && pool.userDeposit > 0;

  // Ajout : formatage du solde disponible selon les décimales du token (utilitaire universel)
  const formatAvailable = () => {
    // Pour SOL natif, afficher le solde tel quel (pas de décimales SPL)
    if (pool.token.symbol === "SOL") {
      // Correction : si userTokenBalance est undefined, retourne 0
      return (userTokenBalance ?? 0).toFixed(6);
    }
    // Sinon, format SPL classique
    const decimals = pool.token.decimals || 6;
    const integerBalance = Math.floor(
      (userTokenBalance ?? 0) * Math.pow(10, decimals)
    );
    return formatTokenAmount(BigInt(integerBalance), decimals);
  };

  // Format time remaining for claim availability
  const formatTimeRemaining = (milliseconds: number) => {
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  // Check if claiming is available
  const claimStatus =
    pool.userDepositTime && checkRedeemAvailability
      ? checkRedeemAvailability(pool.userDepositTime)
      : { available: false, timeRemaining: 0, availableAt: null };

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
              <h3 className="text-white font-semibold text-lg">
                {pool.token.symbol}
              </h3>
              <p className="text-white/60 text-sm">{pool.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              className={`${getRiskColor(pool.riskLevel)} border text-xs px-2 py-1`}
            >
              {pool.riskLevel}
            </Badge>
            {!pool.isActive && (
              <Badge className="text-gray-400 bg-gray-400/10 border-gray-400/20 text-xs">
                Inactive
              </Badge>
            )}
            {isAdmin && onToggleStatus && (
              <Button
                onClick={() => onToggleStatus(pool.id, pool.isActive)}
                variant="outline"
                size="sm"
                className={`h-6 px-2 text-xs border ${
                  pool.isActive
                    ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                    : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                }`}
              >
                {pool.isActive ? "Disable" : "Enable"}
              </Button>
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

        {/* Debug: Affichage brut des données pool */}
        <details className="bg-black/40 rounded p-2 text-xs text-white/60 mb-2">
          <summary>Debug: Raw Pool Data</summary>
          <pre>{JSON.stringify(pool, null, 2)}</pre>
        </details>

        {/* Position utilisateur si connecté */}
        {userConnected &&
          (pool.userDeposit !== undefined ||
            pool.userYieldEarned !== undefined) && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-blue-300 text-sm font-medium">
                  Your Position
                </span>
                {pool.userYieldEarned !== undefined &&
                  pool.userYieldEarned > 0 && (
                    <div className="flex flex-col items-end gap-1">
                      <Button
                        onClick={() => onRedeem(pool.id)}
                        disabled={actionLoading || !claimStatus.available}
                        size="sm"
                        className={`h-6 px-2 text-xs ${
                          claimStatus.available
                            ? "bg-green-500/20 hover:bg-green-500/30 text-green-300 border-green-500/30"
                            : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30 cursor-not-allowed"
                        }`}
                        title={
                          !claimStatus.available
                            ? `Available in ${formatTimeRemaining(claimStatus.timeRemaining)}`
                            : "Claim your yield tokens"
                        }
                      >
                        {claimStatus.available ? "Claim" : "Locked"}
                      </Button>
                      {!claimStatus.available &&
                        claimStatus.timeRemaining > 0 && (
                          <span className="text-yellow-300 text-xs opacity-80">
                            {formatTimeRemaining(claimStatus.timeRemaining)}
                          </span>
                        )}
                    </div>
                  )}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Locked Tokens</span>
                <span className="text-white font-medium">
                  {formatNumber(pool.userDeposit)} {pool.token.symbol}
                </span>
              </div>
              {pool.userYieldEarned !== undefined &&
                pool.userYieldEarned > 0 && (
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
                onClick={() => setMode("deposit")}
                variant={mode === "deposit" ? "default" : "ghost"}
                className={`flex-1 h-8 text-sm ${
                  mode === "deposit"
                    ? "bg-white text-black hover:bg-white/90"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                Deposit
              </Button>
              <Button
                onClick={() => setMode("withdraw")}
                variant={mode === "withdraw" ? "default" : "ghost"}
                disabled={!canWithdraw}
                className={`flex-1 h-8 text-sm ${
                  mode === "withdraw"
                    ? "bg-white text-black hover:bg-white/90"
                    : "text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
                }`}
              >
                Withdraw
              </Button>
            </div>

            {/* Input et info */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-white/60">
                <span>Available:</span>
                <span>
                  {formatAvailable()} {pool.token.symbol}
                </span>
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
                    <span>
                      {mode === "deposit" ? "Depositing..." : "Withdrawing..."}
                    </span>
                  </div>
                ) : (
                  `${mode === "deposit" ? "Deposit" : "Withdraw"} ${pool.token.symbol}`
                )}
              </Button>
            </div>
          </div>
        )}

        {/* User Position Info */}
        {userConnected &&
          (pool.userDeposit !== undefined || userBalances?.YT > 0) && (
            <div className="bg-white/5 rounded-lg p-4 space-y-3 border border-white/10">
              <h4 className="text-white font-medium text-sm">Your Position</h4>

              {pool.userDeposit !== undefined && pool.userDeposit > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Deposited:</span>
                    <span className="text-green-400 font-medium">
                      {pool.userDeposit.toFixed(6)} {pool.token.symbol}
                    </span>
                  </div>
                  {pool.userYieldEarned !== undefined &&
                    pool.userYieldEarned > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Yield Earned:</span>
                        <span className="text-yellow-400 font-medium">
                          {pool.userYieldEarned.toFixed(6)} {pool.token.symbol}
                        </span>
                      </div>
                    )}
                </div>
              )}

              {userBalances?.YT > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">YT Tokens:</span>
                  <span className="text-blue-400 font-medium">
                    {userBalances.YT.toFixed(6)} YT
                  </span>
                </div>
              )}
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </summary>
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Total Deposits</span>
              <span className="text-white/80">
                {formatNumber(pool.totalDeposits)} {pool.token.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Yield Distributed</span>
              <span className="text-green-400 font-medium">
                {formatNumber(pool.totalYieldDistributed)} {pool.token.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Created</span>
              <span className="text-white/80">
                {new Date(pool.createdAt).toLocaleDateString()}
              </span>
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
