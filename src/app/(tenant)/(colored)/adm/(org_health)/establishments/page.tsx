import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getTenantStressSettingsRow,
  listDivisionsForAnchorPicker,
} from '@/features/adm/division-establishments/queries'
import {
  getStressCheckPeriodsWithDivisions,
  countEmployeesNotCoveredByPeriods,
} from '@/features/adm/stress-check/mnt-sets/queries'
import DivisionEstablishmentsClient from '@/features/adm/division-establishments/components/DivisionEstablishmentsClient'

export default async function DivisionEstablishmentsPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const [divisions, settings, unassignedCount, periods] = await Promise.all([
    listDivisionsForAnchorPicker(user.tenant_id),
    getTenantStressSettingsRow(user.tenant_id),
    countEmployeesNotCoveredByPeriods(user.tenant_id),
    getStressCheckPeriodsWithDivisions(user.tenant_id),
  ])

  const minRespondents = settings?.min_group_analysis_respondents ?? 11

  return (
    <div className="p-6 space-y-6">
      <header className="relative pl-5">
        <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-gradient-to-b from-blue-500 to-teal-500 rounded-full" />
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          ストレスチェック実施拠点の登録
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          集団分析の拠点別表示・進捗集計・報告書出力の基礎となる事業場を定義します。
        </p>
      </header>
      <DivisionEstablishmentsClient
        tenantId={user.tenant_id}
        establishments={[]}
        anchorEmployeeCounts={{}}
        divisions={divisions}
        minRespondents={minRespondents}
        unassignedCount={unassignedCount}
        periods={periods}
      />
    </div>
  )
}
