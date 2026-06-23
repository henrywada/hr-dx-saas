'use client'

import { useState, useTransition } from 'react'
import { PlayCircle } from 'lucide-react'
import { runRuleNow } from '../actions'

interface TestRunButtonProps {
  ruleId: string
}

export function TestRunButton({ ruleId }: TestRunButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleClick = () => {
    setMessage(null)
    startTransition(async () => {
      const response = await runRuleNow(ruleId)

      if (!response.success || !response.result) {
        setMessage({ type: 'error', text: response.error || 'テスト実行に失敗しました。' })
        return
      }

      const { result } = response
      if (result.status === 'success') {
        setMessage({
          type: 'success',
          text: `配信完了：記事 ${result.articleCount} 件を送信しました。`,
        })
      } else if (result.status === 'partial') {
        setMessage({ type: 'error', text: result.errorMessage || '検索結果が0件でした。' })
      } else {
        setMessage({ type: 'error', text: result.errorMessage || '実行に失敗しました。' })
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#24292f] bg-white border border-[#e2e6ec] rounded-lg hover:bg-[#f6f8fa] disabled:opacity-50 transition-colors"
      >
        <PlayCircle className="w-3.5 h-3.5" />
        {isPending ? '実行中...' : 'テスト実行'}
      </button>
      {message && (
        <p className={`text-xs ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
