'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { X } from 'lucide-react'
import { createStressCheckPeriod, updateStressCheckPeriod } from '../actions'
import { DivisionMultiSelect } from './DivisionMultiSelect'
import type {
  StressCheckPeriod,
  StressCheckPeriodWithDivisions,
  QuestionnaireType,
} from '@/features/stress-check/types'
import type { Division } from '@/features/organization/types'

interface PeriodFormDialogProps {
  open: boolean
  onClose: () => void
  period?: StressCheckPeriodWithDivisions | StressCheckPeriod | null
  tenantId: string
  allDivisions?: Division[]
  divisionEstablishmentId?: string | null
}

export function PeriodFormDialog({
  open,
  onClose,
  period,
  tenantId,
  allDivisions = [],
}: PeriodFormDialogProps) {
  const isEdit = !!period
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [workplaceName, setWorkplaceName] = useState('')
  const [workplaceAddress, setWorkplaceAddress] = useState('')
  const [laborOfficeName, setLaborOfficeName] = useState('')
  const [qType, setQType] = useState<QuestionnaireType>('57')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [fiscalYear, setFiscalYear] = useState<number>(new Date().getFullYear())
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setTitle(period?.title || '')
      setComment(period?.comment || '')
      setWorkplaceName(period?.workplace_name || '')
      setWorkplaceAddress(period?.workplace_address || '')
      setLaborOfficeName(period?.labor_office_name || '')
      setQType(period?.questionnaire_type || '57')
      setStartDate((period?.start_date || '').split('T')[0] || '')
      setEndDate((period?.end_date || '').split('T')[0] || '')
      setFiscalYear(period?.fiscal_year || new Date().getFullYear())
      setSelectedDivisionIds(
        ('divisionIds' in (period ?? {})
          ? (period as StressCheckPeriodWithDivisions).divisionIds
          : null) || []
      )
    }
  }, [open, period])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (startDate && endDate && endDate < startDate) {
      alert('終了日は開始日以降の日付を入力してください。')
      return
    }
    const startYear = startDate ? Number(startDate.split('-')[0]) : 0
    const endYear = endDate ? Number(endDate.split('-')[0]) : 0
    if (startYear < 2000 || startYear > 2099 || endYear < 2000 || endYear > 2099) {
      alert('日付の年が正しくありません。西暦（例：2026年）で入力してください。')
      return
    }
    startTransition(async () => {
      const base = {
        title,
        comment: comment.trim() || null,
        workplace_name: workplaceName.trim() || null,
        workplace_address: workplaceAddress.trim() || null,
        labor_office_name: laborOfficeName.trim() || null,
        questionnaire_type: qType,
        start_date: startDate,
        end_date: endDate,
        fiscal_year: fiscalYear,
      }

      if (isEdit && period) {
        const res = await updateStressCheckPeriod(period.id, {
          ...base,
          divisionIds: selectedDivisionIds,
        })
        if (!res.success) {
          alert(res.error ?? '更新に失敗しました')
          return
        }
      } else {
        const res = await createStressCheckPeriod({
          ...base,
          tenant_id: tenantId,
          divisionIds: selectedDivisionIds,
        })
        if (!res.success) {
          alert(res.error ?? '登録に失敗しました')
          return
        }
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900">
            {isEdit ? '実施グループを編集' : '実施グループを追加'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="例：2026年度 ストレスチェック（営業本部）"
            />
          </div>

          {/* 対象部署 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              対象部署 <span className="text-red-500">*</span>
            </label>
            <DivisionMultiSelect
              allDivisions={allDivisions}
              selectedIds={selectedDivisionIds}
              onChange={setSelectedDivisionIds}
            />
            {selectedDivisionIds.length === 0 && (
              <p className="text-xs text-red-500 mt-1">対象部署を1つ以上選択してください</p>
            )}
          </div>

          {/* 年度・質問数 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">対象年度</label>
              <input
                type="number"
                value={fiscalYear}
                onChange={e => setFiscalYear(Number(e.target.value))}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">質問数</label>
              <select
                value={qType}
                onChange={e => setQType(e.target.value as QuestionnaireType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="57">57問</option>
                <option value="23">23問</option>
              </select>
            </div>
          </div>

          {/* 開始日・終了日 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                開始日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                min="2000-01-01"
                max="2099-12-31"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                終了日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min="2000-01-01"
                max="2099-12-31"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 官庁報告用：事業場情報 */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              官庁報告用（任意）
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">事業場名</label>
              <input
                type="text"
                value={workplaceName}
                onChange={e => setWorkplaceName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="例：東京本社"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">所在地</label>
              <input
                type="text"
                value={workplaceAddress}
                onChange={e => setWorkplaceAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="例：東京都千代田区〇〇1-2-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                管轄労働基準監督署名
              </label>
              <input
                type="text"
                value={laborOfficeName}
                onChange={e => setLaborOfficeName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="例：千代田労働基準監督署"
              />
            </div>
          </div>

          {/* コメント */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">コメント</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="備考・説明（任意）"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={
                isPending ||
                !title.trim() ||
                !startDate ||
                !endDate ||
                selectedDivisionIds.length === 0
              }
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
