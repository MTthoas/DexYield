import { createFileRoute } from '@tanstack/react-router'
import LendingPage from '@/components/lendingdetails/LendingPage'

export const Route = createFileRoute('/lending/')({
  component: LendingPage,
})
