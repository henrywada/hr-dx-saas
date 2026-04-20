'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDateInJST, type PulseSurveyCadence } from '@/lib/datetime'
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react'
import type { PulseSurveyPeriodRow } from '../types'
import { deletePulseSurveyPeriod, updateTenantPulseSurveyCadence } from '../actions'
import { PulseSurveyPeriodFormDialog } from './PulseSurveyPeriodFormDialog'

interface PulseSurveyPeriodTableProps {
  periods: PulseSurveyPeriodRow[]
  initialCadence: PulseSurveyCadence
}

export function PulseSurveyPeriodTable({ periods, initialCadence }: PulseSurveyPeriodTableProps) {
  const router = useRouter()
  const [cadence, setCadence] = useState<PulseSurveyCadence>(initialCadence)
  const [cadenceError, setCadenceError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setCadence(initialCadence)
  }, [initialCadence])
  const [dialogState, setDialogState] = useState<{
    open: boolean
    period?: PulseSurveyPeriodRow
  }>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<PulseSurveyPeriodRow | null>(null)

  const handleDelete = (p: PulseSurveyPeriodRow) => setDeleteTarget(p)

  const confirmDelete = () => {
    if (!deleteTarget) return
    startTransition(async () => {
      await deletePulseSurveyPeriod(deleteTarget.id)
      setDeleteTarget(null)
    })
  }

  const formatDate = (d: string) => formatDateInJST(d)

  function handleCadenceChange(next: PulseSurveyCadence) {
    if (next === cadence) return
    setCadenceError(null)
    const prev = cadence
    setCadence(next)
    startTransition(async () => {
      const result = await updateTenantPulseSurveyCadence(next)
      if (!result.success) {
        setCadence(prev)
        setCadenceError(result.error ?? '実施間隔の更新に失敗しました')
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">パルス調査期間管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            パルス調査の期間・期限を設定し、トップ画面の重要タスクに表示されます（実施間隔に応じて期間キーの形式が変わります）
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogState({ open: true })}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          期間を追加
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="text-sm font-semibold text-slate-800">実施間隔</div>
        <p className="text-xs text-slate-500">
          従業員トップの未回答判定・回答画面のデフォルト期間に使われます。週次にした場合は、期間行のキーを{' '}
          <span className="font-mono">YYYY-Www</span>（例: 2026-W16）で登録してください。
        </p>
        {cadenceError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {cadenceError}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="pulse_cadence"
              className="text-blue-600"
              checked={cadence === 'monthly'}
              disabled={isPending}
              onChange={() => handleCadenceChange('monthly')}
            />
            <span className="text-sm text-slate-700">月1回（期間キー: YYYY-MM）</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="pulse_cadence"
              className="text-blue-600"
              checked={cadence === 'weekly'}
              disabled={isPending}
              onChange={() => handleCadenceChange('weekly')}
            />
            <span className="text-sm text-slate-700">週1回（期間キー: ISO 週 YYYY-Www）</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-slate-600">
            パルス調査期間一覧
            <span className="text-xs text-slate-400 ml-2">({periods.length}件)</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  期間
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  タイトル
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  回答期限
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider hidden md:table-cell">
                  リンク先
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    パルス調査期間がありません
                  </td>
                </tr>
              ) : (
                periods.map(p => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-sm text-slate-700">{p.survey_period}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.title}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(p.deadline_date)}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell font-mono text-xs">
                      {p.link_path || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setDialogState({ open: true, period: p })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="編集"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PulseSurveyPeriodFormDialog
        open={dialogState.open}
        onClose={() => setDialogState({ open: false })}
        period={dialogState.period}
        cadence={cadence}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">パルス調査期間を削除</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <span className="font-bold">「{deleteTarget.title}」</span>（{deleteTarget.survey_period}）を削除しますか？
                </p>
                <p className="text-xs text-red-600 mt-1">この操作は取り消せません。</p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isPending ? '削除中...' : '削除する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
