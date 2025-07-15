// Mock version of the AdminPage with mock data
import { createFileRoute } from '@tanstack/react-router'
import { MockAdminPage } from '@/components/admin/AdminPage.mock'

export const Route = createFileRoute('/admin/index/mock')({
  component: () => <MockAdminPage />
})
