'use client'

import { useState, useTransition } from 'react'
import { User, Mail, Phone, Link2, FileText, Briefcase } from 'lucide-react'
import { updateNominationStatus } from '../actions'
import type { ReferralNomination, NominationStatus } from '../types'
import { NOMINATION_STATUS_LABELS } from '../types'
import { ReferralStatusBadge } from './ReferralStatusBadge'

interface ReferralDetailPanelProps {
  nomination: ReferralNomination
}

/** 推薦詳細パネル（人事管理ビュー）：候補者情報 + ステータス更新フォーム */
export function ReferralDetailPanel({ nomination }: ReferralDetailPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 選択中のステータス（初期値は現在のステータス）
  const [selectedStatus, setSelectedStatus] = useState<NominationStatus>(nomination.status)

  // ステータス更新フォーム送信
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSuccessMessage(null)
    setErrorMessage(null)

    const form = e.currentTarget
    const data = new FormData(form)

    startTransition(async () => {
      const result = await updateNominationStatus(nomination.id, {
        status: selectedStatus,
        hr_notes: (data.get('hr_notes') as string).trim() || undefined,
        hired_at:
          selectedStatus === 'hired' ? (data.get('hired_at') as string) || undefined : undefined,
      })

      if (result.success) {
        setSuccessMessage('ステータスを更新しました。')
      } else {
        setErrorMessage(result.error ?? 'ステータスの更新に失敗しました。')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* 2カラム情報セクション */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左：候補者情報 */}
        <div className="bg-white rounded-xl border border-[#e2e6ec] shadow-sm p-5">
          <h2 className="text-sm font-semibold text-[#57606a] uppercase tracking-wide mb-4">
            候補者情報
          </h2>
          <dl className="space-y-3">
            {/* 氏名 */}
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-[#57606a] mt-0.5 flex-shrink-0" />
              <div>
                <dt className="text-xs text-[#57606a] leading-none mb-0.5">氏名</dt>
                <dd className="text-sm font-semibold text-[#24292f]">{nomination.nominee_name}</dd>
              </div>
            </div>
            {/* メールアドレス */}
            {nomination.nominee_email && (
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-[#57606a] mt-0.5 flex-shrink-0" />
                <div>
                  <dt className="text-xs text-[#57606a] leading-none mb-0.5">メールアドレス</dt>
                  <dd className="text-sm text-[#24292f]">{nomination.nominee_email}</dd>
                </div>
              </div>
            )}
            {/* 電話番号 */}
            {nomination.nominee_phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-[#57606a] mt-0.5 flex-shrink-0" />
                <div>
                  <dt className="text-xs text-[#57606a] leading-none mb-0.5">電話番号</dt>
                  <dd className="text-sm text-[#24292f]">{nomination.nominee_phone}</dd>
                </div>
              </div>
            )}
            {/* 関係性 */}
            {nomination.relationship && (
              <div className="flex items-start gap-3">
                <Link2 className="h-4 w-4 text-[#57606a] mt-0.5 flex-shrink-0" />
                <div>
                  <dt className="text-xs text-[#57606a] leading-none mb-0.5">関係性</dt>
                  <dd className="text-sm text-[#24292f]">{nomination.relationship}</dd>
                </div>
              </div>
            )}
            {/* 推薦理由 */}
            {nomination.nomination_reason && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-[#57606a] mt-0.5 flex-shrink-0" />
                <div>
                  <dt className="text-xs text-[#57606a] leading-none mb-0.5">推薦理由</dt>
                  <dd className="text-sm text-[#24292f] whitespace-pre-wrap">
                    {nomination.nomination_reason}
                  </dd>
                </div>
              </div>
            )}
          </dl>
        </div>

        {/* 右：推薦者情報 + 求人情報 */}
        <div className="space-y-4">
          {/* 推薦者情報 */}
          <div className="bg-white rounded-xl border border-[#e2e6ec] shadow-sm p-5">
            <h2 className="text-sm font-semibold text-[#57606a] uppercase tracking-wide mb-4">
              推薦者情報
            </h2>
            <dl className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-[#57606a] mt-0.5 flex-shrink-0" />
                <div>
                  <dt className="text-xs text-[#57606a] leading-none mb-0.5">氏名</dt>
                  <dd className="text-sm font-semibold text-[#24292f]">
                    {nomination.referrer?.name ?? '—'}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-xs text-[#57606a] leading-none mb-0.5">推薦日</dt>
                <dd className="text-sm text-[#24292f]">
                  {new Date(nomination.created_at).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#57606a] leading-none mb-0.5">現在のステータス</dt>
                <dd className="mt-1">
                  <ReferralStatusBadge status={nomination.status} />
                </dd>
              </div>
            </dl>
          </div>

          {/* 求人情報 */}
          {nomination.referral_posting && (
            <div className="bg-white rounded-xl border border-[#e2e6ec] shadow-sm p-5">
              <h2 className="text-sm font-semibold text-[#57606a] uppercase tracking-wide mb-4">
                対象求人
              </h2>
              <div className="flex items-start gap-3">
                <Briefcase className="h-4 w-4 text-[#57606a] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#24292f]">
                    {nomination.referral_posting.title}
                  </p>
                  <p className="text-xs text-[#ff6b00] font-bold mt-1">
                    報奨金: ¥{nomination.referral_posting.reward_amount.toLocaleString('ja-JP')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ステータス更新フォーム */}
      <div className="bg-white rounded-xl border border-[#e2e6ec] shadow-sm p-5">
        <h2 className="text-sm font-semibold text-[#57606a] uppercase tracking-wide mb-4">
          ステータス更新
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ステータス選択 */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-[#24292f] mb-1">
              ステータス
            </label>
            <select
              id="status"
              name="status"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as NominationStatus)}
              className="border border-[#e2e6ec] rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              {Object.entries(NOMINATION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 入社日（入社確定時のみ表示） */}
          {selectedStatus === 'hired' && (
            <div>
              <label htmlFor="hired_at" className="block text-sm font-medium text-[#24292f] mb-1">
                入社日
              </label>
              <input
                id="hired_at"
                name="hired_at"
                type="date"
                defaultValue={nomination.hired_at ?? ''}
                className="border border-[#e2e6ec] rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          {/* 人事メモ */}
          <div>
            <label htmlFor="hr_notes" className="block text-sm font-medium text-[#24292f] mb-1">
              人事メモ{' '}
              <span className="text-[#57606a] text-xs font-normal">任意（候補者には非公開）</span>
            </label>
            <textarea
              id="hr_notes"
              name="hr_notes"
              rows={3}
              defaultValue={nomination.hr_notes ?? ''}
              placeholder="選考メモ、面接フィードバック等"
              className="border border-[#e2e6ec] rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* 成功・エラーメッセージ */}
          {successMessage && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              {successMessage}
            </p>
          )}
          {errorMessage && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{errorMessage}</p>
          )}

          {/* 送信ボタン */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPending ? '更新中...' : 'ステータスを更新する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
