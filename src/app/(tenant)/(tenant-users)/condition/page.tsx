import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getTodayCheckin, getMyCheckinTrend } from '@/features/condition-checkin/queries'
import { CheckinWidget } from '@/features/condition-checkin/components/CheckinWidget'
import { ConditionTrendChart } from '@/features/condition-checkin/components/ConditionTrendChart'

export const metadata = { title: 'コンディション記録' }

export default async function ConditionPage() {
  const user = await getServerUser()
  if (!user?.employee_id) {
    redirect(APP_ROUTES.TENANT.PORTAL)
  }

  const [todayCheckin, trend] = await Promise.all([
    getTodayCheckin(user.employee_id),
    getMyCheckinTrend(user.employee_id),
  ])

  return (
    <div className="px-4 sm:px-6 py-6 mx-auto w-full max-w-[1200px] space-y-4">
      <h1 className="text-sm font-semibold text-slate-900">コンディション記録</h1>

      <CheckinWidget initialScore={todayCheckin?.score ?? null} />

      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <h2 className="text-sm font-bold text-slate-800 mb-3">過去30日の推移</h2>
        <ConditionTrendChart data={trend} />
      </div>

      {user.is_manager && user.division_id && (
        <Link
          href={APP_ROUTES.TENANT.CONDITION_TEAM_TREND}
          className="inline-flex items-center gap-1 text-xs font-semibold text-(--brand) hover:underline"
        >
          部署のコンディション傾向を見る
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  )
}
