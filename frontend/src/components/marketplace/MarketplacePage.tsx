import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, ShoppingCart, ArrowUpRight, ArrowDownLeft, Loader2, AlertCircle } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useMarketplace } from "@/hooks/useMarketplace";
import { getAssociatedTokenAddress } from "@solana/spl-token";

// Simple toast utility
const toast = {
  success: (message: string) => {
    console.log("✅ Success:", message);
    alert(`Success: ${message}`);
  },
  error: (message: string) => {
    console.error("❌ Error:", message);
    alert(`Error: ${message}`);
  },
  info: (message: string) => {
    console.info("ℹ️ Info:", message);
    alert(`Info: ${message}`);
  }
};

interface YTListing {
  id: string;
  seller: string;
  ytTokenSymbol: string;
  price: number;
  amount: number;
  totalValue: number;
  apy: number;
  expiryDate: string;
  createdAt: number;
  active: boolean;
}

// Mock YT listings
const mockListings: YTListing[] = [
  {
    id: "1",
    seller: "BZUEgp9psZegJarKqAH5WC6HSYCQ4fY2XphuCd5RsyeF",
    ytTokenSymbol: "ytUSDC",
    price: 0.95,
    amount: 1000,
    totalValue: 950,
    apy: 8.5,
    expiryDate: "2024-12-31",
    createdAt: Date.now() - 86400000 * 2,
    active: true,
  },
  {
    id: "2",
    seller: "8dHymaYqqKuydLPRAZBbAkzDRh1FqNfQw1SRgEjN9noy",
    ytTokenSymbol: "ytSOL",
    price: 0.88,
    amount: 50,
    totalValue: 44,
    apy: 12.0,
    expiryDate: "2024-11-30",
    createdAt: Date.now() - 86400000 * 1,
    active: true,
  },
  {
    id: "3",
    seller: "11111111111111111111111111111111",
    ytTokenSymbol: "ytmSOL",
    price: 0.82,
    amount: 200,
    totalValue: 164,
    apy: 15.5,
    expiryDate: "2024-10-31",
    createdAt: Date.now() - 86400000 * 3,
    active: true,
  },
];

