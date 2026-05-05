'use client'

import React, { useState, useTransition } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  generateAIProposals,
  fetchImprovementPlans,
} from '@/features/adm/ai-workplace-improvement/actions'
import type { AIProposal } from '@/features/adm/ai-workplace-improvement/actions'
import type { ImprovementPlan } from '@/features/adm/ai-workplace-improvement/queries'
import AIProposalCards from './AIProposalCards'
import FollowUpStatus from './FollowUpStatus'
import OrgLayerAnalysis from './OrgLayerAnalysis'
import { AIWorkplaceImprovementHelpModalTrigger } from './AIWorkplaceImprovementHelpModal'

interface AIWorkplaceImprovementClientProps {
  tenantId: string
  initialPlans: ImprovementPlan[]
  availableLayers: number[]
}

/**
 * AI職場改善提案 — クライアントコンテナ
 *
 * 層選択 → 集計表示 → 部署選択 → AI提案生成 → 登録 → フォローアップ入力
 */
export default function AIWorkplaceImprovementClient({
  tenantId,
  initialPlans,
  availableLayers,
}: AIWorkplaceImprovementClientProps) {
  const [proposals, setProposals] = useState<AIProposal[] | null>(null)
  const [plans, setPlans] = useState<ImprovementPlan[]>(initialPlans)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [selectedLayer, setSelectedLayer] = useState<number | null>(null)
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
  const [selectedDivisionName, setSelectedDivisionName] = useState<string>('')

  const handleDivisionSelect = (divisionId: string, divisionName: string) => {
    setSelectedDivisionId(divisionId || null)
    setSelectedDivisionName(divisionName)
    setProposals(null)
    setError(null)
  }

  const handleGenerate = () => {
    setError(null)
    setProposals(null)
    startTransition(async () => {
      const result = await generateAIProposals({
        layer: selectedLayer,
        divisionId: selectedDivisionId,
      })
      if (result.success && result.proposals) {
        setProposals(result.proposals)
      } else {
        setError(result.error || '生成に失敗しました。')
      }
    })
  }

  const handleRegistered = () => {
    startTransition(async () => {
      const result = await fetchImprovementPlans()
      if (result.success && result.plans) {
        setPlans(result.plans)
      }
    })
  }

  const showGenerateSection =
    selectedDivisionName !== '' || selectedLayer == null || availableLayers.length === 0

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* ヘッダー */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">AI職場改善提案エージェント</h1>
          <p className="text-slate-600 mt-1">
            第8章準拠｜集団分析結果をAIが読み、具体的な職場改善提案を生成
          </p>
        </div>
        <div className="shrink-0">
          <AIWorkplaceImprovementHelpModalTrigger />
        </div>
      </div>

      {/* Step 1 & 2: 組織レイヤー選択 & ストレスチェック集計結果 */}
      <OrgLayerAnalysis
        availableLayers={availableLayers}
        selectedLayer={selectedLayer}
        onLayerChange={layer => {
          setSelectedLayer(layer)
          setSelectedDivisionId(null)
          setSelectedDivisionName('')
          setProposals(null)
        }}
        selectedDivisionId={selectedDivisionId}
        onDivisionSelect={handleDivisionSelect}
      />

      {/* Step 3: AI提案を生成 */}
      {showGenerateSection && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
              3
            </span>
            <h2 className="text-lg font-semibold text-slate-800">AI提案を生成</h2>
          </div>
          <div className="flex flex-col items-center gap-4 py-8 px-6 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-100">
            {selectedDivisionName && (
              <p className="text-slate-700 text-sm">
                対象部署：
                <span className="text-blue-700 font-bold ml-1">{selectedDivisionName}</span>
              </p>
            )}
            <p className="text-slate-600 text-center max-w-xl text-sm">
              {selectedDivisionName
                ? `「${selectedDivisionName}」のストレスチェック結果をもとに、AIが職場改善提案を3件生成します。`
                : '現在のストレスチェック集団分析結果をもとに、AIが職場改善提案を3件生成します。'}
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={handleGenerate}
              disabled={isPending}
              className="min-w-[440px] sm:min-w-[480px] h-14 px-10 inline-flex items-center justify-center gap-2 text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-6 h-6 shrink-0 animate-spin" />
                  AI提案を生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6 shrink-0" />
                  {selectedDivisionName
                    ? `「${selectedDivisionName}」のAI提案を生成する`
                    : '現在の集団分析結果からAI提案を生成する'}
                </>
              )}
            </Button>
            {error && (
              <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>
            )}
          </div>
        </section>
      )}

      {/* Step 4: AI提案カード & 登録 */}
      {proposals && proposals.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
              4
            </span>
            <h2 className="text-xl font-semibold text-slate-800">
              生成された提案（{proposals.length}件）
            </h2>
          </div>
          <AIProposalCards proposals={proposals} onRegistered={handleRegistered} />
        </section>
      )}

      {/* Step 5: 登録済み改善計画一覧 & フォローアップ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
            5
          </span>
          <h2 className="text-xl font-semibold text-slate-800">改善計画 & フォローアップ</h2>
        </div>
        <FollowUpStatus plans={plans} onRefresh={handleRegistered} />
      </section>
    </div>
  )
}
