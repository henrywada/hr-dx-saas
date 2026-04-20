'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type {
  QuestionnaireDetail,
  QuestionnaireListItem,
  QuestionType,
  QuestionWithDetails,
} from '../types'
import { copyQuestionnareTemplate, deleteQuestionnaire, getQuestionnaireDetailAction } from '../actions'

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  radio: '単一選択',
  checkbox: '複数選択',
  rating_table: '評価表',
  text: '自由記述',
}

function normalizeScaleLabels(raw: unknown): string[] | null {
  if (raw == null) return null
  if (Array.isArray(raw)) return raw as string[]
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw) as unknown
      return Array.isArray(p) ? (p as string[]) : null
    } catch {
      return null
    }
  }
  return null
}

function groupQuestionsBySection(detail: QuestionnaireDetail) {
  const sectionOrder = [...detail.sections].sort((a, b) => a.sort_order - b.sort_order)
  const qs = [...detail.questions].sort((a, b) => a.sort_order - b.sort_order)
  const used = new Set<string>()
  const blocks: { sectionTitle: string | null; questions: QuestionWithDetails[] }[] = []

  for (const sec of sectionOrder) {
    const sub = qs.filter(q => q.section_id === sec.id)
    sub.forEach(q => used.add(q.id))
    if (sub.length > 0) blocks.push({ sectionTitle: sec.title, questions: sub })
  }

  const orphan = qs.filter(q => !used.has(q.id))
  if (orphan.length > 0) blocks.push({ sectionTitle: null, questions: orphan })

  return blocks
}

