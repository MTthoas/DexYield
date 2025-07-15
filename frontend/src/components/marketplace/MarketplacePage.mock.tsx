// Mock marketplace page component
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useMock } from '@/mock/context';
import { Search, ShoppingCart, Plus, Filter, Star, Eye } from 'lucide-react';
import { MockBadge } from '@/components/ui/MockBadge';

export const MockMarketplacePage = () => {
  const { marketplaceItems, user, isWalletConnected } = useMock();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'NFT', 'Education', 'Rewards', 'Tools'];

  const filteredItems = marketplaceItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory && item.isActive;
  });

  const handleBuyItem = (itemId: string) => {
    // Mock purchase logic
    console.log(`Purchasing item: ${itemId}`);
    alert(`Achat simulé pour l'item ${itemId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-24">{/* pt-24 pour compenser le header fixed + un peu d'espace */}
      {/* Mock Badge */}
      <MockBadge />
      
      {/* Mock Marketplace Header */}
      <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-lg mb-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">🛍️ DexYield Marketplace (Mock)</h1>
          <p className="text-lg text-green-100">
            Découvrez et achetez des ressources DeFi exclusives
          </p>
          <div className="mt-4 flex justify-center space-x-6 text-sm">
            <div>
              <p className="text-green-100">Total Items</p>
              <p className="font-bold">{marketplaceItems.length}</p>
            </div>
            <div>
              <p className="text-green-100">Volume 24h</p>
              <p className="font-bold">$45,600</p>
            </div>
            <div>
              <p className="text-green-100">Vendeurs Actifs</p>
              <p className="font-bold">156</p>
            </div>
          </div>
        </div>
      </div>

      {/* User Balance (if connected) */}
      {isWalletConnected && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" />
              <span>Votre Portefeuille</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">SOL</p>
                <p className="font-bold">{user.balance.sol.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">USDC</p>
                <p className="font-bold">{user.balance.usdc.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">mSOL</p>
                <p className="font-bold">{user.balance.msol.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher des items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'Toutes catégories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              {item.imageUrl ? (
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-400 text-center">
                  <Eye className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm">Aperçu non disponible</p>
                </div>
              )}
            </div>
            
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <Badge variant="secondary">{item.category}</Badge>
              </div>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Prix</p>
                    <p className="font-bold text-lg">
                      {item.price} {item.tokenSymbol}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Vendeur</p>
                    <p className="font-mono text-sm">
                      {item.seller.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-sm">4.8 (42 avis)</span>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => handleBuyItem(item.id)}
                    disabled={!isWalletConnected}
                    className="flex-1"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Acheter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No results */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Aucun item trouvé
          </h3>
          <p className="text-gray-500">
            Essayez de modifier votre recherche ou vos filtres
          </p>
        </div>
      )}

      {/* Call to Action */}
      <div className="mt-12 text-center">
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="pt-6">
            <h3 className="text-xl font-bold mb-2">Vous avez quelque chose à vendre ?</h3>
            <p className="text-gray-600 mb-4">
              Créez votre propre listing sur le marketplace DexYield
            </p>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Créer un listing
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
