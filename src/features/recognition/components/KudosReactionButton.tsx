'use client'

import { useState, useTransition } from 'react'
import { toggleReaction } from '../actions'
import { REACTION_EMOJI } from '../labels'

interface Props {
  kudosId: string
  initialCount: number
  initialHasReacted: boolean
}

export function KudosReactionButton({ kudosId, initialCount, initialHasReacted }: Props) {
  const [count, setCount] = useState(initialCount)
  const [hasReacted, setHasReacted] = useState(initialHasReacted)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      try {
        await toggleReaction({ kudosId })
        setHasReacted(prev => !prev)
        setCount(prev => (hasReacted ? prev - 1 : prev + 1))
      } catch {
        // 反映に失敗した場合は静かに無視（次回操作時に整合する）
      }
    })
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
        hasReacted
          ? 'bg-amber-100 text-amber-800'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
      }`}
    >
      <span>{REACTION_EMOJI}</span>
      <span>{count}</span>
    </button>
  )
}
