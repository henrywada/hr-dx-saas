'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import type { ReferralNomination } from '../types'
import { ReferralStatusBadge } from './ReferralStatusBadge'

interface ReferralListTableProps {
  nominations: ReferralNomination[]
}

/** 推薦一覧テーブル（人事管理ビュー） */
export function ReferralListTable({ nominations }: ReferralListTableProps) {
  if (nominations.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-[#57606a]">
        推薦データがありません
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#e2e6ec] bg-[#f6f8fa]">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#57606a]">
              推薦日
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#57606a]">
              候補者名
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#57606a]">
              推薦求人
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#57606a]">
              推薦者
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#57606a]">
              ステータス
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#57606a]">
              最終更新
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#57606a]">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e2e6ec]">
          {nominations.map(nomination => (
            <tr key={nomination.id} className="hover:bg-[#f6f8fa] transition-colors">
              {/* 推薦日 */}
              <td className="px-4 py-3 whitespace-nowrap text-[#57606a]">
                {formatDate(nomination.created_at)}
              </td>
              {/* 候補者名 */}
              <td className="px-4 py-3 font-medium text-[#24292f]">{nomination.nominee_name}</td>
              {/* 推薦求人 */}
              <td className="px-4 py-3">
                {nomination.referral_posting ? (
                  <span className="text-[#24292f]">{nomination.referral_posting.title}</span>
                ) : (
                  <span className="text-[#57606a]">—</span>
                )}
              </td>
              {/* 推薦者 */}
              <td className="px-4 py-3 text-[#57606a]">
                {nomination.referrer?.name ?? <span className="text-[#57606a]">—</span>}
              </td>
              {/* ステータス */}
              <td className="px-4 py-3">
                <ReferralStatusBadge status={nomination.status} />
              </td>
              {/* 最終更新 */}
              <td className="px-4 py-3 whitespace-nowrap text-[#57606a]">
                {formatDate(nomination.updated_at)}
              </td>
              {/* 操作 */}
              <td className="px-4 py-3">
                <Link
                  href={APP_ROUTES.TENANT.ADMIN_REFERRAL_DETAIL(nomination.id)}
                  className="inline-flex items-center gap-0.5 text-xs font-medium text-[#0055ff] hover:underline"
                >
                  詳細
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
