'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createEvaluationSheets, deleteEvaluationSheet } from '@/features/evaluation/actions'
import { APP_ROUTES } from '@/config/routes'
import {
  FLOW_STATUS_LABELS,
  PERIOD_STATUS_LABELS,
  TEMPLATE_TYPE_LABELS,
  type EvaluationPeriod,
  type EvaluationSheet,
  type EvaluationTemplate,
} from '@/features/evaluation/types'

interface Employee {
  id: string
  full_name: string
  employee_code: string | null
  division_path: string | null
}

interface Props {
  periods: EvaluationPeriod[]
  templates: EvaluationTemplate[]
  employees: Employee[]
  initialSheets: EvaluationSheet[]
  initialPeriodId: string | null
}

const FLOW_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  goal_set: 'bg-blue-50 text-blue-700',
  self_eval: 'bg-purple-50 text-purple-700',
  self_submitted: 'bg-purple-100 text-purple-800',
  primary_eval: 'bg-yellow-50 text-yellow-700',
  primary_submitted: 'bg-yellow-100 text-yellow-800',
  secondary_eval: 'bg-orange-50 text-orange-700',
  secondary_submitted: 'bg-orange-100 text-orange-800',
  confirming: 'bg-indigo-50 text-indigo-700',
  confirmed: 'bg-green-50 text-green-700',
}

export function EvalSheetsClient({
  periods,
  templates,
  employees,
  initialSheets,
  initialPeriodId,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // 表示期間は URL クエリ（period）に連動させ、変更時にサーバー側で該当期間のシートを再取得する
  const selectedPeriodId = initialPeriodId ?? ''
  function handlePeriodChange(periodId: string) {
    router.push(periodId ? `${APP_ROUTES.EVALUATION.ADMIN_LIST}?period=${periodId}` : APP_ROUTES.EVALUATION.ADMIN_LIST)
  }
  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [genTemplateId, setGenTemplateId] = useState<string>(
    templates.find(t => t.is_active)?.id ?? ''
  )
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set())

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId)
  const activeTemplates = templates.filter(t => t.is_active)

  function toggleEmployee(id: string) {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleAll() {
    if (selectedEmployeeIds.size === employees.length) {
      setSelectedEmployeeIds(new Set())
    } else {
      setSelectedEmployeeIds(new Set(employees.map(e => e.id)))
    }
  }

  function handleGenerate() {
    if (!selectedPeriodId || !genTemplateId || selectedEmployeeIds.size === 0) return
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await createEvaluationSheets({
        period_id: selectedPeriodId,
        template_id: genTemplateId,
        employee_ids: Array.from(selectedEmployeeIds),
      })
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
        return
      }
      setSuccess(`${selectedEmployeeIds.size}件の評価シートを生成しました`)
      setShowGenerateForm(false)
      setSelectedEmployeeIds(new Set())
    })
  }

  function handleDelete(sheet: EvaluationSheet, empName: string) {
    if (!confirm(`「${empName}」の評価シートを削除しますか？\nこの操作は取り消せません。`)) return
    setError(null)
    startTransition(async () => {
      const result = await deleteEvaluationSheet({ id: sheet.id })
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
      }
    })
  }

  const employeeMap = new Map(employees.map(e => [e.id, e]))

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* 期間セレクター */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700">表示期間:</label>
        <select
          value={selectedPeriodId}
          onChange={e => handlePeriodChange(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">— 期間を選択 —</option>
          {periods.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}（{PERIOD_STATUS_LABELS[p.status]}）
            </option>
          ))}
        </select>
        {selectedPeriod && (
          <span className="text-xs text-gray-500">
            {selectedPeriod.start_date} 〜 {selectedPeriod.end_date}
          </span>
        )}
        <div className="ml-auto">
          <button
            onClick={() => setShowGenerateForm(v => !v)}
            disabled={!selectedPeriodId || activeTemplates.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            評価シートを生成
          </button>
        </div>
      </div>

      {/* 生成フォーム */}
      {showGenerateForm && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">評価シートを一括生成</h3>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-700">テンプレート *</label>
            <select
              value={genTemplateId}
              onChange={e => setGenTemplateId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none sm:w-80"
            >
              <option value="">— 選択 —</option>
              {activeTemplates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}（{TEMPLATE_TYPE_LABELS[t.template_type]}）
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">
                対象従業員（{selectedEmployeeIds.size}/{employees.length}名選択）
              </label>
              <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                {selectedEmployeeIds.size === employees.length ? '全解除' : '全選択'}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white">
              {employees.map(e => (
                <label
                  key={e.id}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedEmployeeIds.has(e.id)}
                    onChange={() => toggleEmployee(e.id)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">
                    {e.full_name}
                    {e.employee_code && (
                      <span className="ml-1 text-xs text-gray-400">({e.employee_code})</span>
                    )}
                    {e.division_path && (
                      <span className="ml-1.5 text-xs text-gray-400">{e.division_path}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowGenerateForm(false)
                setSelectedEmployeeIds(new Set())
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isPending}
            >
              キャンセル
            </button>
            <button
              onClick={handleGenerate}
              disabled={isPending || !genTemplateId || selectedEmployeeIds.size === 0}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? '生成中...' : `${selectedEmployeeIds.size}名分を生成`}
            </button>
          </div>
        </div>
      )}

      {/* 評価シート一覧 */}
      {!selectedPeriodId ? (
        <p className="py-8 text-center text-sm text-gray-500">期間を選択してください</p>
      ) : initialSheets.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">この期間の評価シートがありません</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  従業員
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  フロー状態
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                  確定スコア
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {initialSheets.map(sheet => {
                const emp = employeeMap.get(sheet.employee_id)
                const empName = emp?.full_name ?? sheet.employee_id
                return (
                  <tr key={sheet.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-800">
                        {emp?.full_name ?? sheet.employee_id}
                      </span>
                      {emp?.employee_code && (
                        <span className="ml-1 text-xs text-gray-400">({emp.employee_code})</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${FLOW_STATUS_COLORS[sheet.flow_status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {FLOW_STATUS_LABELS[sheet.flow_status]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="text-sm text-gray-600">
                        {sheet.final_score != null ? `${sheet.final_score}点` : '—'}
                        {sheet.final_grade && (
                          <span className="ml-1 font-medium text-gray-800">
                            ({sheet.final_grade})
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-3">
                        <Link
                          href={APP_ROUTES.EVALUATION.ADMIN_SHEET(sheet.id)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          詳細
                        </Link>
                        <button
                          onClick={() => handleDelete(sheet, empName)}
                          disabled={isPending}
                          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
