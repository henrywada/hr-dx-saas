'use client'

import { useState, useTransition } from 'react'
import { addTaskTemplate, deleteTaskTemplate } from '../actions'
import type { LifecycleTaskTemplate } from '../types'

// LifecycleDashboard から import される。tab === 'templates' の時にレンダリング。

interface Props {
  templates: LifecycleTaskTemplate[]
}

export function TemplateManager({ templates }: Props) {
  const [activeType, setActiveType] = useState<'onboarding' | 'offboarding'>('onboarding')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = templates.filter(t => t.lifecycle_type === activeType)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      setFormError('タイトルを入力してください')
      return
    }

    startTransition(async () => {
      const result = await addTaskTemplate({
        lifecycleType: activeType,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        sortOrder: filtered.length,
      })

      if (!result.success) {
        setFormError(result.error ?? 'エラーが発生しました')
        return
      }

      setNewTitle('')
      setNewDescription('')
      setShowAddForm(false)
      setFormError(null)
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteTaskTemplate(id)
    })
  }

  return (
    <div className="space-y-4">
      {/* タイプ切替 */}
      <div className="flex gap-2">
        {(['onboarding', 'offboarding'] as const).map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={
              activeType === type
                ? 'rounded-full px-4 py-1.5 text-sm font-medium bg-primary text-white shadow-sm'
                : 'rounded-full px-4 py-1.5 text-sm font-medium border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
            }
          >
            {type === 'onboarding' ? '入社チェックリスト' : '退社チェックリスト'}
          </button>
        ))}
      </div>

      {/* テンプレート一覧 */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-200">
              <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                タスク名
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                説明
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800 w-16">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">
                  テンプレートがありません
                </td>
              </tr>
            ) : (
              filtered.map((t, idx) => (
                <tr
                  key={t.id}
                  className={`border-b border-gray-100 transition-[background-color,box-shadow] duration-300 ease-out hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{t.description ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={isPending}
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 追加フォーム */}
      {showAddForm ? (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タスク名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="タスク名を入力..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">説明（任意）</label>
            <input
              type="text"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              placeholder="タスクの説明を入力..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setFormError(null)
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              追加
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors w-full"
        >
          ＋ タスクを追加
        </button>
      )}
    </div>
  )
}
