'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import {
  createGlobalEvaluationTemplate,
  updateGlobalEvaluationTemplate,
  deleteGlobalEvaluationTemplate,
} from '@/features/global-evaluation-templates/actions'
import {
  TEMPLATE_TYPE_LABELS,
  type GlobalEvaluationTemplate,
  type EvaluationTemplateType,
} from '@/features/global-evaluation-templates/types'

interface Props {
  initialTemplates: GlobalEvaluationTemplate[]
}

const TEMPLATE_TYPES: EvaluationTemplateType[] = ['general', 'manager', 'parttime']

export function GlobalEvalTemplatesClient({ initialTemplates }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // 新規作成フォームの状態
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createType, setCreateType] = useState<EvaluationTemplateType>('general')
  const [createDesc, setCreateDesc] = useState('')

  // 編集中のテンプレートID
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  function startEdit(t: GlobalEvaluationTemplate) {
    setEditingId(t.id)
    setEditName(t.name)
    setEditDesc(t.description ?? '')
  }

  function handleCreate() {
    if (!createName.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await createGlobalEvaluationTemplate({
        name: createName,
        template_type: createType,
        description: createDesc || undefined,
      })
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
        return
      }
      setShowCreateForm(false)
      setCreateName('')
      setCreateDesc('')
      window.location.reload()
    })
  }

  function handleUpdate(id: string) {
    if (!editName.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await updateGlobalEvaluationTemplate({
        id,
        name: editName,
        description: editDesc || null,
      })
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
        return
      }
      setEditingId(null)
      window.location.reload()
    })
  }

  function handleDelete(id: string, name: string) {
    if (
      !confirm(
        `「${name}」を削除しますか？\n※このテンプレートを参照しているテナントに影響はありません。`
      )
    )
      return
    setError(null)
    startTransition(async () => {
      const result = await deleteGlobalEvaluationTemplate({ id })
      if (!result.success) {
        setError('error' in result ? result.error : '不明なエラー')
        return
      }
      window.location.reload()
    })
  }

  function handleToggleActive(t: GlobalEvaluationTemplate) {
    startTransition(async () => {
      await updateGlobalEvaluationTemplate({ id: t.id, is_active: !t.is_active })
      window.location.reload()
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 新規作成ボタン */}
      {!showCreateForm && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
            disabled={isPending}
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
            新規テンプレート作成
          </button>
        </div>
      )}

      {/* 新規作成フォーム */}
      {showCreateForm && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-800">新規テンプレート作成</h3>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  テンプレート名 *
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  placeholder="例：一般社員用 標準テンプレート"
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">種別 *</label>
                <select
                  value={createType}
                  onChange={e => setCreateType(e.target.value as EvaluationTemplateType)}
                  className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {TEMPLATE_TYPES.map(t => (
                    <option key={t} value={t}>
                      {TEMPLATE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">説明</label>
              <input
                type="text"
                value={createDesc}
                onChange={e => setCreateDesc(e.target.value)}
                placeholder="テンプレートの説明（任意）"
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateForm(false)
                  setCreateName('')
                  setCreateDesc('')
                }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={isPending}
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={isPending || !createName.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* テンプレート一覧 */}
      {initialTemplates.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">テンプレートがありません</p>
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
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
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
              {initialTemplates.map(t => (
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
                        href={APP_ROUTES.SAAS.EVAL_GLOBAL_TEMPLATE_DETAIL(t.id)}
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
                  <td className="px-4 py-3">
                    {editingId === t.id ? (
                      <input
                        type="text"
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm text-gray-600">{t.description ?? '—'}</span>
                    )}
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
                          onClick={() => handleUpdate(t.id)}
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
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
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
    </div>
  )
}
