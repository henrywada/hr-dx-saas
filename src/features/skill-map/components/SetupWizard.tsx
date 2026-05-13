'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GlobalSkillTemplate } from '../types'
import { copyTemplateToTenant } from '../actions'
import { APP_ROUTES } from '@/config/routes'

type Props = { templates: GlobalSkillTemplate[] }

const INDUSTRY_LABELS: Record<string, string> = {
  manufacturing: '製造業',
  it: 'ITエンジニア',
}

export function SetupWizard({ templates }: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleApply() {
    if (!selectedId) return
    if (selectedId === 'custom') {
      router.push(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
      return
    }
    setPending(true)
    setError(null)
    try {
      const result = await copyTemplateToTenant(selectedId)
      if (result.success) {
        router.push(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
      } else {
        setError(result.error ?? '不明なエラー')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '不明なエラーが発生しました')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">業種テンプレートを選択</h2>
        <p className="text-sm text-gray-500">選択したテンプレートのスキル項目をコピーします。後から自由に編集できます。</p>
      </div>
      <div className="space-y-3">
        {templates.map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => setSelectedId(tmpl.id)}
            className={`w-full text-left border-2 rounded-lg p-4 transition-colors ${
              selectedId === tmpl.id ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium">{INDUSTRY_LABELS[tmpl.industry_type] ?? tmpl.industry_type}</div>
            <div className="text-sm text-gray-500 mt-1">{tmpl.description}</div>
          </button>
        ))}
        <button
          onClick={() => setSelectedId('custom')}
          className={`w-full text-left border-2 rounded-lg p-4 transition-colors ${
            selectedId === 'custom' ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="font-medium">カスタム（ゼロから作成）</div>
          <div className="text-sm text-gray-500 mt-1">スキル項目を最初から自分で定義します</div>
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleApply}
        disabled={!selectedId || pending}
        className="w-full bg-primary text-white py-2 rounded-lg disabled:opacity-40 hover:bg-primary/90 transition-colors"
      >
        {pending ? '設定中...' : 'このテンプレートで始める'}
      </button>
    </div>
  )
}
