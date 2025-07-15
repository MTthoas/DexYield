import { createFileRoute } from '@tanstack/react-router'
import { isMockMode } from '@/mock/index'
import { AdminPage } from '../../components/admin/AdminPage'
import { MockAdminPage } from '../../components/admin/AdminPage.mock'

export const Route = createFileRoute('/admin/')({
  component: () => {
    if (isMockMode()) {
      return <MockAdminPage />
    }
    return <AdminPage />
  }
})
