import { createFileRoute } from '@tanstack/react-router'
import { ContractInteractionsDashboard } from '@/components/ContractInteractionsDashboard'

export const Route = createFileRoute('/dashboard/')({
  component: ContractInteractionsDashboard,
})