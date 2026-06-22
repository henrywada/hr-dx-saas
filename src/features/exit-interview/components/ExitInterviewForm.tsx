'use client'

import { useState, useTransition } from 'react'
import { createExitInterview, updateExitInterview } from '@/features/exit-interview/actions'
import type {
  ExitInterview,
  ExitInterviewInput,
  MainReason,
  AgeGroup,
} from '@/features/exit-interview/types'
import {
  ALL_MAIN_REASONS,
  ALL_AGE_GROUPS,
  MAIN_REASON_LABELS,
  AGE_GROUP_LABELS,
  SUB_REASON_OPTIONS,
} from '@/features/exit-interview/types'

interface Employee {
  id: string
  name: string
  department_name: string | null
}

interface Props {
  record?: ExitInterview
  employees: Employee[]
  onClose: () => void
}

const EMPTY: ExitInterviewInput = {
  employee_id: '',
  employee_name: '',
  department_name: '',
  exit_date: '',
  age_group: 'unknown',
  main_reason: 'other',
  sub_reasons: [],
  notes: '',
}

export function ExitInterviewForm({ record, employees, onClose }: Props) {
  const isEdit = !!record
  const [form, setForm] = useState<ExitInterviewInput>(
    isEdit
      ? {
          employee_id: record.employee_id ?? '',
          employee_name: record.employee_name,
          department_name: record.department_name ?? '',
          exit_date: record.exit_date,
          age_group: record.age_group,
          main_reason: record.main_reason,
          sub_reasons: record.sub_reasons,
          notes: record.notes ?? '',
        }
      : EMPTY
  )
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const empMap = new Map(employees.map(e => [e.id, e]))

  function handleEmployeeChange(empId: string) {
    const emp = empMap.get(empId)
    setForm(prev => ({
      ...prev,
      employee_id: empId,
      employee_name: emp?.name ?? '',
      department_name: emp?.department_name ?? '',
    }))
  }

  function toggleSubReason(value: string) {
    setForm(prev => ({
      ...prev,
      sub_reasons: prev.sub_reasons.includes(value)
        ? prev.sub_reasons.filter(v => v !== value)
        : [...prev.sub_reasons, value],
    }))
  }

  function handleSubmit() {
    if (!form.employee_name.trim()) {
      setError('退職者名は必須です')
      return
    }
    if (!form.exit_date) {
      setError('退職日は必須です')
      return
    }
    setError('')
    startTransition(async () => {
      const result = isEdit
        ? await updateExitInterview(record.id, form)
        : await createExitInterview(form)
      if (result.success === false) {
        setError(result.error)
        return
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#24292f]">
          {isEdit ? '退職面談記録を編集' : '退職面談記録を追加'}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#24292f] mb-1">
              退職者 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.employee_id}
              onChange={e => handleEmployeeChange(e.target.value)}
              className="w-full border border-[#e2e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">従業員を選択</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.department_name ? ` （${e.department_name}）` : ''}
                </option>
              ))}
            </select>
            {!form.employee_id && (
              <input
                type="text"
                value={form.employee_name}
                onChange={e => setForm(prev => ({ ...prev, employee_name: e.target.value }))}
                placeholder="一覧にない場合は名前を直接入力"
                className="mt-1 w-full border border-[#e2e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#24292f] mb-1">
              退職日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.exit_date}
              onChange={e => setForm(prev => ({ ...prev, exit_date: e.target.value }))}
              className="w-full border border-[#e2e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#24292f] mb-1">年齢層</label>
            <select
              value={form.age_group}
              onChange={e => setForm(prev => ({ ...prev, age_group: e.target.value as AgeGroup }))}
              className="w-full border border-[#e2e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {ALL_AGE_GROUPS.map(g => (
                <option key={g} value={g}>
                  {AGE_GROUP_LABELS[g]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#24292f] mb-1">
              主な退職理由 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.main_reason}
              onChange={e =>
                setForm(prev => ({ ...prev, main_reason: e.target.value as MainReason }))
              }
              className="w-full border border-[#e2e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {ALL_MAIN_REASONS.map(r => (
                <option key={r} value={r}>
                  {MAIN_REASON_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#24292f] mb-2">
              詳細理由（複数可）
            </label>
            <div className="grid grid-cols-2 gap-1">
              {SUB_REASON_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className="flex items-center gap-1.5 text-sm text-[#57606a] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.sub_reasons.includes(opt.value)}
                    onChange={() => toggleSubReason(opt.value)}
                    className="w-4 h-4 accent-primary"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#24292f] mb-1">
              面談メモ（任意）
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="面談で聞いた詳細や所感など"
              className="w-full border border-[#e2e6ec] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-[#e2e6ec] rounded-lg hover:bg-[#f6f8fa]"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? '保存中…' : isEdit ? '更新する' : '追加する'}
          </button>
        </div>
      </div>
    </div>
  )
}
