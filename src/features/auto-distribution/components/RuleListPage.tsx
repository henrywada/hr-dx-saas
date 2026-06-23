'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, History } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import type { AutoDistributionRule } from '../types'
import { DAY_OF_WEEK_LABELS } from '../types'
import { deleteAutoDistributionRule, fetchRuleHistory } from '../actions'
import { RuleFormDialog } from './RuleFormDialog'
import { RuleHistoryDrawer } from './RuleHistoryDrawer'
import { TestRunButton } from './TestRunButton'

interface RuleListPageProps {
  rules: AutoDistributionRule[]
}

function formatSchedule(rule: AutoDistributionRule): string {
  if (rule.schedule_type === 'weekly') {
    return `毎週${DAY_OF_WEEK_LABELS[rule.schedule_day_of_week ?? 0]}曜日 4:00`
  }
  return `毎月${rule.schedule_day_of_month}日 4:00`
}

export function RuleListPage({ rules }: RuleListPageProps) {
  const [isPending, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AutoDistributionRule | null>(null)
  const [historyRule, setHistoryRule] = useState<AutoDistributionRule | null>(null)

  const handleDelete = (rule: AutoDistributionRule) => {
    if (!window.confirm(`「${rule.name}」を削除します。よろしいですか？`)) return
    startTransition(async () => {
      await deleteAutoDistributionRule(rule.id)
    })
  }

  const columns: Column<AutoDistributionRule>[] = [
    { key: 'name', label: 'ルール名', sortable: true },
    {
      key: 'search_theme',
      label: '検索テーマ',
      render: value => <span className="line-clamp-1 max-w-xs">{String(value)}</span>,
    },
    {
      key: 'schedule_type',
      label: '配信周期',
      render: (_value, item) => formatSchedule(item),
    },
    {
      key: 'recipient_emails',
      label: '配信先',
      render: value => `${(value as string[]).length} 件`,
    },
    {
      key: 'is_active',
      label: '状態',
      render: value => (
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            value ? 'bg-green-50 text-green-700' : 'bg-[#f6f8fa] text-[#57606a]'
          }`}
        >
          {value ? '有効' : '無効'}
        </span>
      ),
    },
    {
      key: 'id',
      label: '操作',
      render: (_value, item) => (
        <div className="flex items-center justify-end gap-2">
          <TestRunButton ruleId={item.id} />
          <button
            type="button"
            onClick={() => setHistoryRule(item)}
            className="p-1.5 rounded-lg hover:bg-[#f6f8fa] text-[#57606a]"
            title="実行履歴"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingRule(item)
              setFormOpen(true)
            }}
            className="p-1.5 rounded-lg hover:bg-[#f6f8fa] text-[#57606a]"
            title="編集"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(item)}
            disabled={isPending}
            className="p-1.5 rounded-lg hover:bg-red-50 text-[#57606a] hover:text-red-600 disabled:opacity-50"
            title="削除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      width: 'w-64',
    },
  ]

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#24292f]">自動配信ルールの設定</h1>
          <p className="text-sm text-[#57606a]">
            指定テーマでWebを定期検索し、AIが要約・意見を生成してメールへ自動配信します。
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingRule(null)
            setFormOpen(true)
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#FD7601] rounded-lg hover:bg-[#FD7601] transition-colors"
        >
          <Plus className="w-4 h-4" />
          新規ルール
        </button>
      </div>

      <DataTable
        columns={columns}
        data={rules}
        searchable
        searchPlaceholder="ルール名で検索..."
        searchKey="name"
        getRowId={item => item.id}
      />

      <RuleFormDialog open={formOpen} onClose={() => setFormOpen(false)} rule={editingRule} />
      <RuleHistoryDrawer
        open={historyRule !== null}
        onClose={() => setHistoryRule(null)}
        rule={historyRule}
        fetchLogs={fetchRuleHistory}
      />
    </div>
  )
}
