'use client'

import { useTransition } from 'react'
import { CheckCheck } from 'lucide-react'
import { markAllFeedItemsRead } from '../feed/actions'

type Props = {
  dedupeKeys: string[]
}

/** 既読可能・未読の system_notice をまとめて既読にするボタン。対象が無ければ何も出さない */
export function MarkAllReadButton({ dedupeKeys }: Props) {
  const [isPending, startTransition] = useTransition()

  if (dedupeKeys.length === 0) return null

  const handleClick = () => {
    startTransition(async () => {
      await markAllFeedItemsRead(dedupeKeys)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:pointer-events-none"
    >
      <CheckCheck className="w-3.5 h-3.5" />
      {isPending ? '処理中...' : 'すべて既読にする'}
    </button>
  )
}
