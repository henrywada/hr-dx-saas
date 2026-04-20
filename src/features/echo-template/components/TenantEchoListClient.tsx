'use client'

import { useState, useTransition } from 'react'
import { Copy, Pencil, Trash2, Star, StarOff, FileText, X } from 'lucide-react'
import {
  activateEchoQuestionnaire,
  deactivateEchoQuestionnaire,
  deleteTenantEchoQuestionnaire,
  updateTenantEchoQuestionnaireTitle,
} from '../actions'
import { getTenantEchoQuestionnaires } from '../queries'
import { getQuestionnaireDetailAction } from '@/features/questionnaire/actions'
import QuestionManagerModal from '@/features/questionnaire/components/QuestionManagerModal'
import TenantEchoCopyModal from './TenantEchoCopyModal'
import type { TenantEchoQuestionnaire, EchoTemplate } from '../types'
import type { QuestionnaireListItem } from '@/features/questionnaire/types'
import type { PulseSurveyCadence } from '@/lib/datetime'

interface Props {
  tenantId: string
  initialQuestionnaires: TenantEchoQuestionnaire[]
  templates: EchoTemplate[]
  initialPulseCadence: PulseSurveyCadence
}

export default function TenantEchoListClient({
  tenantId,
  initialQuestionnaires,
  templates,
  initialPulseCadence,
}: Props) {
  const [questionnaires, setQuestionnaires] =
    useState<TenantEchoQuestionnaire[]>(initialQuestionnaires)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [editingDetail, setEditingDetail] = useState<QuestionnaireListItem | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editingNameValue, setEditingNameValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [activateTargetId, setActivateTargetId] = useState<string | null>(null)
  const [activateCadence, setActivateCadence] = useState<PulseSurveyCadence>(initialPulseCadence)

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

  function openActivateModal(id: string) {
    setError(null)
    setNotice(null)
    setActivateCadence(initialPulseCadence)
    setActivateTargetId(id)
  }

  function handleConfirmActivate() {
    if (!activateTargetId) return
    const id = activateTargetId
    const cadence = activateCadence
    startTransition(async () => {
      const result = await activateEchoQuestionnaire(id, cadence)
      if (!result.success) {
        setError(result.error ?? '本番指定に失敗しました')
        return
      }
      setActivateTargetId(null)
      setError(null)
      setNotice(result.warning ?? null)
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

  function cancelEditingName() {
    setEditingNameId(null)
    setEditingNameValue('')
  }

  function saveEditingName(id: string) {
    const trimmed = editingNameValue.trim()
    if (!trimmed) {
      setError('設問セット名を入力してください。')
      return
    }
    startTransition(async () => {
      const result = await updateTenantEchoQuestionnaireTitle(id, trimmed)
      if (!result.success) {
        setError(result.error ?? '名称の更新に失敗しました')
        return
      }
      setQuestionnaires(prev => prev.map(q => (q.id === id ? { ...q, title: trimmed } : q)))
      cancelEditingName()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">パルスサーベイ（Echo） 設問管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            パルスサーベイ（Echo）で使用する設問セットを管理します。
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

      {notice && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="underline text-xs shrink-0">
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
                    <td className="px-5 py-3 min-w-48">
                      {editingNameId === q.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {isActive && (
                            <Star
                              size={14}
                              className="text-accent-orange fill-accent-orange shrink-0"
                            />
                          )}
                          <input
                            type="text"
                            value={editingNameValue}
                            onChange={e => setEditingNameValue(e.target.value)}
                            className="flex-1 min-w-32 max-w-md rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                            disabled={isPending}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                saveEditingName(q.id)
                              }
                              if (e.key === 'Escape') cancelEditingName()
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => saveEditingName(q.id)}
                            disabled={isPending}
                            className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                          >
                            保存
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditingName}
                            disabled={isPending}
                            className="shrink-0 rounded-lg px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 min-w-0">
                          {isActive && (
                            <Star
                              size={14}
                              className="text-accent-orange fill-accent-orange shrink-0"
                            />
                          )}
                          <span className="font-medium text-slate-800 truncate min-w-0">
                            {q.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setError(null)
                              setEditingNameId(q.id)
                              setEditingNameValue(q.title)
                            }}
                            disabled={isPending}
                            className="shrink-0 inline-flex items-center gap-0.5 rounded-md border border-transparent px-1.5 py-0.5 text-xs font-medium text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
                            title="設問セット名を変更"
                          >
                            <Pencil size={12} />
                            <span className="sr-only">設問セット名を変更</span>
                          </button>
                        </div>
                      )}
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
                            type="button"
                            onClick={() => {
                              setError(null)
                              handleDeactivate(q.id)
                            }}
                            disabled={isPending}
                            title="パルスサーベイの本番公開を止め、下書きに戻します"
                            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 disabled:opacity-50 disabled:pointer-events-none"
                          >
                            <StarOff size={12} />
                            本番解除
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openActivateModal(q.id)}
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

      {activateTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="閉じる"
            onClick={() => !isPending && setActivateTargetId(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Star className="text-accent-orange shrink-0" size={18} />
                本番指定
              </h3>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setActivateTargetId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                パルスサーベイの実施間隔を選んでから本番にします。期間キーは「パルス調査期間管理」で{' '}
                {activateCadence === 'monthly' ? 'YYYY-MM' : 'YYYY-Www'} 形式で登録してください。
              </p>
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-800">実施間隔</span>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                    <input
                      type="radio"
                      name="activate_pulse_cadence"
                      className="text-primary"
                      checked={activateCadence === 'monthly'}
                      disabled={isPending}
                      onChange={() => setActivateCadence('monthly')}
                    />
                    月1回（期間キー: YYYY-MM）
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                    <input
                      type="radio"
                      name="activate_pulse_cadence"
                      className="text-primary"
                      checked={activateCadence === 'weekly'}
                      disabled={isPending}
                      onChange={() => setActivateCadence('weekly')}
                    />
                    週1回（期間キー: ISO 週 YYYY-Www）
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setActivateTargetId(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleConfirmActivate}
                  className="px-4 py-2 text-sm font-medium text-white bg-accent-orange rounded-lg hover:bg-accent-orange/90 disabled:opacity-50"
                >
                  {isPending ? '処理中…' : '本番にする'}
                </button>
              </div>
            </div>
          </div>
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
