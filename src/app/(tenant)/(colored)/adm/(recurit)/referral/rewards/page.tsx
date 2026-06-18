import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getReferralRewards } from '@/features/referral/queries'
import { RewardManagementTable } from '@/features/referral/components/RewardManagementTable'

export const metadata = {
  title: '報奨金管理 | HR-DX',
}

export default async function ReferralRewardsPage() {
  // 認証チェック
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  // 全報奨金データ取得
  const rewards = await getReferralRewards()

  // 未払い報奨金の合計を算出
  const pendingTotal = rewards
    .filter((r) => r.status === 'pending' || r.status === 'approved')
    .reduce((sum, r) => sum + r.amount, 0)

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <h1 className="text-2xl font-bold text-slate-900">報奨金管理</h1>

      {/* 未払い報奨金サマリー */}
      {pendingTotal > 0 && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 px-5 py-4">
          <p className="text-xs font-medium text-yellow-600 mb-1">未払い・承認済み報奨金合計</p>
          <p className="text-2xl font-bold text-yellow-700">
            ¥{pendingTotal.toLocaleString('ja-JP')}
          </p>
        </div>
      )}

      {/* 報奨金管理テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">報奨金一覧</h2>
        </div>
        <RewardManagementTable rewards={rewards} />
      </div>
    </div>
  )
}
