import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useContracts } from './useContracts';
import { useLending } from './useLending';

export const useMarketplace = () => {
  const { publicKey } = useWallet();
  const contractService = useContracts();
  const { fetchStrategies, getUserDeposit, getUserTokenBalance } = useLending();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [userYieldTokens, setUserYieldTokens] = useState<any[]>([]);

  // Fetch user's yield tokens - adapted from WalletInfo.tsx
  const fetchUserYieldTokens = useCallback(async () => {
    if (!publicKey || !contractService) {
      setUserYieldTokens([]);
      return;
    }

    try {
      console.log("🔍 Fetching user yield tokens for marketplace...");
      const strategiesData = await fetchStrategies();

      if (!strategiesData || strategiesData.length === 0) {
        console.log("No strategies found");
        setUserYieldTokens([]);
        return;
      }

      const yieldTokensData = [];

      for (const strategy of strategiesData) {
        try {
          console.log(`🔍 Checking strategy ${strategy.id} for yield tokens...`);
          
          // Récupérer les données de dépôt utilisateur
          const userDeposit = await getUserDeposit(
            publicKey,
            new PublicKey(strategy.id)
          );

          console.log(`💰 User deposit for strategy ${strategy.id}:`, userDeposit);

          // Vérifier si l'utilisateur a un dépôt
          if (userDeposit && userDeposit.amount > 0) {
            // Récupérer le YT mint directement depuis la stratégie 
            const ytMintAddress = strategy.tokenYieldAddress;
            
            if (ytMintAddress) {
              console.log(`🎯 YT mint found for strategy ${strategy.id}:`, ytMintAddress);
              
              // Récupérer le solde YT de l'utilisateur
              const ytMint = new PublicKey(ytMintAddress);
              const ytBalance = await getUserTokenBalance(ytMint);
              
              console.log(`📊 YT balance for ${strategy.id}:`, ytBalance);
              
              const ytBalanceNum = ytBalance && ytBalance.balance 
                ? Number(ytBalance.balance) / Math.pow(10, 6) // 6 decimals for YT
                : 0;

              console.log(`🔢 YT balance converted: ${ytBalanceNum}`);

              if (ytBalanceNum > 0) {
                yieldTokensData.push({
                  mint: ytMintAddress,
                  symbol: `YT-${strategy.tokenSymbol}`,
                  icon: `/images/tokens/yt-${strategy.tokenSymbol?.toLowerCase()}.png`,
                  amount: ytBalanceNum,
                  yieldEarned: userDeposit.yieldEarned ? Number(userDeposit.yieldEarned) / Math.pow(10, 6) : 0,
                  strategy: strategy.name,
                  strategyId: strategy.id,
                  decimals: 6,
                  tokenAccount: ytBalance?.address || null, // Pour le listing
                });
                console.log(`✅ Added yield token for strategy ${strategy.id}`);
              } else {
                console.log(`❌ No YT balance for strategy ${strategy.id}`);
              }
            } else {
              console.log(`❌ No YT mint found for strategy ${strategy.id}`);
            }
          } else {
            console.log(`❌ No user deposit for strategy ${strategy.id}`);
          }
        } catch (error) {
          console.log(`Error fetching YT for strategy ${strategy.id}:`, error);
        }
      }

      console.log("📊 User yield tokens found:", yieldTokensData);
      setUserYieldTokens(yieldTokensData);
    } catch (error) {
      console.error("Error fetching user yield tokens:", error);
      setUserYieldTokens([]);
    }
  }, [publicKey, contractService, fetchStrategies, getUserDeposit, getUserTokenBalance]);

  // List YT tokens for sale
  const listYT = useCallback(async (
    ytTokenAccount: PublicKey,
    escrowAccount: PublicKey,
    price: number,
    amount: number
  ) => {
    if (!contractService || !publicKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const txId = await contractService.listYT(
        publicKey,
        ytTokenAccount,
        escrowAccount,
        price,
        amount
      );
      console.log('YT listing successful:', txId);
      return txId;
    } catch (err) {
      console.error('Error listing YT:', err);
      setError(err instanceof Error ? err.message : 'Failed to list YT');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  // Buy YT tokens
  const buyYT = useCallback(async (
    seller: PublicKey,
    buyerTokenAccount: PublicKey,
    buyerYtAccount: PublicKey,
    sellerTokenAccount: PublicKey,
    escrowAccount: PublicKey,
    pool: PublicKey,
    ytMint: PublicKey
  ) => {
    if (!contractService || !publicKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const txId = await contractService.buyYT(
        publicKey,
        seller,
        buyerTokenAccount,
        buyerYtAccount,
        sellerTokenAccount,
        escrowAccount,
        pool,
        ytMint
      );
      console.log('YT purchase successful:', txId);
      return txId;
    } catch (err) {
      console.error('Error buying YT:', err);
      setError(err instanceof Error ? err.message : 'Failed to buy YT');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  // Cancel listing
  const cancelListing = useCallback(async (
    escrowAccount: PublicKey,
    sellerTokenAccount: PublicKey
  ) => {
    if (!contractService || !publicKey) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const txId = await contractService.cancelListing(
        publicKey,
        escrowAccount,
        sellerTokenAccount
      );
      console.log('Listing cancelled:', txId);
      return txId;
    } catch (err) {
      console.error('Error cancelling listing:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel listing');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [contractService, publicKey]);

  // Get a specific listing
  const getListing = useCallback(async (seller: PublicKey) => {
    if (!contractService) return null;
    
    try {
      const listingData = await contractService.getListing(seller);
      return listingData;
    } catch (err) {
      console.error('Error fetching listing:', err);
      return null;
    }
  }, [contractService]);

  // Fetch all listings
  const fetchListings = useCallback(async () => {
    if (!contractService) return;
    
    setLoading(true);
    try {
      console.log("🔍 Fetching all listings from marketplace...");
      const allListings = await contractService.getAllListings();
      console.log("📊 Raw listings from contract:", allListings);
      
      // Transform the listings to match our interface
      const formattedListings = allListings.map((listing: any, index: number) => ({
        id: listing.publicKey?.toString() || `listing-${index}`,
        seller: listing.account?.seller?.toString() || '',
        ytMint: listing.account?.ytMint?.toString() || listing.account?.yt_mint?.toString() || '',
        amount: listing.account?.amount ? Number(listing.account.amount) / 1000000 : 0, // Convert from micro-units
        price: listing.account?.price ? Number(listing.account.price) / 1000000 : 0, // Convert from micro-units
        active: listing.account?.active !== undefined ? listing.account.active : true,
        createdAt: listing.account?.createdAt ? Number(listing.account.createdAt) : 
                  listing.account?.created_at ? Number(listing.account.created_at) : 
                  Date.now() / 1000,
      }));
      
      console.log("✅ Formatted listings:", formattedListings);
      setListings(formattedListings);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  }, [contractService]);

  // Load initial data
  useEffect(() => {
    if (contractService) {
      fetchListings();
    }
  }, [contractService, fetchListings]);

  return {
    loading,
    error,
    listings,
    userYieldTokens,
    listYT,
    buyYT,
    cancelListing,
    getListing,
    fetchListings,
    fetchUserYieldTokens,
  };
};