// Unified mock hooks export
export * from './hooks'
export * from './context'
export * from './data'
export { MockApp, isMockMode } from './index'

// Re-export mock components for easy access
export { default as MockLendingPage } from '@/components/lendingdetails/LendingPage.mock'
export { MockAdminPage } from '@/components/admin/AdminPage.mock'
export { MockMarketplacePage } from '@/components/marketplace/MarketplacePage.mock'
