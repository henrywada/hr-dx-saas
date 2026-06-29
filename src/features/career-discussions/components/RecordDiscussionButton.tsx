'use client'

import { useState } from 'react'
import { CareerDiscussionFormModal } from './CareerDiscussionFormModal'
import type {
  CareerDiscussionEmployeeOption,
  CareerDiscussionThemeTemplate,
  EvaluationPeriodOption,
} from '../types'

interface Props {
  employees: CareerDiscussionEmployeeOption[]
  templates: CareerDiscussionThemeTemplate[]
  evaluationPeriods: EvaluationPeriodOption[]
}

/** モーダル開閉状態を持つ「面談を記録」ボタン（上長・HR両方の画面で共通利用） */
export function RecordDiscussionButton({ employees, templates, evaluationPeriods }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#FD7601] transition-colors"
      >
        + 面談を記録
      </button>
      <CareerDiscussionFormModal
        open={open}
        onClose={() => setOpen(false)}
        employees={employees}
        templates={templates}
        evaluationPeriods={evaluationPeriods}
      />
    </>
  )
}
