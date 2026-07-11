'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import type { ReferralNomination, ReferralReward } from '@/features/referral/types'
import { ReferralStatusBadge } from '@/features/referral/components/ReferralStatusBadge'
import { RewardStatusBadge } from '@/features/referral/components/RewardStatusBadge'

interface MyNominationsClientProps {
  nominations: ReferralNomination[]
  rewards: ReferralReward[]
}

/** マイ推薦一覧 クライアントコンポーネント */
export function MyNominationsClient({ nominations, rewards }: MyNominationsClientProps) {
  return (
    <div className="px-4 sm:px-6 mx-auto w-full max-w-[1200px] space-y-8">
      {/* ヘッダー */}
      <div>
        <div className="flex justify-end">
          <Link
            href={APP_ROUTES.TENANT.REFERRAL_FORM}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-3"
          >
            <ChevronLeft className="h-4 w-4" />
            求人一覧に戻る
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">マイ推薦一覧</h1>
      </div>

      {/* 推薦履歴 */}
      <section>
        <h2 className="text-base font-semibold text-slate-700 mb-4">推薦履歴</h2>
        {nominations.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
            <p className="text-slate-400 text-sm">まだ推薦履歴がありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      推薦日
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      候補者名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      求人
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      ステータス
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nominations.map(nomination => (
                    <tr key={nomination.id} className="hover:bg-slate-50 transition-colors">
                      {/* 推薦日 */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {new Date(nomination.created_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </td>
                      {/* 候補者名 */}
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {nomination.nominee_name}
                      </td>
                      {/* 求人タイトル */}
                      <td className="px-4 py-3 text-slate-600">
                        {nomination.referral_posting?.title ?? '—'}
                      </td>
                      {/* ステータス */}
                      <td className="px-4 py-3">
                        <ReferralStatusBadge status={nomination.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 報奨金情報 */}
      <section>
        <h2 className="text-base font-semibold text-slate-700 mb-4">報奨金情報</h2>
        {rewards.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
            <p className="text-slate-400 text-sm">報奨金の支払い対象はまだありません</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      金額
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      ステータス
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      支払予定日
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      支払完了日
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rewards.map(reward => (
                    <tr key={reward.id} className="hover:bg-slate-50 transition-colors">
                      {/* 金額 */}
                      <td className="px-4 py-3 font-bold text-[#ff6b00]">
                        ¥{reward.amount.toLocaleString('ja-JP')}
                      </td>
                      {/* ステータス */}
                      <td className="px-4 py-3">
                        <RewardStatusBadge status={reward.status} />
                      </td>
                      {/* 支払予定日 */}
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {reward.scheduled_date
                          ? new Date(reward.scheduled_date).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })
                          : '—'}
                      </td>
                      {/* 支払完了日 */}
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {reward.paid_at
                          ? new Date(reward.paid_at).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                            })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
