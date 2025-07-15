// Conditional hooks based on mock mode
import { isMockMode } from '@/mock'

// Real hooks
import { useWallet as useRealWallet } from '@solana/wallet-adapter-react'
import { useLending as useRealLending } from '@/hooks/useLending'
import { useLendingSimplified as useRealLendingSimplified } from '@/hooks/useLendingSimplified'
import { useAdminAccess as useRealAdminAccess } from '@/hooks/useAdminAccess'
import { useContracts as useRealContracts } from '@/hooks/useContracts'
import { useMarketplace as useRealMarketplace } from '@/hooks/useMarketplace'

// Mock hooks
import { 
  useMockWallet, 
  useMockLending, 
  useMockLendingSimplified, 
  useMockAdminAccess, 
  useMockContracts, 
  useMockMarketplace 
} from '@/mock/hooks'

// Conditional exports
export const useWallet = isMockMode() ? useMockWallet : useRealWallet
export const useLending = isMockMode() ? useMockLending : useRealLending
export const useLendingSimplified = isMockMode() ? useMockLendingSimplified : useRealLendingSimplified
export const useAdminAccess = isMockMode() ? useMockAdminAccess : useRealAdminAccess
export const useContracts = isMockMode() ? useMockContracts : useRealContracts
export const useMarketplace = isMockMode() ? useMockMarketplace : useRealMarketplace
