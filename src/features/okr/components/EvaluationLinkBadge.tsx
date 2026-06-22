'use client'

import { useState } from 'react'
import { linkToEvaluationSheet } from '../actions'

interface EvaluationSheet {
  id: string
  label: string
}

interface Props {
  objectiveId: string
  evaluationSheetId: string | null
  availableSheets?: EvaluationSheet[]
}

export function EvaluationLinkBadge({
  objectiveId,
  evaluationSheetId,
  availableSheets = [],
}: Props) {
  const [editing, setEditing] = useState(false)
  const [selectedId, setSelectedId] = useState(evaluationSheetId ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setLoading(true)
    setError(null)
    const result = await linkToEvaluationSheet(objectiveId, selectedId || null)
    setLoading(false)
    if (result.success === false) {
      setError(result.error ?? '保存に失敗しました')
      return
    }

    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        {evaluationSheetId ? (
          <span className="inline-flex items-center gap-1 text-xs bg-[#f6f8fa] text-[#FD7601] border border-[#e2e6ec] px-3 py-1 rounded-full">
            評価シート連動済み
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-400 border border-gray-200 px-3 py-1 rounded-full">
            評価シート未連動
          </span>
        )}
        {availableSheets.length > 0 && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            変更
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedId}
        onChange={e => setSelectedId(e.target.value)}
        className="text-sm rounded-lg border border-gray-200 px-2 py-1 focus:border-[#FD7601] focus:outline-none"
      >
        <option value="">連動しない</option>
        {availableSheets.map(s => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleSave}
        disabled={loading}
        className="text-xs bg-primary text-white px-3 py-1 rounded-lg hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? '保存中...' : '保存'}
      </button>
      <button
        onClick={() => {
          setEditing(false)
          setSelectedId(evaluationSheetId ?? '')
        }}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        キャンセル
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
