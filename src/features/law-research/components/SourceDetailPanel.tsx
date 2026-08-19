'use client'

import { AiSummaryCard } from './AiSummaryCard'
import type { ResearchDocument, ResearchError, ResearchHit } from '../types'

// prop 名は doc。DOM グローバルの document をシャドーイングしないため
export function SourceDetailPanel({
  hit,
  doc,
  loading,
  error,
}: {
  hit: ResearchHit | null
  doc: ResearchDocument | null
  loading: boolean
  error: ResearchError | null
}) {
  if (!hit) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
        一覧からタイトルを選ぶと、ここに原文の全文を表示します。
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 space-y-2">
        <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-5/6 bg-slate-100 rounded animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5">
        <p className="text-xs text-red-700">{error.message}</p>
        <a
          href={error.sourceUrl ?? hit.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-red-700 underline mt-2 inline-block"
        >
          出典サイトで直接確認する
        </a>
      </div>
    )
  }

  if (!doc) return null

  return (
    <div className="space-y-3">
      <article className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
        <header className="space-y-1 border-b border-slate-100 pb-3">
          <h2 className="text-sm font-semibold text-slate-900">{doc.title}</h2>
          <p className="text-[11px] text-slate-500">
            出典:{' '}
            <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {doc.sourceUrl}
            </a>
            {' ／ '}取得日時: {doc.fetchedAt.slice(0, 19).replace('T', ' ')}
          </p>
        </header>

        <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
          {doc.body}
        </div>
      </article>

      <AiSummaryCard doc={doc} />
    </div>
  )
}