function QuestionPreviewBlock({ q }: { q: QuestionWithDetails }) {
  const scaleLabels = normalizeScaleLabels(q.scale_labels)

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
          {QUESTION_TYPE_LABEL[q.question_type]}
        </span>
        {q.is_required ? (
          <span className="text-xs text-red-600">必須</span>
        ) : (
          <span className="text-xs text-neutral-400">任意</span>
        )}
      </div>
      <p className="whitespace-pre-wrap text-neutral-800">{q.question_text}</p>

      {q.question_type === 'rating_table' && scaleLabels && scaleLabels.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-xs font-medium text-neutral-500">評価軸（5段階）</p>
          <div className="flex flex-wrap gap-1">
            {scaleLabels.map((label, i) => (
              <span
                key={i}
                className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs text-neutral-700"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {q.question_type === 'rating_table' && q.items.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-xs font-medium text-neutral-500">評価項目</p>
          <ul className="list-inside list-disc text-xs text-neutral-700">
            {q.items
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(it => (
                <li key={it.id}>{it.item_text}</li>
              ))}
          </ul>
        </div>
      )}

      {(q.question_type === 'radio' || q.question_type === 'checkbox') && q.options.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-xs font-medium text-neutral-500">選択肢</p>
          <ul className="space-y-0.5 text-xs text-neutral-700">
            {q.options
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(o => (
                <li key={o.id} className="flex gap-1.5">
                  <span className="text-neutral-400">{q.question_type === 'radio' ? '○' : '□'}</span>
                  <span>{o.option_text}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {q.question_type === 'text' && (
        <p className="mt-2 text-xs text-neutral-500">（回答者が自由に記入します）</p>
      )}
    </div>
  )
}

interface Props {
  templates: QuestionnaireListItem[]
  tenantId: string
  onCreated: () => Promise<void>
  /** app_role='developer' のときに削除ボタンを表示する */
  canDelete?: boolean
  /** 削除成功時の親コンポーネント側への通知（ローカルstateから除去する等） */
  onDeleted?: (templateId: string) => void
}

export default function TemplateSelector({
  templates,
  onCreated,
  canDelete = false,
  onDeleted,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    template: QuestionnaireListItem | null
    detail: QuestionnaireDetail | null
    loading: boolean
    error: string | null
  }>({ template: null, detail: null, loading: false, error: null })

  function closePreview() {
    setPreview({ template: null, detail: null, loading: false, error: null })
  }

  async function openPreview(template: QuestionnaireListItem) {
    setPreview({ template, detail: null, loading: true, error: null })
    const res = await getQuestionnaireDetailAction(template.id)
    if (res.success && res.data) {
      setPreview(prev => ({
        ...prev,
        loading: false,
        detail: res.data as QuestionnaireDetail,
        error: null,
      }))
    } else {
      setPreview(prev => ({
        ...prev,
        loading: false,
        error: res.error ?? '設問の取得に失敗しました。',
      }))
    }
  }

  function handleCopy(templateId: string) {
    if (!confirm('このテンプレートを自社版としてコピーしますか？')) return

    startTransition(async () => {
      const res = await copyQuestionnareTemplate(templateId)
      if (res.success) {
        alert('テンプレートを自社版にコピーしました。')
        setSelectedTemplateId(null)
        // コールバック実行：親コンポーネントでデータを更新
        await onCreated()
      } else {
        alert(`エラー: ${res.error}`)
      }
    })
  }

  function handleDelete(template: QuestionnaireListItem) {
    const msg =
      '【重要】システムテンプレートを削除しようとしています。\n\n' +
      `タイトル: ${template.title}\n\n` +
      '• 削除されたテンプレートは復元できません\n' +
      '• 設問・選択肢も連動して削除されます\n' +
      '• 既にコピー済みの自社版アンケートは影響を受けません\n\n' +
      'このテンプレートを削除してもよろしいですか？'
    if (!confirm(msg)) return

    startTransition(async () => {
      const res = await deleteQuestionnaire(template.id)
      if (res.success) {
        onDeleted?.(template.id)
        if (selectedTemplateId === template.id) {
          setSelectedTemplateId(null)
        }
      } else {
        alert(`削除に失敗しました: ${res.error}`)
      }
    })
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <p className="text-neutral-400 text-sm">利用可能なテンプレートはありません。</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-neutral-700">テンプレートを選択してコピー</h3>
      <div className="space-y-2">
        {templates.map(template => (
          <div
            key={template.id}
            className={`border rounded-lg p-3 cursor-pointer transition-all ${
              selectedTemplateId === template.id
                ? 'border-primary bg-primary/5'
                : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
            }`}
            onClick={() => setSelectedTemplateId(template.id)}
          >
            {/* タイトル + バッジ */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="font-medium text-neutral-800 text-sm flex-1 truncate">
                {template.title}
              </h4>
              <Badge variant="primary" className="shrink-0">
                {template.question_count}設問
              </Badge>
            </div>

            {/* 説明文 + ボタン */}
            <div className="flex items-start justify-between gap-2">
              {template.description && (
                <p className="text-xs text-neutral-500 line-clamp-2 flex-1">
                  {template.description}
                </p>
              )}
              <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation()
                    openPreview(template)
                  }}
                  disabled={isPending}
                  className="whitespace-nowrap"
                >
                  設問を見る
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation()
                    handleCopy(template.id)
                  }}
                  disabled={isPending}
                  className="whitespace-nowrap bg-emerald-50! text-emerald-700! border-emerald-200! hover:bg-emerald-100! hover:border-emerald-300! hover:text-emerald-800!"
                >
                  {isPending ? 'コピー中...' : 'コピー'}
                </Button>
                {canDelete && (
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation()
                      handleDelete(template)
                    }}
                    disabled={isPending}
                    className="whitespace-nowrap"
                  >
                    削除
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {preview.template && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="template-preview-title"
          onClick={closePreview}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="border-b border-neutral-200 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 id="template-preview-title" className="text-lg font-bold text-neutral-800">
                    設問プレビュー
                  </h2>
                  <p className="mt-1 text-sm font-medium text-neutral-800">{preview.template.title}</p>
                  {preview.template.description && (
                    <p className="mt-1 line-clamp-3 text-xs text-neutral-500">{preview.template.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closePreview}
                  className="shrink-0 rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
                  aria-label="閉じる"
                >
                  <X className="h-5 w-5" strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {preview.loading && <p className="text-sm text-neutral-500">読み込み中...</p>}
              {preview.error && <p className="text-sm text-red-600">{preview.error}</p>}
              {!preview.loading && !preview.error && preview.detail && (
                <div className="space-y-6">
                  {groupQuestionsBySection(preview.detail).map((block, bi) => (
                    <div key={bi}>
                      {block.sectionTitle != null && (
                        <h3 className="mb-2 text-sm font-semibold text-neutral-700">{block.sectionTitle}</h3>
                      )}
                      <div className="space-y-3">
                        {block.questions.map(q => (
                          <QuestionPreviewBlock key={q.id} q={q} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-neutral-200 px-5 py-3">
              <Button type="button" variant="outline" size="sm" onClick={closePreview} className="w-full sm:w-auto">
                閉じる
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
