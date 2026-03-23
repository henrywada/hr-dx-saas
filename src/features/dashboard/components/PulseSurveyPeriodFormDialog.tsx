'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { X } from 'lucide-react'
import type { PulseSurveyPeriodRow } from '../types'
import { createPulseSurveyPeriod, updatePulseSurveyPeriod } from '../actions'

interface PulseSurveyPeriodFormDialogProps {
  open: boolean
  onClose: () => void
  period?: PulseSurveyPeriodRow | null
}

export function PulseSurveyPeriodFormDialog({
  open,
  onClose,
  period,
}: PulseSurveyPeriodFormDialogProps) {
  const isEdit = !!period
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [surveyPeriod, setSurveyPeriod] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadlineDate, setDeadlineDate] = useState('')
  const [linkPath, setLinkPath] = useState('')
  const [sortOrder, setSortOrder] = useState(0)

  useEffect(() => {
    if (open) {
      setError(null)
      setSurveyPeriod(period?.survey_period || '')
      setTitle(period?.title || '')
      setDescription(period?.description || '')
      setDeadlineDate(period?.deadline_date || '')
      setLinkPath(period?.link_path || '/survey/answer')
      setSortOrder(period?.sort_order ?? 0)

      if (!period) {
        const now = new Date()
        const yyyy = now.getFullYear()
        const mm = (now.getMonth() + 1).toString().padStart(2, '0')
        setSurveyPeriod(`${yyyy}-${mm}`)
      }
    }
  }, [open, period])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!/^\d{4}-\d{2}$/.test(surveyPeriod)) {
      setError('期間は YYYY-MM 形式で入力してください（例: 2026-03）')
      return
    }
    if (!deadlineDate) {
      setError('回答期限を入力してください')
      return
    }

    startTransition(async () => {
      try {
        let result
        if (isEdit && period) {
          result = await updatePulseSurveyPeriod(period.id, {
            survey_period: surveyPeriod,
            title,
            description: description || null,
            deadline_date: deadlineDate,
            link_path: linkPath || null,
            sort_order: sortOrder,
          })
        } else {
          result = await createPulseSurveyPeriod({
            survey_period: surveyPeriod,
            title,
            description: description || null,
            deadline_date: deadlineDate,
            link_path: linkPath || null,
            sort_order: sortOrder,
          })
        }

        if (result.success) {
          onClose()
        } else {
          setError(result.error || '保存に失敗しました。')
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '通信エラーが発生しました。')
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 sticky top-0">
          <h3 className="text-lg font-bold text-slate-900">
            {isEdit ? 'パルス調査期間を編集' : 'パルス調査期間を追加'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">期間 (YYYY-MM) *</label>
            <input
              type="text"
              value={surveyPeriod}
              onChange={e => setSurveyPeriod(e.target.value)}
              required
              pattern="\d{4}-\d{2}"
              placeholder="例: 2026-03"
              disabled={isEdit}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
            />
            {isEdit && (
              <p className="text-xs text-slate-500 mt-1">編集時は期間の変更はできません</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">タイトル *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="例: 今月の組織度アンケート（Echo）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">説明</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="毎月の組織コンディションを把握するための重要なアンケートです。回答時間は約3分です。"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">回答期限 *</label>
            <input
              type="date"
              value={deadlineDate}
              onChange={e => setDeadlineDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">回答画面へのリンク</label>
            <input
              type="text"
              value={linkPath}
              onChange={e => setLinkPath(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="/survey/answer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">表示順</label>
            <input
              type="number"
              value={sortOrder}
              onChange={e => setSortOrder(Number(e.target.value) || 0)}
              min={0}
              className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? '保存中...' : isEdit ? '更新' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
