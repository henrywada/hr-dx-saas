'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { Users, RefreshCw, Trash2, Plus } from 'lucide-react'
import type { ProgramTargetWithEmployee } from '../types'
import type { ProgramType } from '../types'
import { PROGRAM_TYPE_LABELS } from '../constants'
import {
  syncProgramTargets,
  updateProgramTarget,
  deleteProgramTarget,
  addProgramTarget,
} from '../actions'
import { APP_ROUTES } from '@/config/routes'
import { AddTargetDialog } from './AddTargetDialog'
import type { EmployeeForTargetSelection } from '../types'

interface ProgramTargetDetailClientProps {
  programType: ProgramType
  instanceId: string
  instanceLabel: string
  targets: ProgramTargetWithEmployee[]
  employeesForSelection: EmployeeForTargetSelection[]
}

export function ProgramTargetDetailClient({
  programType,
  instanceId,
  instanceLabel,
  targets: initialTargets,
  employeesForSelection,
}: ProgramTargetDetailClientProps) {
  const [targets, setTargets] = useState(initialTargets)
  const [isPending, startTransition] = useTransition()
  const [syncPending, setSyncPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProgramTargetWithEmployee | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const basePath = APP_ROUTES.TENANT.ADMIN_PROGRAM_TARGETS
  const typeLabel = PROGRAM_TYPE_LABELS[programType] ?? programType

  const handleSync = () => {
    setError(null)
    setSuccessMessage(null)
    setSyncPending(true)
    startTransition(async () => {
      const result = await syncProgramTargets(programType, instanceId)
      if (result.success) {
        setSuccessMessage(
          result.insertedCount
            ? `${result.insertedCount}件を追加しました`
            : '同期完了（追加対象はありませんでした）'
        )
        window.location.reload()
      } else {
        setError(result.error || '同期に失敗しました')
      }
      setSyncPending(false)
    })
  }

  const handleToggleEligible = (target: ProgramTargetWithEmployee) => {
    const newEligible = !target.is_eligible
    startTransition(async () => {
      const result = await updateProgramTarget(target.id, newEligible, target.exclusion_reason)
      if (result.success) {
        setTargets((prev) =>
          prev.map((t) => (t.id === target.id ? { ...t, is_eligible: newEligible } : t))
        )
      }
    })
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteProgramTarget(deleteTarget.id, programType, instanceId)
      if (result.success) {
        setTargets((prev) => prev.filter((t) => t.id !== deleteTarget.id))
        setDeleteTarget(null)
      }
    })
  }

  const handleAdd = async (
    pType: ProgramType,
    instId: string,
    employeeId: string
  ) => {
    return addProgramTarget(pType, instId, employeeId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>{typeLabel}</span>
        <span>/</span>
        <span>{instanceLabel}</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{instanceLabel}</h1>
        <p className="text-sm text-slate-500 mt-1">
          登録がない場合、全従業員が対象になります。
        </p>
        <div className="flex justify-end mt-3">
          <Link href={basePath} className="text-sm text-blue-600 hover:underline whitespace-nowrap">
            ← 戻る
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}
      {successMessage && (
        <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
          {successMessage}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-slate-600">
              対象者一覧
              <span className="text-xs text-slate-400 ml-2">({targets.length}件)</span>
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => setAddDialogOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              手動追加
            </button>
            <button
              onClick={handleSync}
              disabled={syncPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${syncPending ? 'animate-spin' : ''}`} />
              対象者を同期
            </button>
          </div>
        </div>
        <p className="px-5 py-2 text-xs text-slate-500 bg-slate-50/30 border-b border-slate-100">
          同期ボタンで、test/developer/company_doctor 以外の従業員のうち未登録分を一括追加します。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  従業員名
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  部署
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  対象/除外
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  除外理由
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {targets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    対象者がありません。「対象者を同期」または「手動追加」で追加してください。
                  </td>
                </tr>
              ) : (
                targets.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {t.employee_no ? `${t.employee_no} - ` : ''}
                      {t.employee_name || '（名前なし）'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.division_name ?? '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleEligible(t)}
                        disabled={isPending}
                        className={`
                          inline-flex px-2.5 py-1 rounded-md text-xs font-medium transition-colors
                          ${
                            t.is_eligible
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }
                        `}
                      >
                        {t.is_eligible ? '対象' : '除外'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-[200px] truncate">
                      {t.exclusion_reason || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteTarget(t)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">対象者を削除</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <span className="font-bold">
                    {deleteTarget.employee_name || '（名前なし）'}
                  </span>
                  を対象から外しますか？
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
                  onClick={handleConfirmDelete}
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

      <AddTargetDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        employees={employeesForSelection}
        programType={programType}
        instanceId={instanceId}
        onAdd={handleAdd}
      />
    </div>
  )
}
