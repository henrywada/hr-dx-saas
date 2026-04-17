'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { QuestionnaireListItem } from '../types'
import { copyQuestionnareTemplate } from '../actions'

interface Props {
  templates: QuestionnaireListItem[]
}

export default function TemplateSelector({ templates }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  function handleCopy(templateId: string) {
    if (!confirm('このテンプレートを自社版としてコピーしますか？')) return

    startTransition(async () => {
      const res = await copyQuestionnareTemplate(templateId)
      if (res.success) {
        alert('テンプレートを自社版にコピーしました。')
        setSelectedTemplateId(null)
        // ページをリフレッシュして新しいアンケートを表示
        router.refresh()
      } else {
        alert(`エラー: ${res.error}`)
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
              <Badge variant="primary" className="flex-shrink-0">
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
              <Button
                variant="secondary"
                size="sm"
                onClick={e => {
                  e.stopPropagation()
                  handleCopy(template.id)
                }}
                disabled={isPending}
                className="flex-shrink-0 whitespace-nowrap"
              >
                {isPending ? 'コピー中...' : 'コピー'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
