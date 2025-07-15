import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { useLendingSimplified } from '../../hooks/useLendingSimplified';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from '@tanstack/react-router';
import { useAdminAccess } from '../../hooks/useAdminAccess';

// Token presets pour faciliter la création de pool
// Mettre les bonnes addresses de mint et décimales
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

export const AdminPage: React.FC = () => {
  const { publicKey } = useWallet();
  const navigate = useNavigate();
  const { isAdmin } = useAdminAccess();
  const { initializeStrategy, initializeLendingPool, loading, error } = useLendingSimplified();

  // Redirection si pas admin
  useEffect(() => {
    if (publicKey && !isAdmin) {
      navigate({ to: '/' });
    }
  }, [publicKey, isAdmin, navigate]);

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

  const [selectedTab, setSelectedTab] = useState<'strategy' | 'pool'>('strategy');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;

    try {
      const tokenMint = new PublicKey(strategyForm.tokenMint);
      const rewardApy = parseFloat(strategyForm.rewardApy);

      const txId = await initializeStrategy(
        tokenMint,
        rewardApy,
        strategyForm.name,
        strategyForm.description
      );

      setSuccessMessage(`✅ Stratégie créée avec succès! TX: ${txId}`);
      setStrategyForm({ tokenMint: '', rewardApy: '', name: '', description: '' });
    } catch (err) {
      console.error('Erreur lors de la création de la stratégie:', err);
    }
  };

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;

    try {
      const tokenMint = new PublicKey(poolForm.tokenMint);
      const poolOwner = poolForm.poolOwner ? new PublicKey(poolForm.poolOwner) : undefined;

      const txId = await initializeLendingPool(tokenMint, poolOwner);

      setSuccessMessage(`✅ Pool de lending créé avec succès! TX: ${txId}`);
      setPoolForm({ tokenMint: '', poolOwner: '' });
    } catch (err) {
      console.error('Erreur lors de la création du pool:', err);
    }
  };

  const setTokenPreset = (preset: typeof TOKEN_PRESETS[0], formType: 'strategy' | 'pool') => {
    if (formType === 'strategy') {
      setStrategyForm(prev => ({ ...prev, tokenMint: preset.mint }));
    } else {
      setPoolForm(prev => ({ ...prev, tokenMint: preset.mint }));
    }
  };

  if (!publicKey) {
    return (
      <section className="min-h-screen w-screen relative overflow-hidden bg-black pt-16">
        {/* Élements dynamiques en fonds */}
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/5 w-72 h-72 bg-gradient-to-br from-blue-500/20 to-cyan-400/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-tl from-purple-500/15 to-pink-400/15 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-yellow-400/10 rounded-full blur-2xl"></div>
        </div>

        {/* Sous-titre */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:80px_80px]"></div>

        <div className="relative z-10 container mx-auto px-[5%] lg:px-[8%] xl:px-[12%] py-8 pt-24">
          <Card className="bg-gray-900/50 border border-gray-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-2xl">Accès Admin</CardTitle>
              <CardDescription className="text-gray-300 text-lg">
                Veuillez connecter votre wallet pour accéder aux fonctionnalités d'administration
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    );
  }

  // Si le wallet n'est pas admin, redirection automatique
  if (!isAdmin) {
    return (
      <section className="min-h-screen w-screen relative overflow-hidden bg-black pt-16">
        {/* Élements dynamiques en fonds */}
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/5 w-72 h-72 bg-gradient-to-br from-blue-500/20 to-cyan-400/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-tl from-purple-500/15 to-pink-400/15 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-yellow-400/10 rounded-full blur-2xl"></div>
        </div>

        {/* Sous-titre */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:80px_80px]"></div>

        <div className="relative z-10 container mx-auto px-[5%] lg:px-[8%] xl:px-[12%] py-8 pt-24">
          <Card className="bg-gray-900/50 border border-red-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-2xl">🚫 Accès Non Autorisé</CardTitle>
              <CardDescription className="text-red-300 text-lg">
                Seuls les administrateurs autorisés peuvent accéder à cette page. Redirection en cours...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen w-screen relative overflow-hidden bg-black pt-16">
      {/* Élements dynamiques en fonds */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/5 w-72 h-72 bg-gradient-to-br from-blue-500/20 to-cyan-400/20 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-tl from-purple-500/15 to-pink-400/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-yellow-400/10 rounded-full blur-2xl"></div>
      </div>

      {/* Sous-titre */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:80px_80px]"></div>

      <div className="relative z-10 container mx-auto px-[5%] lg:px-[8%] xl:px-[12%] py-8 pt-24">
        <div className="mb-12">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-none mb-4">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
              Administration
            </span>
            <br />
            <span className="text-white">DexYield</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl leading-relaxed">
            Créez et gérez les stratégies et pools de lending de votre protocole DeFi
          </p>
        </div>

      {/* Navigation par onglets */}
      <div className="flex space-x-4 mb-8">
        <Button
          variant={selectedTab === 'strategy' ? 'default' : 'outline'}
          onClick={() => setSelectedTab('strategy')}
          className={selectedTab === 'strategy' 
            ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold border-0"
            : "border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
          }
        >
          Créer une Stratégie
        </Button>
        <Button
          variant={selectedTab === 'pool' ? 'default' : 'outline'}
          onClick={() => setSelectedTab('pool')}
          className={selectedTab === 'pool' 
            ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold border-0"
            : "border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
          }
        >
          Créer un Pool
        </Button>
      </div>

      {/* Message de succès */}
      {successMessage && (
        <div className="mb-8 p-6 bg-gray-900/50 border border-green-500/30 text-green-300 rounded-2xl backdrop-blur-sm">
          {successMessage}
          <Button
            variant="ghost"
            size="sm"
            className="ml-4 text-green-300 hover:text-green-200 hover:bg-green-500/20"
            onClick={() => setSuccessMessage('')}
          >
            ✕
          </Button>
        </div>
      )}

      {/* Message d'erreur */}
      {error && (
        <div className="mb-8 p-6 bg-gray-900/50 border border-red-500/30 text-red-300 rounded-2xl backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Création de Stratégie */}
      {selectedTab === 'strategy' && (
        <Card className="bg-gray-900/50 border border-gray-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Créer une Nouvelle Stratégie</CardTitle>
            <CardDescription className="text-gray-300 text-lg">
              Une stratégie définit les paramètres de récompense pour un token spécifique
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateStrategy} className="space-y-6">
              {/* Token Presets */}
              <div>
                <Label className="text-sm font-medium text-gray-300">Tokens Prédéfinis</Label>
                <div className="flex space-x-2 mt-2">
                  {TOKEN_PRESETS.map((preset) => (
                    <Badge
                      key={preset.name}
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-800 border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
                      onClick={() => setTokenPreset(preset, 'strategy')}
                    >
                      {preset.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="strategy-token" className="text-gray-300">Adresse du Token Mint</Label>
                <Input
                  id="strategy-token"
                  type="text"
                  value={strategyForm.tokenMint}
                  onChange={(e) => setStrategyForm(prev => ({ ...prev, tokenMint: e.target.value }))}
                  placeholder="Ex: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="strategy-apy" className="text-gray-300">APY de Récompense (%)</Label>
                <Input
                  id="strategy-apy"
                  type="number"
                  step="0.01"
                  value={strategyForm.rewardApy}
                  onChange={(e) => setStrategyForm(prev => ({ ...prev, rewardApy: e.target.value }))}
                  placeholder="Ex: 5.25"
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="strategy-name" className="text-gray-300">Nom de la Stratégie</Label>
                <Input
                  id="strategy-name"
                  type="text"
                  value={strategyForm.name}
                  onChange={(e) => setStrategyForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: USDC High Yield Strategy"
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="strategy-description" className="text-gray-300">Description</Label>
                <Input
                  id="strategy-description"
                  type="text"
                  value={strategyForm.description}
                  onChange={(e) => setStrategyForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex: Stratégie à haut rendement pour USDC avec gestion des risques optimisée"
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500"
                  required
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Création en cours...</span>
                  </div>
                ) : (
                  'Créer la Stratégie'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Création de Pool */}
      {selectedTab === 'pool' && (
        <Card className="bg-gray-900/50 border border-gray-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Créer un Nouveau Pool de Lending</CardTitle>
            <CardDescription className="text-gray-300 text-lg">
              Un pool de lending permet aux utilisateurs de déposer et emprunter des tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePool} className="space-y-6">
              {/* Token Presets */}
              <div>
                <Label className="text-sm font-medium text-gray-300">Tokens Prédéfinis</Label>
                <div className="flex space-x-2 mt-2">
                  {TOKEN_PRESETS.map((preset) => (
                    <Badge
                      key={preset.name}
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-800 border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
                      onClick={() => setTokenPreset(preset, 'pool')}
                    >
                      {preset.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="pool-token" className="text-gray-300">Adresse du Token Mint</Label>
                <Input
                  id="pool-token"
                  type="text"
                  value={poolForm.tokenMint}
                  onChange={(e) => setPoolForm(prev => ({ ...prev, tokenMint: e.target.value }))}
                  placeholder="Ex: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500"
                  required
                />
              </div>

              <div>
                <Label htmlFor="pool-owner" className="text-gray-300">Propriétaire du Pool (optionnel)</Label>
                <Input
                  id="pool-owner"
                  type="text"
                  value={poolForm.poolOwner}
                  onChange={(e) => setPoolForm(prev => ({ ...prev, poolOwner: e.target.value }))}
                  placeholder="Laisser vide pour utiliser votre wallet"
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Si vide, votre wallet sera utilisé comme propriétaire du pool
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Création en cours...</span>
                  </div>
                ) : (
                  'Créer le Pool'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Informations du Wallet */}
      <Card className="mt-12 bg-gray-900/50 border border-gray-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white text-xl">Informations du Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <p className="text-gray-300"><strong className="text-white">Adresse connectée:</strong> {publicKey.toString()}</p>
            <p className="text-gray-500 mt-1">
              Cette adresse sera utilisée comme administrateur pour les créations
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </section>
  );
};
