'use client'

import { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { QuestionnaireListItem, CreatorType } from '../types'
import {
  deleteQuestionnaire,
  changeQuestionnaireStatus,
  fetchQuestionnairesForClient,
} from '../actions'
import QuestionnaireFormModal from './QuestionnaireFormModal'
import QuestionnaireEditModal from './QuestionnaireEditModal'
import AssignmentModal from './AssignmentModal'
import QuestionManagerModal from './QuestionManagerModal'
import TemplateSelector from './TemplateSelector'

interface Props {
  tenantId: string
  appRole: string
  initialData: QuestionnaireListItem[]
  templates: QuestionnaireListItem[]
}

const STATUS_LABEL: Record<
  string,
  { label: string; variant: 'primary' | 'teal' | 'orange' | 'neutral' }
> = {
  draft: { label: '下書き', variant: 'neutral' },
  active: { label: '受付中', variant: 'teal' },
  closed: { label: '終了', variant: 'orange' },
}

const CREATOR_LABEL: Record<CreatorType, string> = {
  system: 'システム',
  tenant: '自社',
}

export default function QuestionnaireListClient({
  tenantId,
  appRole,
  initialData,
  templates,
}: Props) {
  const [data, setData] = useState<QuestionnaireListItem[]>(initialData)
  const [activeTab, setActiveTab] = useState<'template' | 'list'>('template')
  const [showForm, setShowForm] = useState(false)
  const [formCreatorType, setFormCreatorType] = useState<CreatorType>('tenant')
  const [assignTarget, setAssignTarget] = useState<QuestionnaireListItem | null>(null)
  const [editTarget, setEditTarget] = useState<QuestionnaireListItem | null>(null)
  const [designTarget, setDesignTarget] = useState<QuestionnaireListItem | null>(null)
  const [isPending, startTransition] = useTransition()

  const isDeveloper = appRole === 'developer'

  // 自社作成アンケートのみ表示
  const filtered = data.filter(q => q.creator_type === 'tenant')

  // テンプレートコピー後にデータを更新するコールバック
  async function handleTemplateCreated() {
    startTransition(async () => {
      const res = await fetchQuestionnairesForClient(tenantId)
      if (res.success && res.data) {
        setData(res.data)
        // アンケート一覧タブに自動切り替え
        setActiveTab('list')
      }
    })
  }

  function openCreate(creatorType: CreatorType) {
    setFormCreatorType(creatorType)
    setShowForm(true)
  }

  function handleCreated(item: QuestionnaireListItem) {
    setData(prev => [item, ...prev])
    setShowForm(false)
  }

  function handleStatusChange(id: string, status: 'draft' | 'active' | 'closed') {
    // 公開時は確認を取る
    if (status === 'active') {
      const confirmed = confirm(
        '【重要】アンケートを公開すると、以下の制限が適用されます。\n\n' +
          '• 公開後は設問の編集・削除ができません\n' +
          '• タイトルと説明文のみ変更可能\n' +
          '• 変更したい場合は「終了」→「削除」して再作成が必要\n\n' +
          '公開してもよろしいですか？'
      )
      if (!confirmed) return
    }

    startTransition(async () => {
      const res = await changeQuestionnaireStatus(id, status)
      if (res.success) {
        setData(prev => prev.map(q => (q.id === id ? { ...q, status } : q)))
      } else {
        alert(res.error ?? 'ステータス変更に失敗しました。')
      }
    })
  }

  function handleDelete(id: string, status: string) {
    const msg =
      status === 'active'
        ? '【重要】受付中のアンケートを削除しようとしています。\n\n' +
          '• 削除されたアンケートは復元できません\n' +
          '• アサイン済みの従業員の回答結果も削除されます\n\n' +
          'このアンケートを削除してもよろしいですか？'
        : '【確認】アンケートを削除しようとしています。\n\n' +
          '• 削除されたアンケートは復元できません\n' +
          '• この操作は取り消せません\n\n' +
          'このアンケートを削除してもよろしいですか？'
    if (!confirm(msg)) return
    startTransition(async () => {
      const res = await deleteQuestionnaire(id)
      if (res.success) {
        setData(prev => prev.filter(q => q.id !== id))
      } else {
        alert(res.error ?? '削除に失敗しました。')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-bold text-neutral-800">アンケート管理</h1>
        {isDeveloper && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => openCreate('system')}>
              ＋ システム作成
            </Button>
            <Button variant="primary" size="sm" onClick={() => openCreate('tenant')}>
              ＋ アンケートを作成
            </Button>
          </div>
        )}
        {!isDeveloper && (
          <Button variant="primary" size="sm" onClick={() => openCreate('tenant')}>
            ＋ アンケートを作成
          </Button>
        )}
      </div>

      {/* タブナビゲーション */}
      <div className="flex gap-1 border-b border-neutral-200">
        <button
          onClick={() => setActiveTab('template')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'template'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          📋 テンプレート選択
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'list'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          📝 アンケート一覧
        </button>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'template' && (
        <div className="py-4">
          {templates.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-8">
              利用可能なテンプレートはありません。
            </p>
          ) : (
            <TemplateSelector
              templates={templates}
              tenantId={tenantId}
              onCreated={handleTemplateCreated}
            />
          )}
        </div>
      )}

      {activeTab === 'list' && (
        <div className="py-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-neutral-400 py-8 text-center">
              アンケートはありません。テンプレートからコピーするか、新規作成してください。
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-neutral-600 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">タイトル</th>
                    <th className="px-4 py-3 font-medium">ステータス</th>
                    <th className="px-4 py-3 font-medium text-right">設問数</th>
                    <th className="px-4 py-3 font-medium text-right">対象 / 提出</th>
                    <th className="px-4 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filtered.map(q => {
                    const statusInfo = STATUS_LABEL[q.status] ?? STATUS_LABEL.draft
                    return (
                      <tr key={q.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-neutral-800 max-w-xs truncate">
                          {q.title}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-600">
                          {q.question_count}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-600">
                          {q.assignment_count} / {q.submitted_count}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {/* 編集（draft） */}
                            {q.status === 'draft' && (
                              <Button variant="outline" size="sm" onClick={() => setEditTarget(q)}>
                                編集
                              </Button>
                            )}
                            {/* デザイン（draft） */}
                            {q.status === 'draft' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setDesignTarget(q)}
                              >
                                デザイン
                              </Button>
                            )}
                            {/* 公開（draft） */}
                            {q.status === 'draft' && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleStatusChange(q.id, 'active')}
                                disabled={isPending}
                              >
                                公開
                              </Button>
                            )}
                            {/* 終了（active） */}
                            {q.status === 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(q.id, 'closed')}
                                disabled={isPending}
                              >
                                終了
                              </Button>
                            )}
                            {/* 下書きに戻す（closed） */}
                            {q.status === 'closed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(q.id, 'draft')}
                                disabled={isPending}
                              >
                                下書きに戻す
                              </Button>
                            )}
                            {/* アサイン（active） */}
                            {q.status === 'active' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setAssignTarget(q)}
                              >
                                アサイン
                              </Button>
                            )}
                            {/* 削除（draft|closed） */}
                            {(q.status === 'draft' || q.status === 'closed') && (
                              <Button
                                variant="warning"
                                size="sm"
                                onClick={() => handleDelete(q.id, q.status)}
                                disabled={isPending}
                              >
                                削除
                              </Button>
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
        </div>
      )}

      {/* アンケート作成モーダル */}
      {showForm && (
        <QuestionnaireFormModal
          creatorType={formCreatorType}
          tenantId={tenantId}
          onCreated={handleCreated}
          onClose={() => setShowForm(false)}
        />
      )}
      {/* 編集モーダル */}
      {editTarget && (
        <QuestionnaireEditModal
          questionnaire={editTarget}
          onUpdated={updated => {
            setData(prev => prev.map(q => (q.id === editTarget.id ? { ...q, ...updated } : q)))
          }}
          onClose={() => setEditTarget(null)}
        />
      )}
      {/* アサインモーダル */}
      {assignTarget && (
        <AssignmentModal
          questionnaire={assignTarget}
          tenantId={tenantId}
          onClose={() => setAssignTarget(null)}
        />
      )}
      {/* 設問管理モーダル */}
      {designTarget && (
        <QuestionManagerModal questionnaire={designTarget} onClose={() => setDesignTarget(null)} />
      )}
    </div>
  )
}
