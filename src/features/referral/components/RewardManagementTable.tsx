'use client'

import { useTransition } from 'react'
import type { ReferralReward } from '../types'
import { updateRewardStatus } from '../actions'
import { RewardStatusBadge } from './RewardStatusBadge'

interface RewardManagementTableProps {
  rewards: ReferralReward[]
}

/** 報奨金管理テーブル（人事管理ビュー） */
export function RewardManagementTable({ rewards }: RewardManagementTableProps) {
  if (rewards.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-400">
        報奨金データがありません
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              推薦者名
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              候補者名
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              金額
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              ステータス
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              支払い予定日
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              支払い日
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rewards.map(reward => (
            <RewardRow key={reward.id} reward={reward} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** 1行分の報奨金レコード（useTransition のスコープを行単位に分離） */
function RewardRow({ reward }: { reward: ReferralReward }) {
  const [isPending, startTransition] = useTransition()

  // 承認ボタン（pending → approved）
  const handleApprove = () => {
    startTransition(async () => {
      await updateRewardStatus(reward.id, { status: 'approved' })
    })
  }

  // 支払い完了ボタン（approved → paid）
  const handleMarkPaid = () => {
    startTransition(async () => {
      const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      await updateRewardStatus(reward.id, { status: 'paid', paid_at: today })
    })
  }

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      {/* 推薦者名 */}
      <td className="px-4 py-3 font-medium text-slate-900">
        {reward.referrer?.name ?? <span className="text-slate-400">—</span>}
      </td>
      {/* 候補者名 */}
      <td className="px-4 py-3 text-slate-700">
        {reward.nomination?.nominee_name ?? <span className="text-slate-400">—</span>}
      </td>
      {/* 金額 */}
      <td className="px-4 py-3 font-semibold text-slate-900">
        ¥{reward.amount.toLocaleString('ja-JP')}
      </td>
      {/* ステータス */}
      <td className="px-4 py-3">
        <RewardStatusBadge status={reward.status} />
      </td>
      {/* 支払い予定日 */}
      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
        {reward.scheduled_date ? formatDate(reward.scheduled_date) : '—'}
      </td>
      {/* 支払い日 */}
      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
        {reward.paid_at ? formatDate(reward.paid_at) : '—'}
      </td>
      {/* 操作 */}
      <td className="px-4 py-3">
        {reward.status === 'pending' && (
          <button
            type="button"
            onClick={handleApprove}
            disabled={isPending}
            className="rounded-lg border border-[#0055ff] px-3 py-1 text-xs font-semibold text-[#0055ff] hover:bg-blue-50 disabled:opacity-50 transition-colors"
          >
            承認
          </button>
        )}
        {reward.status === 'approved' && (
          <button
            type="button"
            onClick={handleMarkPaid}
            disabled={isPending}
            className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            支払い完了
          </button>
        )}
      </td>
    </tr>
  )
}

/** 日付文字列を YYYY/MM/DD にフォーマットする */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
