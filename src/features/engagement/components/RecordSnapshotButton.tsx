'use client'

import { useState } from 'react'
import { recordEngagementSnapshot } from '../actions'

interface Props {
  layerFilter: number | 'all'
}

export function RecordSnapshotButton({ layerFilter }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleClick() {
    setIsLoading(true)
    setMessage(null)
    const result = await recordEngagementSnapshot(layerFilter)
    setIsLoading(false)
    if (result.success) {
      const scopeLabel = layerFilter === 'all' ? '全階層' : `階層${layerFilter}`
      const notifiedText =
        result.notifiedCount > 0 ? `（うち ${result.notifiedCount} 部署を新規通知）` : ''
      setMessage(
        `${scopeLabel}の ${result.snapshotCount} 部署分の状態を記録しました${notifiedText}`
      )
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
        {isLoading ? '記録中...' : '状態を記録'}
      </button>
    </div>
  )
}
