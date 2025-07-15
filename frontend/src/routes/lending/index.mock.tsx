// Mock version of the LendingPage with mock data
import { createFileRoute } from '@tanstack/react-router'
import MockLendingPage from '@/components/lendingdetails/LendingPage.mock'

export const Route = createFileRoute('/lending/index/mock')({
  component: MockLendingPage,
})
