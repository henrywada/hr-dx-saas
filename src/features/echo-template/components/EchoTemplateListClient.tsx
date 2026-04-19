'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, FileText } from 'lucide-react'
import { deleteEchoTemplate } from '../actions'
import { getEchoTemplateDetail, getEchoTemplates } from '../queries'
import EchoTemplateFormModal from './EchoTemplateFormModal'
import EchoTemplateQuestionManager from './EchoTemplateQuestionManager'
import type { EchoTemplate, EchoTemplateDetail } from '../types'

interface Props {
  initialTemplates: EchoTemplate[]
}

export default function EchoTemplateListClient({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState<EchoTemplate[]>(initialTemplates)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EchoTemplateDetail | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function refreshTemplates() {
    startTransition(async () => {
      const fresh = await getEchoTemplates()
      setTemplates(fresh)
    })
  }

  function handleOpenEdit(templateId: string) {
    startTransition(async () => {
      const detail = await getEchoTemplateDetail(templateId)
      if (detail) setEditingTemplate(detail)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteEchoTemplate(id)
      setTemplates(prev => prev.filter(t => t.id !== id))
      setDeleteConfirmId(null)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Echo テンプレート管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            パルスサーベイ用の設問テンプレートを管理します。
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
        >
          <Plus size={16} />
          新規作成
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">テンプレートがありません。「新規作成」から追加してください。</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-600">テンプレート名</th>
                <th className="text-left px-5 py-3 font-medium text-slate-600">説明</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">設問数</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {templates.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{t.title}</td>
                  <td className="px-5 py-3 text-slate-500 max-w-xs truncate">
                    {t.description ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{t.question_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(t.id)}
                        disabled={isPending}
                        className="flex items-center gap-1 px-3 py-1 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                      >
                        <Pencil size={12} />
                        編集
                      </button>
                      {deleteConfirmId === t.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(t.id)}
                            disabled={isPending}
                            className="px-3 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                          >
                            削除確認
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
                          >
                            戻る
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(t.id)}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 size={12} />
                          削除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <EchoTemplateFormModal
          onCreated={() => {
            refreshTemplates()
            setShowCreateModal(false)
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {editingTemplate && (
        <EchoTemplateQuestionManager
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onUpdated={() => {
            refreshTemplates()
            setEditingTemplate(null)
          }}
        />
      )}
    </div>
  )
}
