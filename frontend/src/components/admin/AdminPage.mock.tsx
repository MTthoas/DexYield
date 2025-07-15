// Mock version of the AdminPage with mock data
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { useMock } from '@/mock/context';
import { TrendingUp, Users, DollarSign, AlertCircle, Plus, Settings, Database } from 'lucide-react';
import { MockBadge } from '@/components/ui/MockBadge';

// Token presets pour faciliter la création de pool
const TOKEN_PRESETS = [
  {
    name: 'USDC',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6
  },
  {
    name: 'SOL',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9
  },
  {
    name: 'mSOL',
    mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
    decimals: 9
  }
];

export const MockAdminPage: React.FC = () => {
  const { user, globalStats, strategies, lendingPools, createStrategy, createPool, loading } = useMock();

  // Strategy creation form
  const [strategyForm, setStrategyForm] = useState({
    tokenMint: '',
    rewardApy: '',
    name: '',
    description: ''
  });

  // Pool creation form
  const [poolForm, setPoolForm] = useState({
    tokenMint: '',
    poolOwner: ''
  });

  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'strategy' | 'pool'>('dashboard');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const txId = await createStrategy({
        tokenMint: strategyForm.tokenMint,
        rewardApy: parseFloat(strategyForm.rewardApy),
        name: strategyForm.name,
        description: strategyForm.description
      });

      setSuccessMessage(`✅ Stratégie créée avec succès! TX: ${txId}`);
      setStrategyForm({ tokenMint: '', rewardApy: '', name: '', description: '' });
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Erreur lors de la création de la stratégie:', err);
      setSuccessMessage(`❌ Erreur: ${err}`);
    }
  };

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const txId = await createPool({
        tokenMint: poolForm.tokenMint,
        poolOwner: poolForm.poolOwner
      });

      setSuccessMessage(`✅ Pool de lending créé avec succès! TX: ${txId}`);
      setPoolForm({ tokenMint: '', poolOwner: '' });
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Erreur lors de la création du pool:', err);
      setSuccessMessage(`❌ Erreur: ${err}`);
    }
  };

  const fillPresetToken = (tokenName: string, formType: 'strategy' | 'pool') => {
    const preset = TOKEN_PRESETS.find(p => p.name === tokenName);
    if (preset) {
      if (formType === 'strategy') {
        setStrategyForm({ ...strategyForm, tokenMint: preset.mint });
      } else {
        setPoolForm({ ...poolForm, tokenMint: preset.mint });
      }
    }
  };

  if (!user.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Accès refusé</h2>
          <p className="text-red-600">Vous n'avez pas les permissions administrateur pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">{/* pt-24 pour compenser le header fixed + un peu d'espace */}
      {/* Mock Badge */}
      <MockBadge />
      
      {/* Mock Admin Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-6 rounded-lg mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">🛠️ Admin Dashboard (Mock)</h1>
            <p className="text-blue-100">Gérez les pools et stratégies DexYield</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">Connecté en tant qu'admin</p>
            <p className="font-mono text-sm">{user.publicKey.slice(0, 8)}...{user.publicKey.slice(-8)}</p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className={`mb-6 p-4 rounded-lg ${successMessage.includes('✅') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {successMessage}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setSelectedTab('dashboard')}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            selectedTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setSelectedTab('strategy')}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            selectedTab === 'strategy' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          <Plus className="h-4 w-4" />
          <span>Créer Stratégie</span>
        </button>
        <button
          onClick={() => setSelectedTab('pool')}
          className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
            selectedTab === 'pool' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Créer Pool</span>
        </button>
      </div>

      {/* Dashboard Tab */}
      {selectedTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Global Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">TVL Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${globalStats.totalValueLocked.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +15.2% ce mois
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{globalStats.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  +12 nouveaux cette semaine
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stratégies</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{strategies.length}</div>
                <p className="text-xs text-muted-foreground">
                  {strategies.filter(s => s.active).length} actives
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pools</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lendingPools.length}</div>
                <p className="text-xs text-muted-foreground">
                  {lendingPools.filter(p => p.isActive).length} actifs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Strategies Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Stratégies Actives</CardTitle>
              <CardDescription>Aperçu des stratégies de yield farming</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {strategies.filter(s => s.active).map((strategy) => (
                  <div key={strategy.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{strategy.name}</h4>
                      <p className="text-sm text-gray-600">{strategy.description}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="secondary">{strategy.tokenSymbol}</Badge>
                        <Badge variant="outline">{(strategy.rewardApy / 100).toFixed(1)}% APY</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">TVL</p>
                      <p className="font-semibold">${(strategy.totalDeposited / 1000000).toFixed(0)}K</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Strategy Creation Tab */}
      {selectedTab === 'strategy' && (
        <Card>
          <CardHeader>
            <CardTitle>Créer une Nouvelle Stratégie</CardTitle>
            <CardDescription>
              Configurez une nouvelle stratégie de yield farming
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateStrategy} className="space-y-4">
              <div>
                <Label htmlFor="strategy-name">Nom de la stratégie</Label>
                <Input
                  id="strategy-name"
                  value={strategyForm.name}
                  onChange={(e) => setStrategyForm({ ...strategyForm, name: e.target.value })}
                  placeholder="Ex: SOL Liquid Staking"
                  required
                />
              </div>

              <div>
                <Label htmlFor="strategy-description">Description</Label>
                <Input
                  id="strategy-description"
                  value={strategyForm.description}
                  onChange={(e) => setStrategyForm({ ...strategyForm, description: e.target.value })}
                  placeholder="Description de la stratégie..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="strategy-mint">Token Mint Address</Label>
                <div className="flex space-x-2">
                  <Input
                    id="strategy-mint"
                    value={strategyForm.tokenMint}
                    onChange={(e) => setStrategyForm({ ...strategyForm, tokenMint: e.target.value })}
                    placeholder="Adresse du token mint"
                    required
                  />
                  <div className="flex space-x-1">
                    {TOKEN_PRESETS.map((preset) => (
                      <Button
                        key={preset.name}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fillPresetToken(preset.name, 'strategy')}
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="strategy-apy">APY Récompense (%)</Label>
                <Input
                  id="strategy-apy"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={strategyForm.rewardApy}
                  onChange={(e) => setStrategyForm({ ...strategyForm, rewardApy: e.target.value })}
                  placeholder="Ex: 12.5"
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Création en cours...' : 'Créer la Stratégie'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Pool Creation Tab */}
      {selectedTab === 'pool' && (
        <Card>
          <CardHeader>
            <CardTitle>Créer un Nouveau Pool de Lending</CardTitle>
            <CardDescription>
              Initialisez un nouveau pool de prêt pour un token
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePool} className="space-y-4">
              <div>
                <Label htmlFor="pool-mint">Token Mint Address</Label>
                <div className="flex space-x-2">
                  <Input
                    id="pool-mint"
                    value={poolForm.tokenMint}
                    onChange={(e) => setPoolForm({ ...poolForm, tokenMint: e.target.value })}
                    placeholder="Adresse du token mint"
                    required
                  />
                  <div className="flex space-x-1">
                    {TOKEN_PRESETS.map((preset) => (
                      <Button
                        key={preset.name}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fillPresetToken(preset.name, 'pool')}
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="pool-owner">Pool Owner (optionnel)</Label>
                <Input
                  id="pool-owner"
                  value={poolForm.poolOwner}
                  onChange={(e) => setPoolForm({ ...poolForm, poolOwner: e.target.value })}
                  placeholder="Adresse du propriétaire du pool (si différent de vous)"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Création en cours...' : 'Créer le Pool'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
