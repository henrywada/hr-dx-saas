'use client'

import { Briefcase } from 'lucide-react'
import type { ReferralPosting } from '../types'

interface ReferralPostingSelectorProps {
  postings: Pick<ReferralPosting, 'id' | 'title' | 'department' | 'reward_amount'>[]
  value: string
  onChange: (postingId: string) => void
  /** true = 「すべての求人」オプションを先頭に追加（フィルター用途） */
  includeAll?: boolean
  /** フォーム用 name 属性 */
  name?: string
  id?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

/** リファラル求人セレクター（フィルター・フォーム共用） */
export function ReferralPostingSelector({
  postings,
  value,
  onChange,
  includeAll = false,
  name,
  id,
  disabled = false,
  required = false,
  className,
}: ReferralPostingSelectorProps) {
  return (
    <div className="relative">
      <Briefcase className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#57606a]" />
      <select
        id={id}
        name={name}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={`border border-[#e2e6ec] rounded-lg pl-8 pr-3 py-2 w-full text-sm bg-white
          focus:outline-none focus:ring-2 focus:ring-primary/30
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className ?? ''}`}
      >
        {includeAll ? (
          <option value="">すべての求人</option>
        ) : (
          <option value="" disabled>
            求人を選択してください
          </option>
        )}
        {postings.map(posting => (
          <option key={posting.id} value={posting.id}>
            {posting.title}
            {posting.department ? ` — ${posting.department}` : ''}
            {posting.reward_amount > 0
              ? ` (¥${posting.reward_amount.toLocaleString('ja-JP')})`
              : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
