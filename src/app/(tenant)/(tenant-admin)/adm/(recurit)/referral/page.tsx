import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, UserCheck, Gift } from 'lucide-react'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import TenantBackLink from '@/components/common/TenantBackLink'
import { getReferralSummary, getReferralNominations } from '@/features/referral/queries'
import { ReferralListTable } from '@/features/referral/components/ReferralListTable'

export const metadata = {
  title: 'リファラル採用管理 | HR-DX',
}

export default async function ReferralAdminPage() {
  // 認証チェック
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  // データ並行取得
  const [summary, nominations] = await Promise.all([getReferralSummary(), getReferralNominations()])

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">リファラル採用管理</h1>
        <div className="flex items-center gap-2">
          <TenantBackLink className="self-start shrink-0" />
          <Link
            href={APP_ROUTES.TENANT.ADMIN_REFERRAL_POSTINGS}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            求人管理
          </Link>
          <Link
            href={APP_ROUTES.TENANT.ADMIN_REFERRAL_REWARDS}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            報奨金管理
          </Link>
        </div>
      </div>

      {/* サマリーカード（4枚） */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* アクティブ推薦件数 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-slate-500">アクティブ推薦</p>
            <div className="rounded-lg bg-blue-50 p-1.5">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{summary.total_active}</p>
          <p className="mt-0.5 text-xs text-slate-400">件</p>
        </div>

        {/* 今月入社確定 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-slate-500">今月入社確定</p>
            <div className="rounded-lg bg-green-50 p-1.5">
              <UserCheck className="h-4 w-4 text-green-500" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{summary.hired_this_month}</p>
          <p className="mt-0.5 text-xs text-slate-400">名</p>
        </div>

        {/* 未払い報奨金件数 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-slate-500">未払い報奨金件数</p>
            <div className="rounded-lg bg-yellow-50 p-1.5">
              <Gift className="h-4 w-4 text-yellow-500" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{summary.pending_rewards}</p>
          <p className="mt-0.5 text-xs text-slate-400">件</p>
        </div>

        {/* 未払い報奨金総額 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-slate-500">未払い報奨金総額</p>
            <div className="rounded-lg bg-yellow-50 p-1.5">
              <Gift className="h-4 w-4 text-yellow-500" />
            </div>
          </div>
          <p className="mt-3 text-xl font-bold text-slate-900">
            ¥{summary.pending_reward_amount.toLocaleString('ja-JP')}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">円</p>
        </div>
      </div>

      {/* 推薦一覧テーブル */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">推薦一覧</h2>
          <p className="text-xs text-slate-400 mt-0.5">全ての推薦を表示しています</p>
        </div>
        <ReferralListTable nominations={nominations} />
      </div>
    </div>
  )
}
