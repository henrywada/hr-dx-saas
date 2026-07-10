'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { approveHrLawTopicProposal, rejectHrLawTopicProposal } from '../actions'
import type { HrLawTopicProposal } from '../types'

type Props = {
  proposals: HrLawTopicProposal[]
}

const SOURCE_LABEL: Record<HrLawTopicProposal['source'], string> = {
  chat: 'チャット需要',
  mhlw_discover: '厚労省新着',
}

export function LawTopicProposalList({ proposals }: Props) {
  const [isPending, startTransition] = useTransition()
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

  return (
    <div className="space-y-3">
      {message && (
        <p className="text-xs rounded-lg border border-[#e2e6ec] bg-[#f6f8fa] px-3 py-2 text-[#24292f]">
          {message}
        </p>
      )}
      <p className="text-xs text-[#57606a]">
        チャット需要・厚労省新着から自動提案されます。承認すると監視トピックに追加されます。
      </p>

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
