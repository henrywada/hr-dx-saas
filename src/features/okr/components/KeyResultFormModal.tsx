'use client'

import { useState } from 'react'
import { createKeyResult, updateKeyResult } from '../actions'
import type { KeyResult } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  objectiveId: string
  editTarget?: KeyResult | null
}

export function KeyResultFormModal({ open, onClose, objectiveId, editTarget }: Props) {
  const [title, setTitle] = useState(editTarget?.title ?? '')
  const [description, setDescription] = useState(editTarget?.description ?? '')
  const [krType, setKrType] = useState<'quantitative' | 'qualitative'>(
    editTarget?.kr_type ?? 'quantitative'
  )
  const [targetValue, setTargetValue] = useState(
    editTarget?.target_value != null ? String(editTarget.target_value) : ''
  )
  const [startValue, setStartValue] = useState(
    editTarget?.start_value != null ? String(editTarget.start_value) : '0'
  )
  const [unit, setUnit] = useState(editTarget?.unit ?? '')
  const [weight, setWeight] = useState(
    editTarget?.weight != null ? String(editTarget.weight) : '100'
  )
  const [dueDate, setDueDate] = useState(editTarget?.due_date ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('KRタイトルは必須です')
      return
    }
    setLoading(true)
    setError(null)

    const input = {
      objective_id: objectiveId,
      title: title.trim(),
      description: description.trim() || null,
      kr_type: krType,
      target_value: krType === 'quantitative' && targetValue ? Number(targetValue) : null,
      start_value: Number(startValue) || 0,
      unit: unit.trim() || null,
      weight: Number(weight) || 100,
      due_date: dueDate || null,
    }

    const result = editTarget
      ? await updateKeyResult(editTarget.id, input)
      : await createKeyResult(input)

    setLoading(false)
    if (result.success === false) {
      setError(result.error ?? '保存に失敗しました')
      return
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editTarget ? 'Key Result を編集' : 'Key Result を追加'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* KR種別 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">KR種別</label>
            <div className="flex gap-2">
              {(['quantitative', 'qualitative'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setKrType(t)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                    krType === t
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t === 'quantitative' ? '定量' : '定性'}
                </button>
              ))}
            </div>
          </div>

          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              KRタイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={
                krType === 'quantitative' ? '例: 新規契約件数 50件' : '例: 全顧客にヒアリング完了'
              }
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
              required
            />
          </div>

          {/* 定量KRの目標値 */}
          {krType === 'quantitative' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">開始値</label>
                <input
                  type="number"
                  value={startValue}
                  onChange={e => setStartValue(e.target.value)}
                  className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目標値</label>
                <input
                  type="number"
                  value={targetValue}
                  onChange={e => setTargetValue(e.target.value)}
                  placeholder="50"
                  className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">単位</label>
                <input
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="件"
                  className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>
          )}

          {/* 重み・期限 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">重み（%）</label>
              <input
                type="number"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                min={0}
                max={100}
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">期限（任意）</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">説明（任意）</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? '保存中...' : editTarget ? '更新する' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
