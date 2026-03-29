import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getEmployees,
  getDivisions,
  getAppRoles,
  getTenantEmployeeCapacity,
} from '@/features/organization/queries'
import { EmployeeTable } from '@/features/organization/components/EmployeeTable'

export default async function EmployeesPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const [employees, divisions, appRoles, employeeCapacity] = await Promise.all([
    getEmployees(),
    getDivisions(),
    getAppRoles(),
    getTenantEmployeeCapacity(user.tenant_id),
  ])

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1600px]">
      <EmployeeTable
        employees={employees}
        divisions={divisions}
        appRoles={appRoles}
        tenantId={user.tenant_id}
        employeeCapacity={employeeCapacity}
      />
    </div>
  )
}
