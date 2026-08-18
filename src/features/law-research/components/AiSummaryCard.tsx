'use client'

import { useState, useTransition } from 'react'

import { summarizeResearchDocument } from '../actions'
import type { ResearchDocument } from '../types'

// prop 名は doc。DOM グローバルの document をシャドーイングしないため
export function AiSummaryCard({ doc }: { doc: ResearchDocument }) {
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // 自動実行しない。ユーザーが明示的に押したときだけ要約する（コスト制御と誤用防止）
  const handleSummarize = () => {
    startTransition(async () => {
      setError(null)
      const result = await summarizeResearchDocument(doc)
      if (result.ok === true) setSummary(result.data)
      else setError(result.error.message)
    })
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-slate-900">AI要約</h3>
        <button
          type="button"
          onClick={handleSummarize}
          disabled={pending}
          className="px-3 py-1.5 text-xs rounded-lg border border-[#FD7601] text-[#FD7601] font-medium hover:bg-[#FD7601]/5 disabled:opacity-50"
        >
          {pending ? '要約中…' : summary ? '再要約' : 'この原文を要約する'}
        </button>
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}

      {summary && (
        <>
          <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
            {summary}
          </div>
          <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">
            この要約は上記の原文のみを根拠に生成されています。正本は原文です。 出典:{' '}
            <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {doc.sourceUrl}
            </a>
            （取得: {doc.fetchedAt.slice(0, 10)}）
          </p>
        </>
      )}

      {!summary && !error && (
        <p className="text-xs text-slate-500">
          ボタンを押すと、表示中の原文だけを入力としてAIが要約します。検索や推測は行いません。
        </p>
      )}
    </div>
  )
}
