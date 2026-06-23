import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getActivePeriod } from '@/features/stress-check/queries'
import {
  getHighStressEmployees,
  getDivisionsWithCounts,
  getSubmissionCountsByDivision,
  DivisionNode,
} from '@/features/adm/high-stress/queries'
import HighStressClient from './HighStressClient'
import { HeartHandshake, ShieldAlert } from 'lucide-react'

/**
 * 人事向け高ストレス者一覧（実名表示）
 */
export default async function HighStressPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const period = await getActivePeriod()

  if (!period) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <PageHeader />
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <HeartHandshake className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg font-semibold text-gray-600">
            実施中のストレスチェックがありません
          </p>
          <p className="text-sm text-gray-400 mt-2">
            ストレスチェック期間を登録し、実施する必要があります。
          </p>
        </div>
      </div>
    )
  }

  const [employees, divisionStats, submissionCounts] = await Promise.all([
    getHighStressEmployees(period.id),
    getDivisionsWithCounts(user.tenant_id),
    getSubmissionCountsByDivision(user.tenant_id, period.id),
  ])

  return (
    <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
      <PageHeader />
      <div className="flex items-start gap-3 bg-blue-50/70 border border-blue-200 rounded-2xl p-4 px-5">
        <ShieldAlert className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-blue-800">高ストレス者フォローアップ運用について</p>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            ※本ページでは「高ストレス判定」かつ「事業者への結果提供に同意」した従業員のみが表示されます。
            <br />
            人事担当者はステータスの確認・更新のみ可能です。詳細な面談記録は産業医・保健師専用画面で管理されています。
          </p>
        </div>
      </div>
      <HighStressClient
        data={employees}
        periodId={period.id}
        isDoctor={false}
        divisionStats={divisionStats}
        submissionCounts={submissionCounts}
      />
    </div>
  )
}

function PageHeader() {
  return (
    <div className="relative pl-5">
      <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full" />
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
        <HeartHandshake className="w-8 h-8 text-blue-600" />
        高ストレス者一覧（人事用）
      </h1>
      <p className="text-sm text-gray-500 mt-1 font-medium pl-11">ステータス確認・更新</p>
    </div>
  )
}
