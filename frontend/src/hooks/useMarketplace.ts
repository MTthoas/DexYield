import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useContracts } from './useContracts';
import { findListingPDA, findEscrowAuthorityPDA } from '../lib/contracts';
import { DEVNET_CONFIG } from '../lib/constants';

export const useMarketplace = () => {
  const { publicKey } = useWallet();
  const contractService = useContracts();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<any[]>([]);

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
      const allListings = await contractService.getAllListings();
      setListings(allListings);
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
    listYT,
    buyYT,
    cancelListing,
    getListing,
    fetchListings,
  };
};