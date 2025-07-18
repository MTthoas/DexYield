import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Plus, Eye, Settings } from "lucide-react";
import { useLending } from "@/hooks/useLending";
import { useLendingSimplified } from "@/hooks/useLendingSimplified";
import { USDC_MINT, SOL_MINT } from "@/lib/constants";

// Adresses admin autorisées
const ADMIN_ADDRESSES = [
  "9JNZJADgviPnQWKz6sCrXiqvwVwRWcCKmicGYUD2hkdZ",
  "7bLqvdXRBHAXGpVXYVa9La1WUjCv4TbqaEjTnU3zmETB"
];

// Mode développement : permettre à tous les wallets d'être admin
const DEV_MODE = true;

// Tokens disponibles
const AVAILABLE_TOKENS = [
  {
    mint: USDC_MINT.toString(),
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6
  },
  {
    mint: SOL_MINT.toString(),
    symbol: "SOL",
    name: "Solana",
    decimals: 9
  }
];

interface CreateStrategyForm {
  tokenMint: string;
  strategyId: string;
  rewardApy: string;
  name: string;
  description: string;
}

export function AdminDashboard() {
  const { connected, publicKey } = useWallet();
  const { fetchStrategies, strategies, toggleStrategyStatus } = useLending();
  const { initializeStrategy } = useLendingSimplified();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'manage'>('overview');
  
  const [form, setForm] = useState<CreateStrategyForm>({
    tokenMint: '',
    strategyId: '',
    rewardApy: '',
    name: '',
    description: ''
  });

  // Vérifier si l'utilisateur connecté est admin
  useEffect(() => {
    if (connected && publicKey) {
      const userAddress = publicKey.toBase58();
      const isUserAdmin = DEV_MODE || ADMIN_ADDRESSES.includes(userAddress);
      setIsAdmin(isUserAdmin);
      
      if (isUserAdmin) {
        console.log('✅ Admin access granted for:', userAddress);
      } else {
        console.log('❌ Admin access denied for:', userAddress);
      }
    } else {
      setIsAdmin(false);
    }
  }, [connected, publicKey]);

  // Charger les stratégies
  useEffect(() => {
    if (isAdmin) {
      fetchStrategies();
    }
  }, [isAdmin, fetchStrategies]);

  // Gérer la création de stratégie
  const handleCreateStrategy = async () => {
    if (!form.tokenMint || !form.strategyId || !form.rewardApy || !form.name || !form.description) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    // Validate APY range
    const apyValue = parseFloat(form.rewardApy);
    if (apyValue < 0.1 || apyValue > 100) {
      alert('APY doit être entre 0.1% et 100%');
      return;
    }

    // Validate strategy ID
    const strategyIdValue = parseInt(form.strategyId);
    if (isNaN(strategyIdValue) || strategyIdValue < 0) {
      alert('ID de stratégie doit être un nombre positif');
      return;
    }

    setCreateLoading(true);
    try {
      const tokenMint = new PublicKey(form.tokenMint);
      const rewardApyNumber = Math.floor(apyValue * 1000); // Convert to basis points (5% = 5000 basis points)
      
      console.log('Creating strategy:', {
        tokenMint: tokenMint.toString(),
        strategyId: strategyIdValue,
        rewardApy: rewardApyNumber,
        name: form.name,
        description: form.description
      });

      await initializeStrategy(
        tokenMint,
        strategyIdValue,
        rewardApyNumber,
        form.name,
        form.description
      );

      alert('Stratégie créée avec succès !');
      
      // Reset form
      setForm({
        tokenMint: '',
        strategyId: '',
        rewardApy: '',
        name: '',
        description: ''
      });
      
      // Refresh strategies
      await fetchStrategies();
      
    } catch (error) {
      console.error('Error creating strategy:', error);
      
      let errorMessage = 'Erreur lors de la création de la stratégie';
      
      if (error instanceof Error) {
        if (error.message.includes('Strategy already exists')) {
          errorMessage = 'Une stratégie existe déjà pour ce token. Le contrat ne supporte qu\'une seule stratégie par token actuellement.';
        } else if (error.message.includes('already in use')) {
          errorMessage = 'Une stratégie existe déjà pour ce token. Le contrat ne supporte qu\'une seule stratégie par token actuellement.';
        } else if (error.message.includes('Allocate: account Address')) {
          errorMessage = 'Une stratégie existe déjà pour ce token. Le contrat ne supporte qu\'une seule stratégie par token actuellement.';
        } else {
          errorMessage = 'Erreur lors de la création de la stratégie: ' + error.message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };

  // Gérer le toggle de statut des stratégies
  const handleToggleStrategy = async (strategy: any) => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const tokenMint = new PublicKey(strategy.tokenAddress);
      await toggleStrategyStatus(tokenMint, strategy.strategyId);
      
      alert(`Stratégie ${strategy.active ? 'désactivée' : 'activée'} avec succès!`);

      // Recharger les stratégies
      await fetchStrategies();
    } catch (error) {
      console.error('Erreur lors du toggle de la stratégie:', error);
      alert('Erreur lors de la modification du statut de la stratégie');
    } finally {
      setLoading(false);
    }
  };

  // Si pas connecté ou pas admin
  if (!connected || !publicKey) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="w-96">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Veuillez connecter votre wallet pour accéder au dashboard admin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="w-96">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <CardTitle>Accès Refusé</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Vous n'avez pas les permissions d'administration.
            </p>
            <p className="text-sm text-muted-foreground">
              Votre adresse: {publicKey.toBase58()}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-green-500" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Gestion des stratégies DexYield - {publicKey.toBase58()}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className="w-4 h-4 inline mr-2" />
              Vue d'ensemble
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'create'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Créer une stratégie
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'manage'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Gérer les stratégies
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stratégies Actives</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">
                  {strategies.filter(s => s.active).length}
                </div>
                <p className="text-sm text-muted-foreground">
                  Stratégies en cours d'exécution
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Stratégies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-500">
                  {strategies.length}
                </div>
                <p className="text-sm text-muted-foreground">
                  Toutes les stratégies créées
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tokens Supportés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-500">
                  {AVAILABLE_TOKENS.length}
                </div>
                <p className="text-sm text-muted-foreground">
                  USDC, SOL disponibles
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'create' && (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Créer une Nouvelle Stratégie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="token">Token</Label>
                <Select value={form.tokenMint} onValueChange={(value) => setForm({...form, tokenMint: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un token" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_TOKENS.map((token) => (
                      <SelectItem key={token.mint} value={token.mint}>
                        {token.symbol} - {token.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="strategyId">ID de Stratégie</Label>
                <Input
                  id="strategyId"
                  type="number"
                  placeholder="Ex: 1"
                  value={form.strategyId}
                  onChange={(e) => setForm({...form, strategyId: e.target.value})}
                />
                <p className="text-sm text-muted-foreground">
                  Identifiant unique pour cette stratégie (permet plusieurs stratégies par token)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apy">APY de Récompense (%)</Label>
                <Input
                  id="apy"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 5.0"
                  value={form.rewardApy}
                  onChange={(e) => setForm({...form, rewardApy: e.target.value})}
                />
                <p className="text-sm text-muted-foreground">
                  Taux de rendement annuel en pourcentage
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nom de la Stratégie</Label>
                <Input
                  id="name"
                  placeholder="Ex: SOL High Yield Strategy"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Décrivez la stratégie..."
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleCreateStrategy}
                disabled={createLoading}
                className="w-full"
              >
                {createLoading ? 'Création en cours...' : 'Créer la Stratégie'}
              </Button>
            </CardContent>
          </Card>
        )}

        {activeTab === 'manage' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Stratégies Existantes</h2>
            {strategies.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">Aucune stratégie créée pour le moment.</p>
                </CardContent>
              </Card>
            ) : (
              strategies.map((strategy) => (
                <Card key={strategy.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{strategy.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {strategy.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          strategy.active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {strategy.active ? 'Actif' : 'Inactif'}
                        </div>
                        <Button
                          size="sm"
                          variant={strategy.active ? "destructive" : "default"}
                          onClick={() => handleToggleStrategy(strategy)}
                          disabled={loading}
                          className={strategy.active 
                            ? "bg-red-600 hover:bg-red-700 text-white" 
                            : "bg-green-600 hover:bg-green-700 text-white"
                          }
                        >
                          {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : strategy.active ? (
                            "Désactiver"
                          ) : (
                            "Activer"
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium">Token</p>
                        <p className="text-sm text-muted-foreground">{strategy.tokenSymbol}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">APY</p>
                        <p className="text-sm text-muted-foreground">{(strategy.rewardApy / 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total Déposé</p>
                        <p className="text-sm text-muted-foreground">{strategy.totalDeposited}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Créée le</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(strategy.createdAt * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}