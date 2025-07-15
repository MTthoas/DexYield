// Mock marketplace page - standalone component since marketplace route doesn't exist yet
import { MockMarketplacePage } from '@/components/marketplace/MarketplacePage.mock'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/marketplace/index/mock')({
  component: MockMarketplacePage,
})
