import { createFileRoute } from '@tanstack/react-router'
import LendingPage from '@/components/lending/LendingPage'

export const Route = createFileRoute('/lending/')({
  component: LendingPage,
})
