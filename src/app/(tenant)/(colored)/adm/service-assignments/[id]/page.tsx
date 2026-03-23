import { getServerUser } from '@/lib/auth/server-user'
import { redirect, notFound } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getServiceAssignmentById,
  getServiceAssignmentUsersWithEmployees,
} from '@/features/service-assignments/queries'
import { ServiceAssignmentDetailClient } from '@/features/service-assignments/components/ServiceAssignmentDetailClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ServiceAssignmentDetailPage({ params }: PageProps) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const { id } = await params
  const [assignment, users] = await Promise.all([
    getServiceAssignmentById(id),
    getServiceAssignmentUsersWithEmployees(id),
  ])

  if (!assignment) {
    notFound()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <ServiceAssignmentDetailClient assignment={assignment} users={users} />
    </div>
  )
}
