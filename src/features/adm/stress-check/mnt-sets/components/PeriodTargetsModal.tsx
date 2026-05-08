'use client'

import React, { useState, useEffect, useTransition, useMemo } from 'react'
import { X, UserCheck, UserX, Loader2 } from 'lucide-react'
import { getEmployeesInPeriodDivisions, upsertProgramTarget } from '../actions'
import type { StressCheckPeriodWithDivisions } from '@/features/stress-check/types'
import type { Division } from '@/features/organization/types'
import { buildDivisionFullPath } from '@/features/organization/types'

interface Employee {
  id: string
  employee_no?: string | null
  name?: string | null
  division_id?: string | null
}

interface PeriodTargetsModalProps {
  period: StressCheckPeriodWithDivisions
  allDivisions: Division[]
  onClose: () => void
}

/** 実施グループ内の対象者を管理するモーダル（要件4） */
export function PeriodTargetsModal({ period, allDivisions, onClose }: PeriodTargetsModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // period の divisionIds（+ 配下の全部署）を ancestor 解決で列挙
  const targetDivisionIds = useMemo(() => {
    const selected = new Set(period.divisionIds)
    const result = new Set<string>()
    for (const d of allDivisions) {
      let cur: Division | undefined = d
      while (cur) {
        if (selected.has(cur.id)) {
          result.add(d.id)
          break
        }
        cur = cur.parent_id ? allDivisions.find(x => x.id === cur!.parent_id) : undefined
      }
    }
    return Array.from(result)
  }, [period.divisionIds, allDivisions])

  useEffect(() => {
    setLoading(true)
    getEmployeesInPeriodDivisions(period.id, targetDivisionIds).then(res => {
      if (res.success) {
        setEmployees(res.data as Employee[])
        setExcludedIds(new Set(res.excludedIds))
      }
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.id])

  const toggleExclusion = (employeeId: string) => {
    startTransition(async () => {
      const willExclude = !excludedIds.has(employeeId)
      const res = await upsertProgramTarget(
        period.id,
        employeeId,
        !willExclude,
        willExclude ? '管理者による除外' : undefined
      )
      if (!res.success) {
        alert(res.error ?? '更新に失敗しました')
        return
      }
      setExcludedIds(prev => {
        const next = new Set(prev)
        if (willExclude) next.add(employeeId)
        else next.delete(employeeId)
        return next
      })
    })
  }

  const getDivisionName = (divisionId?: string | null) =>
    divisionId ? buildDivisionFullPath(divisionId, allDivisions) : '—'

  const eligibleCount = employees.length - excludedIds.size

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-slate-200">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">対象者管理</h3>
            <p className="text-xs text-slate-500 mt-0.5">{period.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* サマリー */}
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 text-sm text-blue-700">
          対象者 <strong>{eligibleCount}</strong> 名 / 全 <strong>{employees.length}</strong> 名
          {excludedIds.size > 0 && (
            <span className="ml-2 text-amber-600">（{excludedIds.size} 名除外中）</span>
          )}
        </div>

        {/* 従業員リスト */}
        <div className="max-h-[55vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : employees.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">
              対象部署に従業員が見つかりません
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="px-6 py-3 text-left font-semibold">社員番号</th>
                  <th className="px-6 py-3 text-left font-semibold">氏名</th>
                  <th className="px-6 py-3 text-left font-semibold">所属部署</th>
                  <th className="px-6 py-3 text-center font-semibold">受検</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map(emp => {
                  const isExcluded = excludedIds.has(emp.id)
                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-50 transition-colors ${isExcluded ? 'opacity-50' : ''}`}
                    >
                      <td className="px-6 py-3 text-slate-600 font-mono text-xs">
                        {emp.employee_no ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-slate-900">{emp.name ?? '—'}</td>
                      <td className="px-6 py-3 text-slate-500 text-xs">
                        {getDivisionName(emp.division_id)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => toggleExclusion(emp.id)}
                          disabled={isPending}
                          className={`p-1.5 rounded transition-colors ${
                            isExcluded
                              ? 'text-slate-400 hover:bg-slate-100'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={isExcluded ? '対象に戻す' : '除外する'}
                        >
                          {isExcluded ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
