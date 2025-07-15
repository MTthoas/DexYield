import { createFileRoute } from '@tanstack/react-router'
import { isMockMode } from '@/mock/index'
import LendingPage from '@/components/lendingdetails/LendingPage'
import MockLendingPage from '@/components/lendingdetails/LendingPage.mock'

export const Route = createFileRoute('/lending/')({
  component: () => {
    if (isMockMode()) {
      return <MockLendingPage />
    }
    return <LendingPage />
  },
})
