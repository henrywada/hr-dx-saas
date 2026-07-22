import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import TenantBackLink from '@/components/common/TenantBackLink'
import {
  countEmployeesWithoutEstablishment,
  getTenantStressSettingsRow,
  listDivisionEstablishments,
  listDivisionsForAnchorPicker,
} from '@/features/adm/division-establishments/queries'
import DivisionEstablishmentsClient from '@/features/adm/division-establishments/components/DivisionEstablishmentsClient'

export default async function DivisionEstablishmentsPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const [{ establishments, anchorEmployeeCounts }, divisions, settings, unassignedCount] =
    await Promise.all([
      listDivisionEstablishments(user.tenant_id),
      listDivisionsForAnchorPicker(user.tenant_id),
      getTenantStressSettingsRow(user.tenant_id),
      countEmployeesWithoutEstablishment(user.tenant_id),
    ])

  const minRespondents = settings?.min_group_analysis_respondents ?? 11

  return (
    <div className="space-y-6">
      <header className="relative pl-5 flex items-start justify-between gap-3">
        <div>
          <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-gradient-to-b from-blue-500 to-teal-500 rounded-full" />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            拠点（事業場）マスタ（分析用に設定）
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            集団分析・進捗の拠点別表示の単位となる事業場を定義します。
          </p>
        </div>
        <TenantBackLink className="self-start shrink-0" />
      </header>
      <DivisionEstablishmentsClient
        tenantId={user.tenant_id}
        establishments={establishments}
        anchorEmployeeCounts={anchorEmployeeCounts}
        divisions={divisions}
        minRespondents={minRespondents}
        unassignedCount={unassignedCount}
      />
    </div>
  )
}
