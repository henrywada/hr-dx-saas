'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { AIProposal } from '@/features/adm/ai-workplace-improvement/actions'
import ImprovementPlanForm from './ImprovementPlanForm'

interface AIProposalCardsProps {
  proposals: AIProposal[]
  onRegistered: () => void
}

/**
 * AI提案カード一覧
 *
 * 各カードに「即登録」ボタンと3ヶ月後フォロー設定
 */
export default function AIProposalCards({
  proposals,
  onRegistered,
}: AIProposalCardsProps) {
  const [selectedProposal, setSelectedProposal] = useState<AIProposal | null>(
    null
  )

  const priorityVariant = (p: string) => {
    if (p === '高') return 'orange'
    if (p === '中') return 'teal'
    return 'neutral'
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {proposals.map((proposal, idx) => (
          <Card
            key={idx}
            variant={
              proposal.priority === '高'
                ? 'accent-orange'
                : proposal.priority === '中'
                  ? 'accent-teal'
                  : 'default'
            }
            className="flex flex-col h-full"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="text-sm font-medium text-slate-500">
                {proposal.division_name}
              </span>
              <Badge variant={priorityVariant(proposal.priority)}>
                {proposal.priority}
              </Badge>
            </div>
            <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2">
              {proposal.ai_generated_title}
            </h3>
            <p className="text-sm text-slate-600 mb-4 line-clamp-3">
              {proposal.ai_reason}
            </p>
            <div className="space-y-1 mb-4">
              <p className="text-xs font-semibold text-slate-500">
                具体的なアクション
              </p>
              <ul className="list-disc list-inside text-sm text-slate-700 space-y-0.5">
                {proposal.proposed_actions.slice(0, 3).map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>
            {proposal.expected_effect && (
              <p className="text-sm text-slate-600 mb-4">
                <span className="font-medium text-slate-700">期待効果：</span>
                {proposal.expected_effect}
              </p>
            )}
            <div className="mt-auto pt-4">
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => setSelectedProposal(proposal)}
              >
                この提案を職場改善計画に即登録
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <ImprovementPlanForm
        open={!!selectedProposal}
        proposal={selectedProposal}
        onClose={() => setSelectedProposal(null)}
        onRegistered={() => {
          setSelectedProposal(null)
          onRegistered()
        }}
      />
    </>
  )
}
