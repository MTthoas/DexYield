import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  User,
  Plus,
  Minus,
  RefreshCw
} from "lucide-react";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useContracts } from "@/hooks/useContracts";
import { WalletInfo } from "@/components/WalletInfo";
import { MARKETPLACE_PROGRAM_ID } from "@/lib/constants";

// Interface pour les listings du marketplace
interface YTListing {
  id: string;
  seller: string;
  ytMint: string;
  amount: number;
  price: number;
  active: boolean;
  createdAt: number;
  tokenSymbol?: string;
  pricePerToken?: number;
  strategyApy?: number;
}

// Interface pour le formulaire de création de listing
interface CreateListingForm {
  selectedYtToken: string;
  ytAmount: string;
  pricePerToken: string;
}

// Interface pour le formulaire d'achat
interface BuyForm {
  amount: string;
}

export function MarketplacePage() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { 
    listings, 
    userYieldTokens,
    fetchListings, 
    fetchUserYieldTokens,
    listYT, 
    buyYT, 
    cancelListing 
  } = useMarketplace();
  const contractService = useContracts();

  // États pour l'interface
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'my-listings'>('buy');
  const [refreshing, setRefreshing] = useState(false);
  const [createListingOpen, setCreateListingOpen] = useState(false);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<YTListing | null>(null);
  
  // États pour les formulaires
  const [createForm, setCreateForm] = useState<CreateListingForm>({
    selectedYtToken: '',
    ytAmount: '',
    pricePerToken: ''
  });
  const [buyForm, setBuyForm] = useState<BuyForm>({
    amount: ''
  });

  // États de chargement
  const [createLoading, setCreateLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);

  // Simplifier les listings (pour le moment sans enrichissement)
  const processedListings = listings.map(listing => ({
    ...listing,
    tokenSymbol: 'YT',
    pricePerToken: listing.amount > 0 ? listing.price / listing.amount : 0
  }));

  // Filtrer les listings
  const myListings = processedListings.filter(listing => 
    publicKey && listing.seller === publicKey.toBase58()
  );

  const activeListings = processedListings.filter(listing => 
    listing.active && (!publicKey || listing.seller !== publicKey.toBase58())
  );

  // Charger les données au montage
  useEffect(() => {
    if (connected) {
      fetchListings();
      fetchUserYieldTokens();
    }
  }, [connected, fetchListings, fetchUserYieldTokens]);

  // Rafraîchissement automatique toutes les 30 secondes
  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(() => {
      fetchListings();
    }, 30000);

    return () => clearInterval(interval);
  }, [connected, fetchListings]);

  // Fonction de rafraîchissement manuel
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchListings(), fetchUserYieldTokens()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Créer un listing
  const handleCreateListing = async () => {
    if (!publicKey || !createForm.ytAmount || !createForm.pricePerToken || !createForm.selectedYtToken) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setCreateLoading(true);
    try {
      const selectedYtToken = userYieldTokens.find(yt => yt.mint === createForm.selectedYtToken);
      if (!selectedYtToken) {
        alert('YT Token non trouvé');
        return;
      }

      const ytAmount = parseFloat(createForm.ytAmount);
      const pricePerToken = parseFloat(createForm.pricePerToken);
      
      if (ytAmount > selectedYtToken.amount) {
        alert(`Quantité insuffisante. Vous avez ${selectedYtToken.amount} ${selectedYtToken.symbol}`);
        return;
      }
      
      // Convertir en micro-unités pour le contrat
      const amountMicroUnits = Math.floor(ytAmount * 1000000);
      const priceMicroUnits = Math.floor(pricePerToken * ytAmount * 1000000);

      // Utiliser le compte token de l'utilisateur
      const ytTokenAccount = selectedYtToken.tokenAccount;
      if (!ytTokenAccount) {
        alert('Compte token non trouvé');
        return;
      }

      // Créer un compte escrow token pour le YT mint
      const ytMint = new PublicKey(selectedYtToken.mint);
      
      // Dériver l'autorité escrow selon l'IDL (seeds: ["escrow", seller])
      const [escrowAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), publicKey.toBuffer()],
        MARKETPLACE_PROGRAM_ID
      );

      // Le compte escrow doit être un Associated Token Account pour le YT mint
      // appartenant à l'autorité escrow
      if (!contractService) {
        alert('Service contractuel non initialisé');
        return;
      }

      const escrowTokenAddress = await getAssociatedTokenAddress(
        ytMint,
        escrowAuthority,
        true // allowOwnerOffCurve pour PDA
      );

      // Vérifier si le compte escrow existe, et le créer si nécessaire
      try {
        await getAccount(connection, escrowTokenAddress);
        console.log("✅ Compte escrow existe déjà");
      } catch (error) {
        console.log("🔧 Création du compte escrow nécessaire");
        
        try {
          // Créer le compte escrow manuellement
          const transaction = new Transaction();
          
          // Ajouter l'instruction pour créer l'Associated Token Account
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              escrowTokenAddress, // ata
              escrowAuthority, // owner (PDA)
              ytMint // mint
            )
          );

          // Envoyer la transaction
          const signature = await sendTransaction(transaction, connection);
          await connection.confirmTransaction(signature, 'confirmed');
          
          console.log("✅ Compte escrow créé avec succès:", signature);
        } catch (createError) {
          console.error("Erreur lors de la création du compte escrow:", createError);
          alert("Impossible de créer le compte escrow: " + (createError as Error).message);
          return;
        }
      }

      await listYT(
        ytTokenAccount,
        escrowTokenAddress,
        priceMicroUnits,
        amountMicroUnits
      );

      alert('Listing créé avec succès !');
      setCreateForm({ selectedYtToken: '', ytAmount: '', pricePerToken: '' });
      setCreateListingOpen(false);
      await fetchListings();

    } catch (error) {
      console.error('Error creating listing:', error);
      alert('Erreur lors de la création du listing: ' + (error as Error).message);
    } finally {
      setCreateLoading(false);
    }
  };

  // Acheter des YT
  const handleBuyYT = async () => {
    if (!publicKey || !selectedListing || !buyForm.amount) {
      alert('Informations manquantes');
      return;
    }

    setBuyLoading(true);
    try {
      // Adresses placeholder - dans un vrai environnement, ces adresses seraient dérivées
      const buyerTokenAccount = new PublicKey("11111111111111111111111111111111");
      const buyerYtAccount = new PublicKey("11111111111111111111111111111111");
      const sellerTokenAccount = new PublicKey("11111111111111111111111111111111");
      const escrowAccount = new PublicKey("11111111111111111111111111111111");
      const pool = new PublicKey("11111111111111111111111111111111");

      await buyYT(
        new PublicKey(selectedListing.seller),
        buyerTokenAccount,
        buyerYtAccount,
        sellerTokenAccount,
        escrowAccount,
        pool,
        new PublicKey(selectedListing.ytMint)
      );

      alert('Achat effectué avec succès !');
      setBuyForm({ amount: '' });
      setBuyDialogOpen(false);
      setSelectedListing(null);
      await fetchListings();

    } catch (error) {
      console.error('Error buying YT:', error);
      alert('Erreur lors de l\'achat: ' + (error as Error).message);
    } finally {
      setBuyLoading(false);
    }
  };

  // Annuler un listing
  const handleCancelListing = async (listing: YTListing) => {
    if (!publicKey) return;

    setCancelLoading(listing.id);
    try {
      // Adresses placeholder
      const escrowAccount = new PublicKey("11111111111111111111111111111111");
      const sellerTokenAccount = new PublicKey("11111111111111111111111111111111");

      await cancelListing(
        escrowAccount,
        sellerTokenAccount
      );

      alert('Listing annulé avec succès !');
      await fetchListings();

    } catch (error) {
      console.error('Error canceling listing:', error);
      alert('Erreur lors de l\'annulation: ' + (error as Error).message);
    } finally {
      setCancelLoading(null);
    }
  };

  // Composant pour afficher un listing
  const ListingCard = ({ listing, showActions = true, isMyListing = false }: { 
    listing: YTListing; 
    showActions?: boolean; 
    isMyListing?: boolean; 
  }) => (
    <Card className="transition-all hover:shadow-lg hover:scale-[1.02]">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {listing.tokenSymbol} Yield Tokens
              {listing.strategyApy && (
                <Badge variant="outline" className="text-xs">
                  {listing.strategyApy.toFixed(1)}% APY
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">
                {listing.amount.toLocaleString()} YT
              </Badge>
              {listing.active ? (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                  Actif
                </Badge>
              ) : (
                <Badge variant="secondary">Inactif</Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">
              {listing.pricePerToken?.toFixed(4)} USDC
            </div>
            <div className="text-sm text-muted-foreground">par token</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm font-medium">Vendeur</p>
            <p className="text-xs text-muted-foreground font-mono">
              {listing.seller.slice(0, 4)}...{listing.seller.slice(-4)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Valeur Totale</p>
            <p className="text-sm font-mono font-bold text-green-600">
              {listing.price.toFixed(2)} USDC
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Créé le</p>
            <p className="text-xs text-muted-foreground">
              {new Date(listing.createdAt * 1000).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Rendement</p>
            <p className="text-xs text-green-600">
              {listing.strategyApy ? `${listing.strategyApy.toFixed(1)}% APY` : 'Variable'}
            </p>
          </div>
        </div>

        {showActions && (
          <div className="flex gap-2">
            {isMyListing ? (
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => handleCancelListing(listing)}
                disabled={cancelLoading === listing.id}
              >
                {cancelLoading === listing.id ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Minus className="w-4 h-4 mr-2" />
                    Annuler
                  </>
                )}
              </Button>
            ) : (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  setSelectedListing(listing);
                  setBuyDialogOpen(true);
                }}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Acheter
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!connected) {
    return (
      <div className="min-h-screen bg-black pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-96">
              <CardHeader className="text-center">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <CardTitle>Marketplace YT</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">
                  Connectez votre wallet pour accéder au marketplace des Yield Tokens.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Marketplace YT</h1>
                <p className="text-muted-foreground">
                  Achetez et vendez vos Yield Tokens
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              
              {/* Debug button - temporaire */}
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  console.log("🐛 Debug: Force fetch listings");
                  console.log("🐛 Contract service:", contractService);
                  console.log("🐛 User yield tokens:", userYieldTokens);
                  if (contractService) {
                    try {
                      const rawListings = await contractService.getAllListings();
                      console.log("🐛 Raw listings result:", rawListings);
                    } catch (error) {
                      console.error("🐛 Error in debug fetch:", error);
                    }
                  }
                }}
              >
                🐛 Debug
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Listings Actifs</p>
                    <p className="text-2xl font-bold">{activeListings.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Volume Total</p>
                    <p className="text-2xl font-bold">
                      {activeListings.reduce((sum, l) => sum + l.price, 0).toFixed(0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Mes Listings</p>
                    <p className="text-2xl font-bold">{myListings.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Dernière MàJ</p>
                    <p className="text-sm font-mono">
                      {new Date().toLocaleTimeString('fr-FR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* WalletInfo Component */}
        <WalletInfo />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="buy">Acheter</TabsTrigger>
            <TabsTrigger value="sell">Vendre</TabsTrigger>
            <TabsTrigger value="my-listings">Mes Listings</TabsTrigger>
          </TabsList>

          {/* Onglet Acheter */}
          <TabsContent value="buy" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Listings Disponibles</h2>
              <div className="text-sm text-muted-foreground">
                {activeListings.length} listing(s) disponible(s)
              </div>
            </div>

            {activeListings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Aucun listing disponible pour le moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Onglet Vendre */}
          <TabsContent value="sell" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Créer un Listing</h2>
              <Button onClick={() => setCreateListingOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau Listing
              </Button>
            </div>

            {/* Modal pour créer un listing */}
            {createListingOpen && (
              <Card className="max-w-md mx-auto">
                <CardHeader>
                  <CardTitle>Créer un Listing YT</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Vendez vos Yield Tokens sur le marketplace
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="ytToken">YT Token à vendre</Label>
                    <select
                      id="ytToken"
                      className="w-full mt-1 p-2 border rounded-md bg-background"
                      value={createForm.selectedYtToken}
                      onChange={(e) => setCreateForm({...createForm, selectedYtToken: e.target.value})}
                    >
                      <option value="">Sélectionnez un YT Token</option>
                      {userYieldTokens.map((ytToken) => (
                        <option key={ytToken.mint} value={ytToken.mint}>
                          {ytToken.symbol} - {ytToken.amount.toFixed(4)} disponible
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="amount">Quantité YT</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Ex: 100"
                      value={createForm.ytAmount}
                      onChange={(e) => setCreateForm({...createForm, ytAmount: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="price">Prix par Token (USDC)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.0001"
                      placeholder="Ex: 0.95"
                      value={createForm.pricePerToken}
                      onChange={(e) => setCreateForm({...createForm, pricePerToken: e.target.value})}
                    />
                  </div>

                  {createForm.ytAmount && createForm.pricePerToken && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium">Résumé</p>
                      <p className="text-xs text-muted-foreground">
                        Total: {(parseFloat(createForm.ytAmount || '0') * parseFloat(createForm.pricePerToken || '0')).toFixed(2)} USDC
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={() => setCreateListingOpen(false)}
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                    <Button 
                      onClick={handleCreateListing}
                      disabled={createLoading}
                      className="flex-1"
                    >
                      {createLoading ? 'Création...' : 'Créer'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3">Comment vendre vos YT ?</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>1. Sélectionnez le YT Token que vous voulez vendre</p>
                  <p>2. Indiquez la quantité de Yield Tokens à vendre</p>
                  <p>3. Fixez votre prix par token en USDC</p>
                  <p>4. Confirmez la création de votre listing</p>
                </div>
                
                {userYieldTokens.length === 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      Vous n'avez aucun YT Token à vendre. Vous devez d'abord déposer dans une stratégie pour obtenir des YT.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Mes Listings */}
          <TabsContent value="my-listings" className="space-y-6 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Mes Listings</h2>
              <div className="text-sm text-muted-foreground">
                {myListings.length} listing(s)
              </div>
            </div>

            {myListings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Vous n'avez aucun listing actif.
                  </p>
                  <Button 
                    className="mt-4" 
                    onClick={() => {
                      setActiveTab('sell');
                      setCreateListingOpen(true);
                    }}
                  >
                    Créer un Listing
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myListings.map((listing) => (
                  <ListingCard 
                    key={listing.id} 
                    listing={listing} 
                    isMyListing={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Modal d'achat */}
        {buyDialogOpen && selectedListing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Acheter des YT</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Achat de {selectedListing.tokenSymbol} Yield Tokens
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted rounded-md">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>Prix par token:</span>
                    <span className="font-mono">{selectedListing.pricePerToken?.toFixed(4)} USDC</span>
                    <span>Disponible:</span>
                    <span className="font-mono">{selectedListing.amount.toLocaleString()} YT</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="buyAmount">Quantité à acheter</Label>
                  <Input
                    id="buyAmount"
                    type="number"
                    max={selectedListing.amount}
                    placeholder="Ex: 50"
                    value={buyForm.amount}
                    onChange={(e) => setBuyForm({...buyForm, amount: e.target.value})}
                  />
                </div>

                {buyForm.amount && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Coût Total</p>
                    <p className="text-lg font-bold">
                      {(parseFloat(buyForm.amount) * (selectedListing.pricePerToken || 0)).toFixed(4)} USDC
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setBuyDialogOpen(false);
                      setSelectedListing(null);
                      setBuyForm({ amount: '' });
                    }}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleBuyYT}
                    disabled={buyLoading || !buyForm.amount}
                    className="flex-1"
                  >
                    {buyLoading ? 'Achat...' : 'Acheter'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
