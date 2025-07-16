import { createFileRoute } from '@tanstack/react-router'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { isMockMode } from '@/mock/index'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

function AdminPage() {
  // Pour l'instant, le dashboard admin fonctionne en mode normal et mock
  // Si nécessaire, on peut créer une version mock plus tard
  return <AdminDashboard />
}