import { useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ContractService, getProvider } from "../lib/contracts";

export const useContracts = () => {
  const wallet = useWallet();

  const contractService = useMemo(() => {
    if (!wallet.connected) {
      console.log("Wallet not connected, returning null");
      return null;
    }

    if (!wallet.publicKey) {
      console.log("Wallet publicKey missing, returning null");
      return null;
    }

    if (!wallet.signTransaction) {
      console.log("Wallet signTransaction missing, returning null");
      return null;
    }

    try {
      console.log("Creating provider for wallet...");
      const provider = getProvider(wallet);
      console.log("Provider created successfully");
      
      const service = new ContractService(provider);
      console.log("ContractService created, checking initialization...");
      console.log("Is initialized:", service.isInitialized());
      
      if (!service.isInitialized()) {
        console.error("ContractService failed to initialize properly");
        return null;
      }
      
      return service;
    } catch (error) {
      console.error("Error in useContracts:", error);
      return null;
    }
  }, [wallet.connected, wallet.publicKey, wallet.signTransaction]);

  return contractService;
};
