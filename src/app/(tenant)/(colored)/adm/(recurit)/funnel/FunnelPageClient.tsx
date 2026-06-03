'use client'

import { useState } from 'react'
import { FunnelChart } from '@/features/job-postings/components/FunnelChart'
import { StaleAlert } from '@/features/job-postings/components/StaleAlert'
import { AssigneeBoard } from '@/features/job-postings/components/AssigneeBoard'
import { WithdrawalTrend } from '@/features/job-postings/components/WithdrawalTrend'
import { CandidateTable } from '@/features/job-postings/components/CandidateTable'
import type { FunnelDashboardData, CandidateStage } from '@/features/job-postings/types'

type Props = FunnelDashboardData

export function FunnelPageClient({
  funnelCounts,
  staleCandidates,
  assigneeCounts,
  withdrawalTrend,
  staleThresholdDays,
}: Props) {
  // クリックされたステージ（null = ドリルダウン非表示）
  const [selectedStage, setSelectedStage] = useState<CandidateStage | null>(null)

  function handleStageClick(stage: CandidateStage) {
    // 同じステージを再クリックで閉じる
    setSelectedStage(prev => (prev === stage ? null : stage))
  }

  return (
    <>
      {/* ファネル図 */}
      <FunnelChart funnelCounts={funnelCounts} onStageClick={handleStageClick} />

      {/* ドリルダウン：ステージ選択中のみ表示 */}
      {selectedStage && (
        <CandidateTable stage={selectedStage} onClose={() => setSelectedStage(null)} />
      )}

      {/* 中段：放置アラート ＋ 担当者ボード（2カラム） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StaleAlert candidates={staleCandidates} thresholdDays={staleThresholdDays} />
        <AssigneeBoard assigneeCounts={assigneeCounts} />
      </div>

      {/* 辞退率推移グラフ */}
      <WithdrawalTrend trend={withdrawalTrend} />
    </>
  )
}
