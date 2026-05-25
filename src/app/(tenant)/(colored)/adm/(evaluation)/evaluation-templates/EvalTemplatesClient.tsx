'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import {
  copyFromGlobalTemplate,
  updateEvaluationTemplate,
  deleteEvaluationTemplate,
} from '@/features/evaluation/actions'
import type { EvaluationTemplate } from '@/features/evaluation/types'
import type { GlobalEvaluationTemplate } from '@/features/global-evaluation-templates/types'
import { TEMPLATE_TYPE_LABELS } from '@/features/global-evaluation-templates/types'

interface Props {
  tenantTemplates: EvaluationTemplate[]
  globalTemplates: GlobalEvaluationTemplate[]
}

export function EvalTemplatesClient({ tenantTemplates, globalTemplates }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showCopyModal, setShowCopyModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  function startEdit(t: EvaluationTemplate) {
    setEditingId(t.id)
    setEditName(t.name)
  }

  function handleToggleActive(t: EvaluationTemplate) {
    setError(null)
    startTransition(async () => {
      const result = await updateEvaluationTemplate({ id: t.id, is_active: !t.is_active })
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
      }
    })
  }

  function handleSaveName(id: string) {
    if (!editName.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await updateEvaluationTemplate({ id, name: editName })
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
        return
      }
      setEditingId(null)
    })
  }

  function handleDelete(t: EvaluationTemplate) {
    if (
      !confirm(`「${t.name}」を削除しますか？\n関連する評価シートが存在する場合は削除できません。`)
    )
      return
    setError(null)
    startTransition(async () => {
      const result = await deleteEvaluationTemplate({ id: t.id })
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
        return
      }
      setSuccess('テンプレートを削除しました')
    })
  }

  function handleCopy(globalTemplateId: string) {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await copyFromGlobalTemplate(globalTemplateId)
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
        return
      }
      setShowCopyModal(false)
      setSuccess('テンプレートをコピーしました')
    })
  }

  const activeGlobalTemplates = globalTemplates.filter(t => t.is_active)

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

      <div className="flex justify-end">
        <button
          onClick={() => setShowCopyModal(true)}
          disabled={isPending || activeGlobalTemplates.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
            />
          </svg>
          テンプレートからコピー
        </button>
      </div>

      {tenantTemplates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-500">テンプレートがありません</p>
          <p className="mt-1 text-xs text-gray-400">テンプレートからコピーして追加してください</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  テンプレート名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  種別
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                  説明
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  有効
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {tenantTemplates.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {editingId === t.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <Link
                        href={APP_ROUTES.EVALUATION.ADMIN_TEMPLATE_DETAIL(t.id)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {t.name}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {TEMPLATE_TYPE_LABELS[t.template_type]}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="text-sm text-gray-500">{t.description ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(t)}
                      disabled={isPending}
                      className="focus:outline-none"
                      aria-label={t.is_active ? '無効にする' : '有効にする'}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full ${
                          t.is_active ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === t.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                          disabled={isPending}
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={() => handleSaveName(t.id)}
                          disabled={isPending || !editName.trim()}
                          className="text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50"
                        >
                          {isPending ? '保存中...' : '保存'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => startEdit(t)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                          disabled={isPending}
                        >
                          名前を編集
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          className="text-xs text-red-500 hover:text-red-700"
                          disabled={isPending}
                        >
                          削除
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* コピーモーダル */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">テンプレートからコピー</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                コピーしたテンプレートはカスタマイズできます
              </p>
            </div>
            <div className="divide-y divide-gray-100 px-6 py-2">
              {activeGlobalTemplates.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  利用可能なグローバルテンプレートがありません
                </p>
              ) : (
                activeGlobalTemplates.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {TEMPLATE_TYPE_LABELS[t.template_type]}
                        </span>
                        {t.description && (
                          <span className="text-xs text-gray-400">{t.description}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(t.id)}
                      disabled={isPending}
                      className="ml-4 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                    >
                      {isPending ? 'コピー中...' : 'コピー'}
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setShowCopyModal(false)}
                className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={isPending}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