export default function MarketplacePage() {
  const { connected, publicKey } = useWallet();
  const { 
    loading, 
    error, 
    listings, 
    fetchListings, 
    buyYT, 
    listYT, 
    cancelListing 
  } = useMarketplace();
  
  const [selectedListing, setSelectedListing] = useState<YTListing | null>(null);
  const [actionType, setActionType] = useState<"buy" | "sell" | null>(null);
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [realListings, setRealListings] = useState<any[]>([]);

  // Load listings from blockchain
  useEffect(() => {
    if (connected) {
      fetchListings();
    }
  }, [connected, fetchListings]);

  // Update real listings when blockchain data changes
  useEffect(() => {
    if (listings && listings.length > 0) {
      try {
        // Transform blockchain listings to match expected format
        const transformedListings = listings.map((listing, index) => {
          const account = listing.account || listing;
          const publicKey = listing.publicKey || `listing_${index}`;
          
          // Safe conversion helper
          const safeConvertBN = (value: any, fallback: number = 0) => {
            try {
              if (!value) return fallback;
              if (typeof value === 'number') return value;
              if (value._bn) return value.toNumber();
              if (value.toNumber) return value.toNumber();
              if (value.toString) {
                const parsed = parseFloat(value.toString());
                return isNaN(parsed) ? fallback : parsed;
              }
              return fallback;
            } catch (e) {
              console.error("Error converting value:", value, e);
              return fallback;
            }
          };
          
          const amount = safeConvertBN(account?.amount, 0);
          const price = safeConvertBN(account?.price, 0) / Math.pow(10, 6); // Convert from lamports to decimal
          
          return {
            id: typeof publicKey === 'string' ? publicKey : publicKey.toString(),
            seller: account?.seller?.toString() || "Unknown",
            ytTokenSymbol: `YT-${index + 1}`,
            price: price,
            amount: amount / Math.pow(10, 6), // Convert from lamports
            totalValue: (amount / Math.pow(10, 6)) * price,
            apy: 10 + (index * 2), // Mock APY for now
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            createdAt: Date.now(),
            active: account?.active !== undefined ? account.active : true
          };
        });
        
        console.log("Transformed listings:", transformedListings);
        setRealListings(transformedListings);
      } catch (error) {
        console.error("Error transforming listings:", error);
        setRealListings([]);
      }
    }
  }, [listings]);

  const formatCurrency = (amount: number, symbol: string = "USDC") => {
    return `${amount.toLocaleString()} ${symbol}`;
  };

  const formatApy = (apy: number) => {
    return `${apy.toFixed(2)}%`;
  };

  const handleBuyYT = async () => {
    if (!selectedListing || !amount || !publicKey || !connected) {
      toast.error("Please connect your wallet and enter a valid amount");
      return;
    }

    setIsProcessing(true);
    try {
      // Validate seller address
      let sellerPubkey: PublicKey;
      try {
        sellerPubkey = new PublicKey(selectedListing.seller);
      } catch (e) {
        throw new Error(`Invalid seller address: ${selectedListing.seller}`);
      }
      
      // Token addresses - you should get these from your listing data or strategy
      const tokenMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // USDC
      const ytMint = new PublicKey("So11111111111111111111111111111111111111112"); // Mock YT mint
      const pool = new PublicKey("BZUEgp9psZegJarKqAH5WC6HSYCQ4fY2XphuCd5RsyeF"); // Mock Pool
      
      // Get associated token accounts
      const buyerTokenAccount = await getAssociatedTokenAddress(tokenMint, publicKey);
      const buyerYtAccount = await getAssociatedTokenAddress(ytMint, publicKey);
      const sellerTokenAccount = await getAssociatedTokenAddress(tokenMint, sellerPubkey);
      const escrowAccount = await getAssociatedTokenAddress(ytMint, sellerPubkey);
      
      console.log("Executing YT purchase:", {
        buyer: publicKey.toString(),
        seller: sellerPubkey.toString(),
        amount: parseFloat(amount),
        price: selectedListing.price
      });
      
      // Execute purchase
      const txId = await buyYT(
        sellerPubkey,
        buyerTokenAccount,
        buyerYtAccount,
        sellerTokenAccount,
        escrowAccount,
        pool,
        ytMint
      );
      
      toast.success(`YT purchase successful! Transaction: ${txId}`);
      setAmount("");
      setActionType(null);
      setSelectedListing(null);
      
      // Refresh listings
      fetchListings();
      
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error(`Purchase failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSellYT = async () => {
    if (!amount || !price || !publicKey || !connected) {
      toast.error("Please connect your wallet and enter valid amount and price");
      return;
    }

    setIsProcessing(true);
    try {
      // Token addresses - you should get these from your strategy data
      const ytMint = new PublicKey("So11111111111111111111111111111111111111112"); // Mock YT mint
      
      // Get associated token accounts
      const ytTokenAccount = await getAssociatedTokenAddress(ytMint, publicKey);
      const escrowAccount = await getAssociatedTokenAddress(ytMint, publicKey);
      
      // Convert amounts to proper format (considering decimals)
      const amountBN = Math.floor(parseFloat(amount) * Math.pow(10, 6)); // 6 decimals
      const priceBN = Math.floor(parseFloat(price) * Math.pow(10, 6)); // 6 decimals
      
      console.log("Creating YT listing:", {
        seller: publicKey.toString(),
        amount: amountBN,
        price: priceBN,
        ytTokenAccount: ytTokenAccount.toString(),
        escrowAccount: escrowAccount.toString()
      });
      
      // Execute listing
      const txId = await listYT(
        ytTokenAccount,
        escrowAccount,
        priceBN,
        amountBN
      );
      
      toast.success(`YT listing successful! Transaction: ${txId}`);
      setAmount("");
      setPrice("");
      setActionType(null);
      
      // Refresh listings
      fetchListings();
      
    } catch (error) {
      console.error("Listing error:", error);
      toast.error(`Listing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const closeActionModal = () => {
    setActionType(null);
    setAmount("");
    setPrice("");
    setSelectedListing(null);
  };

  const displayListings = realListings.length > 0 ? realListings : mockListings;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-slate-900 to-black"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(14,165,233,0.15),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_40%,rgba(34,197,94,0.05),transparent_50%)]"></div>

      {/* Animated Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>

      <div className="relative z-10">
        {/* Header Section */}
        <section className="w-full px-[5%] lg:px-[8%] xl:px-[12%] py-16 border-b border-white/10">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-cyan-200 to-blue-300 bg-clip-text text-transparent">
              Yield Token Marketplace
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Trade yield tokens (YT) to optimize your yield farming strategies
            </p>
          </div>
        </section>

        <div className="w-full px-[5%] lg:px-[8%] xl:px-[12%] py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Total YT Volume
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  $
                  {displayListings
                    .reduce((sum, listing) => sum + listing.totalValue, 0)
                    .toLocaleString()}
                </div>
                <p className="text-xs text-white/60">
                  Across {displayListings.filter((l) => l.active).length} active listings
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Average YT Price
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  $
                  {(
                    displayListings.reduce((sum, listing) => sum + listing.price, 0) /
                    displayListings.length
                  ).toFixed(2)}
                </div>
                <p className="text-xs text-white/60">
                  Average price per YT token
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white/90">
                  Best APY Available
                </CardTitle>
                <ArrowUpRight className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatApy(Math.max(...displayListings.map(l => l.apy)))}
                </div>
                <p className="text-xs text-white/60">
                  Highest yield available
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-8">
            <Button
              onClick={() => setActionType("sell")}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0"
              disabled={!connected || loading}
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Sell YT Tokens
            </Button>
          </div>

          {/* YT Listings Table */}
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-2xl text-white">
                YT Token Listings
              </CardTitle>
              <CardDescription className="text-white/70">
                Browse and purchase yield tokens from other users
                {!connected && (
                  <div className="flex items-center mt-2 text-yellow-400">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Connect your wallet to trade YT tokens
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-400 mr-2" />
                  <span className="text-white/70">Loading listings...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-4 px-4 font-medium text-white/70">
                          YT Token
                        </th>
                        <th className="text-left py-4 px-4 font-medium text-white/70">
                          Price
                        </th>
                        <th className="text-left py-4 px-4 font-medium text-white/70">
                          Amount
                        </th>
                        <th className="text-left py-4 px-4 font-medium text-white/70">
                          Total Value
                        </th>
                        <th className="text-left py-4 px-4 font-medium text-white/70">
                          APY
                        </th>
                        <th className="text-left py-4 px-4 font-medium text-white/70">
                          Expiry
                        </th>
                        <th className="text-left py-4 px-4 font-medium text-white/70">
                          Seller
                        </th>
                        <th className="text-left py-4 px-4 font-medium text-white/70">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayListings.map((listing) => (
                        <tr
                          key={listing.id}
                          className="border-b border-white/5 hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <Badge
                              variant="outline"
                              className="font-mono border-purple-400/30 text-purple-300 bg-purple-400/10"
                            >
                              {listing.ytTokenSymbol}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-white">
                              ${listing.price.toFixed(2)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-medium text-white">
                              {listing.amount.toLocaleString()}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-medium text-white">
                              ${listing.totalValue.toLocaleString()}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-green-400">
                              {formatApy(listing.apy)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-white/60">
                              {listing.expiryDate}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-mono text-xs text-white">
                              {listing.seller.slice(0, 8)}...
                              {listing.seller.slice(-8)}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Button
                              onClick={() => setSelectedListing(listing)}
                              size="sm"
                              variant="outline"
                              className="border-white/20 text-white hover:bg-slate-800/80 hover:border-cyan-400/50 hover:text-cyan-300 transition-all duration-200"
                              disabled={loading || !connected}
                            >
                              {loading ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  Loading
                                </>
                              ) : (
                                'Buy'
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Buy Modal */}
          {selectedListing && (
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={() => setSelectedListing(null)}
            >
              <Card
                className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border-white/20 text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <CardHeader>
                  <CardTitle className="text-white">
                    Buy {selectedListing.ytTokenSymbol}
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Purchase yield tokens at ${selectedListing.price.toFixed(2)} per token
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/70">APY:</span>
                      <div className="font-semibold text-green-400">
                        {formatApy(selectedListing.apy)}
                      </div>
                    </div>
                    <div>
                      <span className="text-white/70">Available:</span>
                      <div className="font-semibold text-white">
                        {selectedListing.amount.toLocaleString()} {selectedListing.ytTokenSymbol}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="buy-amount" className="text-white">
                      Amount to buy
                    </Label>
                    <Input
                      id="buy-amount"
                      type="number"
                      placeholder={`Enter amount (max ${selectedListing.amount})`}
                      value={amount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAmount(e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-cyan-400"
                    />
                    {amount && (
                      <p className="text-sm text-white/60">
                        Total cost: ${(parseFloat(amount || "0") * selectedListing.price).toFixed(2)} USD
                      </p>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={handleBuyYT}
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0"
                      disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > selectedListing.amount || isProcessing || !connected}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Buy {selectedListing.ytTokenSymbol}
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setSelectedListing(null)}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-slate-800/80 hover:border-cyan-400/50 hover:text-cyan-300 transition-all duration-200"
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sell Modal */}
          {actionType === "sell" && (
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onClick={closeActionModal}
            >
              <Card
                className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border-white/20 text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <CardHeader>
                  <CardTitle className="text-white">
                    Sell YT Tokens
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    List your yield tokens for sale on the marketplace
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="sell-amount" className="text-white">
                      Amount to sell
                    </Label>
                    <Input
                      id="sell-amount"
                      type="number"
                      placeholder="Enter amount of YT tokens"
                      value={amount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAmount(e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sell-price" className="text-white">
                      Price per token (USD)
                    </Label>
                    <Input
                      id="sell-price"
                      type="number"
                      step="0.01"
                      placeholder="Enter price per YT token"
                      value={price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPrice(e.target.value)
                      }
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-cyan-400"
                    />
                    {amount && price && (
                      <p className="text-sm text-white/60">
                        Total value: ${(parseFloat(amount || "0") * parseFloat(price || "0")).toFixed(2)} USD
                      </p>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={handleSellYT}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0"
                      disabled={!amount || !price || parseFloat(amount) <= 0 || parseFloat(price) <= 0 || isProcessing || !connected}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          List for Sale
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={closeActionModal}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-slate-800/80 hover:border-cyan-400/50 hover:text-cyan-300 transition-all duration-200"
                      disabled={isProcessing}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}