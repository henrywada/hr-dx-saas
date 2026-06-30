'use client'

import { useState } from 'react'
import { CareerDiscussionFormModal } from './CareerDiscussionFormModal'
import type {
  CareerDiscussionEmployeeOption,
  CareerDiscussionThemeTemplate,
  EvaluationPeriodOption,
} from '../types'
import type { OneOnOneSessionSummary } from '@/features/one-on-one/types'

interface Props {
  employees: CareerDiscussionEmployeeOption[]
  templates: CareerDiscussionThemeTemplate[]
  evaluationPeriods: EvaluationPeriodOption[]
  oneOnOneByEmployee: Record<string, OneOnOneSessionSummary[]>
}

export function RecordDiscussionButton({
  employees,
  templates,
  evaluationPeriods,
  oneOnOneByEmployee,
}: Props) {
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
        oneOnOneByEmployee={oneOnOneByEmployee}
      />
    </>
  )
}
