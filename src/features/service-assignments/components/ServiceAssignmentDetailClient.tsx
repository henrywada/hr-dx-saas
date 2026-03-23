'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, RefreshCw, Trash2 } from 'lucide-react'
import type { ServiceAssignmentRow, ServiceAssignmentUserWithEmployee } from '../types'
import {
  updateServiceAssignment,
  syncServiceAssignmentUsers,
  updateServiceAssignmentUserAvailability,
  deleteServiceAssignmentUser,
} from '../actions'
import { APP_ROUTES } from '@/config/routes'

interface ServiceAssignmentDetailClientProps {
  assignment: ServiceAssignmentRow
  users: ServiceAssignmentUserWithEmployee[]
}

export function ServiceAssignmentDetailClient({
  assignment,
  users: initialUsers,
}: ServiceAssignmentDetailClientProps) {
  const [serviceType, setServiceType] = useState(assignment.service_type)
  const [users, setUsers] = useState(initialUsers)
  const [isPending, startTransition] = useTransition()
  const [syncPending, setSyncPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ServiceAssignmentUserWithEmployee | null>(null)

  const basePath = `${APP_ROUTES.TENANT.ADMIN}/service-assignments`

  const handleSaveServiceType = () => {
    setError(null)
    setSuccessMessage(null)
    startTransition(async () => {
      const result = await updateServiceAssignment(assignment.id, serviceType.trim())
      if (result.success) {
        setSuccessMessage('サービス種別を更新しました')
      } else {
        setError(result.error || '更新に失敗しました')
      }
    })
  }

  const handleSync = () => {
    setError(null)
    setSuccessMessage(null)
    setSyncPending(true)
    startTransition(async () => {
      const result = await syncServiceAssignmentUsers(assignment.id)
      if (result.success) {
        setSuccessMessage(
          result.insertedCount
            ? `${result.insertedCount}件のユーザーを追加しました`
            : '同期完了（追加対象はありませんでした）'
        )
        // 再取得のためページをリフレッシュ
        window.location.reload()
      } else {
        setError(result.error || '同期に失敗しました')
      }
      setSyncPending(false)
    })
  }

  const handleToggleAvailability = (user: ServiceAssignmentUserWithEmployee) => {
    const newValue = !user.is_available
    startTransition(async () => {
      const result = await updateServiceAssignmentUserAvailability(
        user.id,
        newValue,
        assignment.id
      )
      if (result.success) {
        setUsers(prev =>
          prev.map(u => (u.id === user.id ? { ...u, is_available: newValue } : u))
        )
      }
    })
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteServiceAssignmentUser(deleteTarget.id, assignment.id)
      if (result.success) {
        setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
        setDeleteTarget(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href={basePath} className="hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          サービス対象者管理
        </Link>
        <span>/</span>
        <span>詳細・編集</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          サービス割当の編集
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          サービス種別と対象ユーザーを管理します
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}
      {successMessage && (
        <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
          {successMessage}
        </div>
      )}

      {/* サービス種別編集 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">サービス種別</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={serviceType}
            onChange={e => setServiceType(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="例: pulse_survey"
          />
          <button
            onClick={handleSaveServiceType}
            disabled={isPending || serviceType.trim() === assignment.service_type}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* 対象ユーザー同期 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-slate-600">
              対象ユーザー一覧
              <span className="text-xs text-slate-400 ml-2">({users.length}件)</span>
            </span>
          </div>
          <button
            onClick={handleSync}
            disabled={syncPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncPending ? 'animate-spin' : ''}`} />
            対象ユーザーを同期
          </button>
        </div>
        <p className="px-5 py-2 text-xs text-slate-500 bg-slate-50/30 border-b border-slate-100">
          同期ボタンで、test/developer/company_doctor 以外のロールを持つ従業員のうち、未登録分を一括追加します。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  従業員名
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  有効/無効
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-slate-400">
                    対象ユーザーがありません。「対象ユーザーを同期」で追加してください。
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {u.employee_name || '（名前なし）'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(u)}
                        disabled={isPending}
                        className={`
                          inline-flex px-2.5 py-1 rounded-md text-xs font-medium transition-colors
                          ${
                            u.is_available
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }
                        `}
                      >
                        {u.is_available ? '有効' : '無効'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteTarget(u)}
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

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-slate-900">対象ユーザーを削除</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <span className="font-bold">{deleteTarget.employee_name || '（名前なし）'}</span>
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
    </div>
  )
}
