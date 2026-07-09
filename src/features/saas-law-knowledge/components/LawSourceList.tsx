'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { triggerHrLawRefresh } from '../actions'
import type { HrLawSource } from '../types'

type Props = {
  sources: HrLawSource[]
}

export function LawSourceList({ sources }: Props) {
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function handleRun(source: HrLawSource) {
    setPendingId(source.id)
    setMessage(null)
    startTransition(async () => {
      const result = await triggerHrLawRefresh(source.id)
      if (result.ok === true) {
        setMessage(
          `${source.topic}: ${result.documentsCreated}件登録・${result.documentsSkipped}件スキップ`
        )
      } else {
        setMessage(`${source.topic}: 失敗 — ${result.error}`)
      }
      setPendingId(null)
    })
  }

  return (
    <div className="space-y-3">
      {message && (
        <p className="text-xs rounded-lg border border-[#e2e6ec] bg-[#f6f8fa] px-3 py-2 text-[#24292f]">
          {message}
        </p>
      )}
      <ul className="divide-y divide-[#e2e6ec] rounded-lg border border-[#e2e6ec] bg-white">
        {sources.map(source => (
          <li key={source.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#24292f]">{source.topic}</p>
              <p className="text-xs text-[#57606a] mt-0.5">
                最終実行:{' '}
                {source.last_run_at
                  ? format(new Date(source.last_run_at), 'M/d (E) HH:mm', { locale: ja })
                  : '未実行'}
              </p>
            </div>
            <button
              type="button"
              disabled={isPending && pendingId === source.id}
              onClick={() => handleRun(source)}
              className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-[#e2e6ec] text-[#24292f] hover:border-[#FD7601] hover:text-[#FD7601] disabled:opacity-50"
            >
              {isPending && pendingId === source.id ? '実行中…' : '手動実行'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
