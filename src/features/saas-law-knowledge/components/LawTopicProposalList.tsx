'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'
import {
  analyzeSeoKeywordsForTopicProposals,
  approveHrLawTopicProposal,
  rejectHrLawTopicProposal,
} from '../actions'
import type { HrLawTopicProposal } from '../types'

type Props = {
  proposals: HrLawTopicProposal[]
}

const SOURCE_LABEL: Record<HrLawTopicProposal['source'], string> = {
  chat: 'チャット需要',
  mhlw_discover: '厚労省新着',
  seo: 'SEOキー分析',
}

export function LawTopicProposalList({ proposals }: Props) {
  const [isPending, startTransition] = useTransition()
  const [analyzing, setAnalyzing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const pending = proposals.filter(p => p.status === 'pending')
  const others = proposals.filter(p => p.status !== 'pending')

  function handleApprove(p: HrLawTopicProposal) {
    setMessage(null)
    startTransition(async () => {
      const result = await approveHrLawTopicProposal(p.id)
      setMessage(result.ok ? `承認: ${p.topic}` : `失敗 — ${result.error}`)
    })
  }

  function handleReject(p: HrLawTopicProposal) {
    setMessage(null)
    startTransition(async () => {
      const result = await rejectHrLawTopicProposal(p.id)
      setMessage(result.ok ? `却下: ${p.topic}` : `失敗 — ${result.error}`)
    })
  }

  async function handleAnalyzeSeo() {
    setMessage(null)
    setAnalyzing(true)
    try {
      const result = await analyzeSeoKeywordsForTopicProposals()
      if (result.ok === false) {
        setMessage(`失敗 — ${result.error}`)
      } else {
        setMessage(
          `SEO TOP${result.topCount} を取得 / 候補追加: ${result.added}件 / スキップ: ${result.skipped}件`
        )
      }
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="space-y-3">
      {message && (
        <p className="text-xs rounded-lg border border-[#e2e6ec] bg-[#f6f8fa] px-3 py-2 text-[#24292f]">
          {message}
        </p>
      )}
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-[#57606a] flex-1 min-w-0">
          チャット需要・厚労省新着から自動提案されます。SEOキー分析でも候補を追加できます。承認すると監視トピックに追加されます。
        </p>
        <button
          type="button"
          disabled={analyzing}
          onClick={handleAnalyzeSeo}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#FD7601] text-white hover:opacity-90 disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              分析中…
            </>
          ) : (
            'SEOキー分析'
          )}
        </button>
      </div>

      {pending.length === 0 ? (
        <p className="text-xs text-[#57606a] rounded-lg border border-[#e2e6ec] bg-white px-4 py-6 text-center">
          承認待ちの候補はありません
        </p>
      ) : (
        <ul className="divide-y divide-[#e2e6ec] rounded-lg border border-[#e2e6ec] bg-white">
          {pending.map(p => (
            <li key={p.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#24292f]">{p.topic}</p>
                <p className="text-xs text-[#57606a] mt-0.5">{p.search_query}</p>
                <p className="text-xs text-[#57606a] mt-0.5">
                  {SOURCE_LABEL[p.source]} · score {p.score} ·{' '}
                  {format(new Date(p.created_at), 'M/d (E) HH:mm', { locale: ja })}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleApprove(p)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#FD7601] text-white hover:opacity-90 disabled:opacity-50"
                >
                  承認
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleReject(p)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#e2e6ec] text-[#57606a] hover:text-[#cf222e] disabled:opacity-50"
                >
                  却下
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {others.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-semibold text-[#57606a] mb-2">最近の処理済み</p>
          <ul className="divide-y divide-[#e2e6ec] rounded-lg border border-[#e2e6ec] bg-white">
            {others.slice(0, 20).map(p => (
              <li key={p.id} className="px-4 py-2.5 text-xs text-[#57606a]">
                <span className="font-medium text-[#24292f]">{p.topic}</span>
                {' · '}
                {p.status === 'approved' ? '承認済' : '却下'}
                {' · '}
                {SOURCE_LABEL[p.source]}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
