'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, LayoutTemplate } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { APP_ROUTES } from '@/config/routes'
import type { QuestionnaireListItem, CreatorType } from '../types'
import {
  deleteQuestionnaire,
  changeQuestionnaireStatus,
  fetchQuestionnairesForClient,
} from '../actions'
import QuestionnaireFormModal from './QuestionnaireFormModal'
import QuestionnaireEditModal from './QuestionnaireEditModal'
import QuestionManagerModal from './QuestionManagerModal'
import TemplateSelector from './TemplateSelector'

interface Props {
  tenantId: string
  appRole: string
  initialData: QuestionnaireListItem[]
  templates: QuestionnaireListItem[]
}

function formatImplementationDateCell(q: QuestionnaireListItem): string {
  if (!q.has_ongoing_period_display) return '-'
  const s = q.ongoing_period_start_date
  const e = q.ongoing_period_end_date
  if (s && e) return `${s} ～ ${e}`
  if (s) return `${s} ～`
  if (e) return `～ ${e}`
  return '-'
}

function buildQuestionnaireColumns(params: {
  isPending: boolean
  router: ReturnType<typeof useRouter>
  setEditTarget: (q: QuestionnaireListItem) => void
  setDesignTarget: (q: QuestionnaireListItem) => void
  handleStatusChange: (id: string, status: 'draft' | 'active' | 'closed') => void
  handleDelete: (id: string, status: string) => void
}): Column<QuestionnaireListItem>[] {
  const { isPending, router, setEditTarget, setDesignTarget, handleStatusChange, handleDelete } =
    params

  return [
    {
      key: 'title',
      label: 'タイトル',
      sortable: true,
      render: value => (
        <span className="font-medium text-neutral-800 max-w-xs truncate block">{String(value)}</span>
      ),
    },
    {
      key: 'status',
      label: 'ステータス',
      render: (_value, q) =>
        q.has_ongoing_period_display ? (
          <Badge variant="teal">実施中</Badge>
        ) : (
          <span className="text-neutral-400">-</span>
        ),
    },
    {
      key: 'period_count',
      label: '実施期間数',
      sortable: true,
      render: value => <span className="text-neutral-600">{String(value)}</span>,
    },
    {
      key: 'ongoing_period_start_date',
      label: '実施日',
      render: (_value, q) => (
        <span className="text-neutral-600 whitespace-nowrap">
          {formatImplementationDateCell(q)}
        </span>
      ),
    },
    {
      key: 'id',
      label: '操作',
      width: 'w-64',
      render: (_value, q) => (
        <div className="flex gap-1.5 flex-wrap">
          {q.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={() => setEditTarget(q)}>
              タイトル編集
            </Button>
          )}
          {q.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDesignTarget(q)}
              className="bg-emerald-50! text-emerald-700! border-emerald-200! hover:bg-emerald-100! hover:border-emerald-300! hover:text-emerald-800!"
            >
              設問編集
            </Button>
          )}
          {q.status === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusChange(q.id, 'closed')}
              disabled={isPending}
            >
              終了
            </Button>
          )}
          {q.status === 'closed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusChange(q.id, 'draft')}
              disabled={isPending}
            >
              下書きに戻す
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(APP_ROUTES.TENANT.SURVEY_PERIODS(q.id))}
            className="bg-[#f6f8fa]! text-[#FD7601]! border-[#e2e6ec]! hover:bg-[#FD7601]-10! hover:border-[#e2e6ec]! hover:text-[#FD7601]!"
          >
            実施開始へ
          </Button>
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
      ),
    },
  ]
}

export default function QuestionnaireListClient({
  tenantId,
  appRole,
  initialData,
  templates: initialTemplates,
}: Props) {
  const router = useRouter()
  const [data, setData] = useState<QuestionnaireListItem[]>(initialData)
  const [templates, setTemplates] = useState<QuestionnaireListItem[]>(initialTemplates)
  const [activeTab, setActiveTab] = useState<'template' | 'list'>('list')
  const [showForm, setShowForm] = useState(false)
  const [formCreatorType, setFormCreatorType] = useState<CreatorType>('tenant')
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

  const questionnaireColumns = buildQuestionnaireColumns({
    isPending,
    router,
    setEditTarget,
    setDesignTarget,
    handleStatusChange,
    handleDelete,
  })

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#24292f] tracking-tight">アンケート管理</h1>
          <p className="text-sm text-[#57606a] mt-1">
            自社アンケートの作成・設問編集・実施期間の管理を行います。テンプレートからコピーして開始できます。
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
        {isDeveloper && (
          <>
            <Button variant="secondary" size="sm" onClick={() => openCreate('system')}>
              ＋ システム作成
            </Button>
            <Button variant="primary" size="sm" onClick={() => openCreate('tenant')}>
              ＋ 新規作成
            </Button>
          </>
        )}
        {!isDeveloper && (
          <Button variant="primary" size="sm" onClick={() => openCreate('tenant')}>
            ＋ 新規作成
          </Button>
        )}
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="flex gap-1 border-b border-neutral-200">
        <button
          onClick={() => setActiveTab('list')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'list'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          アンケート一覧
        </button>
        <button
          onClick={() => setActiveTab('template')}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'template'
              ? 'border-primary text-primary'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <LayoutTemplate className="w-4 h-4" />
          テンプレート選択
        </button>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'template' && (
        <div className="py-4">
          {templates.length === 0 ? (
            <div className="text-center py-12 px-4">
              <LayoutTemplate className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-sm font-medium text-neutral-600">利用可能なテンプレートはありません</p>
              <p className="text-xs text-neutral-400 mt-1">
                SaaS 管理者がシステムテンプレートを登録すると、ここからコピーできます。
              </p>
            </div>
          ) : (
            <TemplateSelector
              templates={templates}
              tenantId={tenantId}
              onCreated={handleTemplateCreated}
              canDelete={isDeveloper}
              onDeleted={(id: string) =>
                setTemplates(prev => prev.filter(t => t.id !== id))
              }
            />
          )}
        </div>
      )}

      {activeTab === 'list' && (
        <div className="py-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-sm font-medium text-neutral-600">アンケートはまだありません</p>
              <p className="text-xs text-neutral-400 mt-1">
                「テンプレート選択」タブからコピーするか、「新規作成」で最初のアンケートを作成してください。
              </p>
            </div>
          ) : (
            <DataTable
              columns={questionnaireColumns}
              data={filtered}
              searchable
              searchPlaceholder="タイトルで検索..."
              searchKey="title"
              getRowId={q => q.id}
            />
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
      {/* 設問管理モーダル */}
      {designTarget && (
        <QuestionManagerModal questionnaire={designTarget} onClose={() => setDesignTarget(null)} />
      )}
    </div>
  )
}
