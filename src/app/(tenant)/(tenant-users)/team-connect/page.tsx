import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import {
  getDivisions,
  getEmployeesByDivision,
  getUnassignedEmployees,
  getDirectoryEmployees,
} from '@/features/team-connect/queries'
import { DivisionTreeView } from '@/features/team-connect/components/DivisionTreeView'
import { DirectoryList } from '@/features/team-connect/components/DirectoryList'

export const metadata = { title: 'チームコネクト' }

export default async function TeamConnectPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const [divisions, employeesByDivision, unassignedEmployees, directoryEmployees] =
    await Promise.all([
      getDivisions(),
      getEmployeesByDivision(),
      getUnassignedEmployees(),
      getDirectoryEmployees(),
    ])

  return (
    <div className="px-4 sm:px-6 py-5 mx-auto max-w-300 space-y-4">
      <h1 className="text-sm font-semibold text-slate-900">チームコネクト</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500">組織図</h2>
          <DivisionTreeView
            divisions={divisions}
            employees={employeesByDivision}
            unassignedEmployees={unassignedEmployees}
          />
        </section>
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500">社内ディレクトリ</h2>
          <DirectoryList employees={directoryEmployees} divisions={divisions} />
        </section>
      </div>
    </div>
  )
}
