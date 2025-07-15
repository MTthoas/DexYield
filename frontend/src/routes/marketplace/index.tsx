// Marketplace route with mock support
import { createFileRoute } from '@tanstack/react-router'
import { isMockMode } from '@/mock/index'
import { MockMarketplacePage } from '@/components/marketplace/MarketplacePage.mock'

export const Route = createFileRoute('/marketplace/')({
  component: () => {
    if (isMockMode()) {
      return <MockMarketplacePage />
    }
    return <div>Marketplace coming soon...</div>
  },
})
