import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getAssignments, getEmployeesForAssignment } from '@/features/e-learning/queries'
import { AssignmentListClient } from '@/features/e-learning/components/AssignmentListClient'

export const dynamic = 'force-dynamic'

export default async function ElAssignmentsPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const [assignments, employees] = await Promise.all([
    getAssignments(),
    getEmployeesForAssignment(),
  ])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">受講割り当て管理</h1>
        <p className="text-sm text-gray-500 mt-1">従業員へのコース受講割り当てを管理します</p>
      </div>
      <AssignmentListClient assignments={assignments} employees={employees} />
    </div>
  )
}
