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
import TenantBackLink from '@/components/common/TenantBackLink'

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
    <div className="px-4 sm:px-6 py-5 mx-auto max-w-[1200px] space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#24292f] tracking-tight">チームコネクト</h1>
          <p className="text-sm text-[#57606a] mt-1">
            組織図で部署構成を確認し、社内ディレクトリで氏名・社員番号からメンバーを検索できます。
          </p>
        </div>
        <TenantBackLink />
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-[#57606a] uppercase tracking-wide">組織図</h2>
          <p className="text-xs text-[#57606a] -mt-1">
            部署ツリーを展開して、所属メンバーと人数を確認できます。
          </p>
          <DivisionTreeView
            divisions={divisions}
            employees={employeesByDivision}
            unassignedEmployees={unassignedEmployees}
          />
        </section>
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-[#57606a] uppercase tracking-wide">
            社内ディレクトリ
          </h2>
          <p className="text-xs text-[#57606a] -mt-1">
            氏名・社員番号で検索し、部署で絞り込めます。
          </p>
          <DirectoryList employees={directoryEmployees} divisions={divisions} />
        </section>
      </div>
    </div>
  )
}
