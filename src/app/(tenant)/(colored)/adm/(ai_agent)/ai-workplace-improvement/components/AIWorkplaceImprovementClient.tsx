'use client'

import React, { useState, useTransition } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { generateAIProposals } from '@/features/adm/ai-workplace-improvement/actions'
import type { AIProposal } from '@/features/adm/ai-workplace-improvement/actions'
import type { ImprovementPlan } from '@/features/adm/ai-workplace-improvement/queries'
import AIProposalCards from './AIProposalCards'
import FollowUpStatus from './FollowUpStatus'
import { AIWorkplaceImprovementHelpModalTrigger } from './AIWorkplaceImprovementHelpModal'

interface AIWorkplaceImprovementClientProps {
  tenantId: string
  initialPlans: ImprovementPlan[]
}

/**
 * AI職場改善提案 — クライアントコンテナ
 *
 * 生成ボタン → AI提案カード → 登録済み一覧・効果測定グラフ
 */
export default function AIWorkplaceImprovementClient({
  tenantId,
  initialPlans,
}: AIWorkplaceImprovementClientProps) {
  const [proposals, setProposals] = useState<AIProposal[] | null>(null)
  const [plans, setPlans] = useState<ImprovementPlan[]>(initialPlans)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleGenerate = () => {
    setError(null)
    setProposals(null)
    startTransition(async () => {
      const result = await generateAIProposals()
      if (result.success && result.proposals) {
        setProposals(result.proposals)
      } else {
        setError(result.error || '生成に失敗しました。')
      }
    })
  }

  const handleRegistered = () => {
    // 登録完了後に一覧を再取得するため、ページをリフレッシュ
    window.location.reload()
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* ヘッダー */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            AI職場改善提案エージェント
          </h1>
          <p className="text-slate-600 mt-1">
            第8章準拠｜集団分析結果をAIが読み、具体的な職場改善提案を生成
          </p>
        </div>
        <div className="shrink-0">
          <AIWorkplaceImprovementHelpModalTrigger />
        </div>
      </div>

      {/* 生成ボタン */}
      <div className="flex flex-col items-center gap-4 py-8 px-6 bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-100">
        <p className="text-slate-600 text-center max-w-xl">
          現在のストレスチェック集団分析結果をもとに、AIが職場改善提案を3件生成します。
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
              現在の集団分析結果からAI提案を生成する
            </>
          )}
        </Button>
        {error && (
          <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">
            {error}
          </p>
        )}
      </div>

      {/* AI提案カード */}
      {proposals && proposals.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            生成された提案（3件）
          </h2>
          <AIProposalCards
            proposals={proposals}
            onRegistered={handleRegistered}
          />
        </section>
      )}

      {/* 登録済み改善計画一覧 & 効果測定グラフ */}
      <FollowUpStatus plans={plans} onRefresh={handleRegistered} />
    </div>
  )
}
