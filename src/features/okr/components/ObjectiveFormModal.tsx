'use client'

import { useState } from 'react'
import { createObjective, updateObjective } from '../actions'
import type { ObjectiveWithDetails } from '../types'

interface Division {
  id: string
  name: string
}

interface Employee {
  id: string
  name: string
}

interface Props {
  open: boolean
  onClose: () => void
  fiscalYear: number
  divisions: Division[]
  employees?: Employee[]
  editTarget?: ObjectiveWithDetails | null
}

export function ObjectiveFormModal({
  open,
  onClose,
  fiscalYear,
  divisions,
  employees = [],
  editTarget,
}: Props) {
  const [ownerType, setOwnerType] = useState<'company' | 'division' | 'employee'>(
    editTarget?.owner_type ?? 'company'
  )
  const [ownerDivisionId, setOwnerDivisionId] = useState(editTarget?.owner_division_id ?? '')
  const [ownerEmployeeId, setOwnerEmployeeId] = useState(editTarget?.owner_employee_id ?? '')
  const [halfYear, setHalfYear] = useState<'first' | 'second'>(editTarget?.half_year ?? 'first')
  const [title, setTitle] = useState(editTarget?.title ?? '')
  const [description, setDescription] = useState(editTarget?.description ?? '')
  const [status, setStatus] = useState<'draft' | 'active'>(
    editTarget?.status === 'active' ? 'active' : 'draft'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const periodLabel = `${fiscalYear}-${halfYear === 'first' ? 'H1' : 'H2'}`

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('目標タイトルは必須です')
      return
    }
    setLoading(true)
    setError(null)

    const input = {
      owner_type: ownerType,
      owner_division_id: ownerType === 'division' ? ownerDivisionId || null : null,
      owner_employee_id: ownerType === 'employee' ? ownerEmployeeId || null : null,
      fiscal_year: fiscalYear,
      half_year: halfYear,
      period_label: periodLabel,
      title: title.trim(),
      description: description.trim() || null,
      status,
    }

    const result = editTarget
      ? await updateObjective(editTarget.id, input)
      : await createObjective(input)

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
            {editTarget ? '目標を編集' : '目標を追加'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* オーナー種別 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              目標レベル <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {(['company', 'division', 'employee'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOwnerType(t)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                    ownerType === t
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t === 'company' ? '会社' : t === 'division' ? '部門' : '個人'}
                </button>
              ))}
            </div>
          </div>

          {/* 部門選択 */}
          {ownerType === 'division' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">部門</label>
              <select
                value={ownerDivisionId}
                onChange={e => setOwnerDivisionId(e.target.value)}
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">選択してください</option>
                {divisions.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 従業員選択 */}
          {ownerType === 'employee' && employees.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">担当者</label>
              <select
                value={ownerEmployeeId}
                onChange={e => setOwnerEmployeeId(e.target.value)}
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">選択してください</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 期間 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">期間</label>
            <div className="flex gap-2">
              {(['first', 'second'] as const).map(h => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHalfYear(h)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                    halfYear === h
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {h === 'first' ? `${fiscalYear}年 上半期` : `${fiscalYear}年 下半期`}
                </button>
              ))}
            </div>
          </div>

          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              目標タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例: 売上高1億円の達成"
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
              required
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">説明（任意）</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="目標の背景や達成基準を記入"
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
            />
          </div>

          {/* ステータス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as 'draft' | 'active')}
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="draft">下書き</option>
              <option value="active">進行中</option>
            </select>
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
