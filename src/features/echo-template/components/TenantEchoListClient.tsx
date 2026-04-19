'use client'

import { useState, useTransition } from 'react'
import { Copy, Pencil, Trash2, Star, StarOff, FileText } from 'lucide-react'
import {
  activateEchoQuestionnaire,
  deactivateEchoQuestionnaire,
  deleteTenantEchoQuestionnaire,
} from '../actions'
import { getTenantEchoQuestionnaires } from '../queries'
import { getQuestionnaireDetailAction } from '@/features/questionnaire/actions'
import QuestionManagerModal from '@/features/questionnaire/components/QuestionManagerModal'
import TenantEchoCopyModal from './TenantEchoCopyModal'
import type { TenantEchoQuestionnaire, EchoTemplate } from '../types'
import type { QuestionnaireListItem } from '@/features/questionnaire/types'

interface Props {
  tenantId: string
  initialQuestionnaires: TenantEchoQuestionnaire[]
  templates: EchoTemplate[]
}

export default function TenantEchoListClient({
  tenantId,
  initialQuestionnaires,
  templates,
}: Props) {
  const [questionnaires, setQuestionnaires] =
    useState<TenantEchoQuestionnaire[]>(initialQuestionnaires)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [editingDetail, setEditingDetail] = useState<QuestionnaireListItem | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function refreshList() {
    startTransition(async () => {
      const fresh = await getTenantEchoQuestionnaires(tenantId)
      setQuestionnaires(fresh)
    })
  }

  function handleOpenEdit(id: string) {
    startTransition(async () => {
      const result = await getQuestionnaireDetailAction(id)
      if (result.success && result.data) {
        const detail = result.data
        setEditingDetail({
          ...detail,
          question_count: (detail.questions ?? []).length,
          assignment_count: 0,
          submitted_count: 0,
          period_count: 0,
          has_ongoing_period_display: false,
          ongoing_period_start_date: null,
          ongoing_period_end_date: null,
        })
      }
    })
  }

  function handleActivate(id: string) {
    startTransition(async () => {
      const result = await activateEchoQuestionnaire(id)
      if (!result.success) {
        setError(result.error ?? '本番指定に失敗しました')
        return
      }
      refreshList()
    })
  }

  function handleDeactivate(id: string) {
    startTransition(async () => {
      const result = await deactivateEchoQuestionnaire(id)
      if (!result.success) {
        setError(result.error ?? '本番解除に失敗しました')
        return
      }
      refreshList()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteTenantEchoQuestionnaire(id)
      if (!result.success) {
        setError(result.error ?? '削除に失敗しました')
        return
      }
      setQuestionnaires(prev => prev.filter(q => q.id !== id))
      setDeleteConfirmId(null)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Echo 設問管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            月次パルスサーベイで使用する設問セットを管理します。
          </p>
        </div>
        <button
          onClick={() => setShowCopyModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
        >
          <Copy size={15} />
          テンプレートからコピー
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="underline text-xs">
            閉じる
          </button>
        </div>
      )}

      {questionnaires.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">設問セットがありません。</p>
          <p className="text-xs mt-1">「テンプレートからコピー」して設問を作成してください。</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-600">設問セット名</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">設問数</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">状態</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {questionnaires.map(q => {
                const isActive = q.status === 'active'
                return (
                  <tr key={q.id} className={isActive ? 'bg-primary/5' : 'hover:bg-slate-50'}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <Star
                            size={14}
                            className="text-accent-orange fill-accent-orange shrink-0"
                          />
                        )}
                        <span className="font-medium text-slate-800">{q.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{q.question_count}</td>
                    <td className="px-4 py-3 text-center">
                      {isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          本番稼働中
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                          下書き
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleOpenEdit(q.id)}
                          disabled={isPending}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                        >
                          <Pencil size={12} />
                          編集
                        </button>
                        {isActive ? (
                          <button
                            onClick={() => handleDeactivate(q.id)}
                            disabled={isPending}
                            className="flex items-center gap-1 px-3 py-1 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                          >
                            <StarOff size={12} />
                            本番解除
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleActivate(q.id)}
                              disabled={isPending}
                              className="flex items-center gap-1 px-3 py-1 text-xs text-accent-orange border border-accent-orange/30 rounded-lg hover:bg-accent-orange/10 disabled:opacity-50"
                            >
                              <Star size={12} />
                              本番指定
                            </button>
                            {deleteConfirmId === q.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(q.id)}
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
                                onClick={() => setDeleteConfirmId(q.id)}
                                className="flex items-center gap-1 px-3 py-1 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
                              >
                                <Trash2 size={12} />
                                削除
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCopyModal && (
        <TenantEchoCopyModal
          templates={templates}
          onCopied={() => {
            refreshList()
            setShowCopyModal(false)
          }}
          onClose={() => setShowCopyModal(false)}
        />
      )}

      {editingDetail && (
        <QuestionManagerModal
          questionnaire={editingDetail}
          onClose={() => {
            refreshList()
            setEditingDetail(null)
          }}
        />
      )}
    </div>
  )
}
