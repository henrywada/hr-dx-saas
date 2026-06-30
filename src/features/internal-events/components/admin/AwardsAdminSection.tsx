'use client'

import { useState } from 'react'
import type { MvpCandidate } from '@/features/recognition/types'
import type { Award } from '@/features/internal-events/types'
import { MvpCandidatePanel } from '@/features/recognition/components/admin/MvpCandidatePanel'
import { AwardFormDialog } from '@/features/internal-events/components/admin/AwardFormDialog'
import { AwardBoard } from '@/features/internal-events/components/AwardBoard'

interface EmployeeOption {
  id: string
  name: string
}

interface Props {
  employees: EmployeeOption[]
  periodLabel: string
  candidates: MvpCandidate[]
  awards: Award[]
}

/** E-S2: MVP 候補サジェスト + 表彰登録フォーム連携セクション */
export function AwardsAdminSection({ employees, periodLabel, candidates, awards }: Props) {
  const [preset, setPreset] = useState<{
    recipientEmployeeId: string
    awardType: string
    periodLabel: string
    comment: string
  } | null>(null)

  const handleSelectCandidate = (candidate: MvpCandidate) => {
    setPreset({
      recipientEmployeeId: candidate.employee_id,
      awardType: '月間MVP',
      periodLabel,
      comment: candidate.suggest_comment,
    })
  }

  return (
    <section className="space-y-3">
      <MvpCandidatePanel
        periodLabel={periodLabel}
        candidates={candidates}
        onSelectCandidate={handleSelectCandidate}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-500">表彰</h2>
        <AwardFormDialog employees={employees} preset={preset} onPresetClear={() => setPreset(null)} />
      </div>
      <AwardBoard awards={awards} />
    </section>
  )
}
