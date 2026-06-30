'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { summarizeOneOnOneSession } from '../actions'

interface Props {
  sessionId: string
  notes: string | null
  initialSummary: string | null
}

export function SessionAiSummary({ sessionId, notes, initialSummary }: Props) {
  const router = useRouter()
  const [summary, setSummary] = useState(initialSummary)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!notes?.trim()) return null

  function handleGenerate() {
    setError(null)
    startTransition(async () => {
      const result = await summarizeOneOnOneSession(sessionId)
      if (result.success && result.summary) {
        setSummary(result.summary)
        router.refresh()
      } else {
        setError(result.error ?? '要約に失敗しました')
      }
    })
  }

  return (
    <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-violet-800 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          AI 要約
        </p>
        {!summary && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="text-[10px] px-2 py-1 rounded-md bg-violet-600 text-white disabled:opacity-50"
          >
            {isPending ? '生成中…' : '要約を生成'}
          </button>
        )}
      </div>
      {error && <p className="text-[10px] text-red-600">{error}</p>}
      {summary && (
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{summary}</p>
      )}
    </div>
  )
}
