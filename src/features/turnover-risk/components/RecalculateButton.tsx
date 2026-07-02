'use client'

import { useState } from 'react'
import { recalculateTurnoverRiskScores } from '../actions'

export function RecalculateButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleClick() {
    setIsLoading(true)
    setMessage(null)
    const result = await recalculateTurnoverRiskScores()
    setIsLoading(false)
    if (result.success) {
      const notifiedText =
        result.notifiedCount > 0 ? `（うち ${result.notifiedCount} 名を新規通知）` : ''
      setMessage(`${result.updatedCount} 名のスコアを更新しました${notifiedText}`)
    } else {
      setMessage(`エラー: ${result.error}`)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-sm text-gray-600">{message}</span>}
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {isLoading ? '計算中...' : 'スコア再計算'}
      </button>
    </div>
  )
}
