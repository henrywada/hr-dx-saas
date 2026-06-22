'use client'

import { useTransition } from 'react'
import { Briefcase, Clock, Users, ToggleLeft, ToggleRight } from 'lucide-react'
import type { ReferralPosting } from '../types'
import { EMPLOYMENT_TYPE_LABELS } from '../types'
import { updateReferralPosting } from '../actions'

interface ReferralPostingCardProps {
  posting: ReferralPosting & { nomination_count?: number }
  /** 従業員が推薦ボタンを押したときのコールバック。undefined = 人事管理ビュー（ボタン非表示） */
  onNominate?: (postingId: string) => void
  /** true = 人事管理ビュー（有効/無効トグルを表示） */
  showToggle?: boolean
}

/** リファラル求人カード */
export function ReferralPostingCard({
  posting,
  onNominate,
  showToggle = false,
}: ReferralPostingCardProps) {
  const [isPending, startTransition] = useTransition()

  // 有効/無効トグル
  const handleToggleActive = () => {
    startTransition(async () => {
      await updateReferralPosting(posting.id, { is_active: !posting.is_active })
    })
  }

  // 締切日のフォーマット（YYYY/MM/DD）
  const formattedDeadline = posting.deadline
    ? new Date(posting.deadline).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : null

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm transition-opacity ${
        posting.is_active ? 'border-[#e2e6ec]' : 'border-[#e2e6ec] opacity-60'
      }`}
    >
      {/* ヘッダー：タイトル + トグル */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-[#24292f] leading-snug">{posting.title}</h3>
        </div>
        {showToggle && (
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={isPending}
            aria-label={posting.is_active ? '募集を停止する' : '募集を再開する'}
            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium text-[#57606a] hover:text-[#24292f] disabled:opacity-50 transition-colors"
          >
            {posting.is_active ? (
              <>
                <ToggleRight className="h-5 w-5 text-[#0055ff]" />
                <span className="text-[#0055ff]">公開中</span>
              </>
            ) : (
              <>
                <ToggleLeft className="h-5 w-5 text-[#57606a]" />
                <span>停止中</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* バッジ行：部署 / 雇用形態 / 推薦件数 */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {posting.department && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f6f8fa] px-2.5 py-0.5 text-xs font-medium text-[#57606a]">
            <Briefcase className="h-3 w-3" />
            {posting.department}
          </span>
        )}
        {posting.employment_type && (
          <span className="inline-flex items-center rounded-full bg-[#f6f8fa] px-2.5 py-0.5 text-xs font-medium text-[#FD7601]">
            {EMPLOYMENT_TYPE_LABELS[posting.employment_type]}
          </span>
        )}
        {posting.nomination_count !== undefined && (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
            <Users className="h-3 w-3" />
            推薦 {posting.nomination_count}件
          </span>
        )}
      </div>

      {/* 報奨金 */}
      <div className="mt-3">
        <p className="text-lg font-bold text-[#ff6b00]">
          ¥{posting.reward_amount.toLocaleString('ja-JP')}
        </p>
        {posting.reward_condition && (
          <p className="mt-0.5 text-xs text-[#57606a]">{posting.reward_condition}</p>
        )}
      </div>

      {/* 締切日 */}
      {formattedDeadline && (
        <div className="mt-2 flex items-center gap-1 text-xs text-[#57606a]">
          <Clock className="h-3.5 w-3.5" />
          <span>締切: {formattedDeadline}</span>
        </div>
      )}

      {/* 概要 */}
      {posting.description && (
        <p className="mt-3 text-sm text-[#57606a] line-clamp-2">{posting.description}</p>
      )}

      {/* 推薦ボタン（従業員ビューのみ） */}
      {onNominate && (
        <div className="mt-4 pt-4 border-t border-[#e2e6ec]">
          <button
            type="button"
            onClick={() => onNominate(posting.id)}
            className="w-full rounded-lg bg-[#0055ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#FD7601] transition-colors"
          >
            この求人で推薦する
          </button>
        </div>
      )}
    </div>
  )
}
