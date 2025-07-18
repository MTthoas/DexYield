// Marketplace route with mock support
import { createFileRoute } from '@tanstack/react-router'
import { isMockMode } from '@/mock/index'
import { MockMarketplacePage } from '@/components/marketplace/MarketplacePage.mock'
import { MarketplacePage } from '@/components/marketplace/MarketplacePage'

export const Route = createFileRoute('/marketplace/')({
  component: () => {
    if (isMockMode()) {
      return <MockMarketplacePage />
    }
    return <MarketplacePage />
  },
})
