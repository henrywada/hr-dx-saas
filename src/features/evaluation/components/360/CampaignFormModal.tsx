'use client'

import { useState, useTransition } from 'react'
import { createCampaign, updateCampaign } from '@/features/evaluation/360-actions'
import type { Review360Campaign, CampaignFormInput } from '@/features/evaluation/360-types'

interface Props {
  campaign?: Review360Campaign
  onClose: () => void
}

const EMPTY: CampaignFormInput = {
  name: '',
  description: '',
  period_id: '',
  deadline: '',
  is_anonymous: false,
}

export function CampaignFormModal({ campaign, onClose }: Props) {
  const isEdit = !!campaign
  const [form, setForm] = useState<CampaignFormInput>(
    isEdit
      ? {
          name: campaign.name,
          description: campaign.description ?? '',
          period_id: campaign.period_id ?? '',
          deadline: campaign.deadline,
          is_anonymous: campaign.is_anonymous,
        }
      : EMPTY
  )
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleChange(key: keyof CampaignFormInput, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    if (!form.name.trim()) { setError('キャンペーン名は必須です'); return }
    if (!form.deadline) { setError('回答期限は必須です'); return }
    setError('')
    startTransition(async () => {
      const result = isEdit
        ? await updateCampaign(campaign.id, form)
        : await createCampaign(form)
      if (result.success === false) { setError(result.error); return }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#24292f]">
          {isEdit ? 'キャンペーンを編集' : '新規キャンペーン作成'}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#24292f] mb-1">
              キャンペーン名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              className="w-full border border-[#e2e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="例：2026年上期 管理職360度評価"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#24292f] mb-1">説明</label>
            <textarea
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              rows={3}
              className="w-full border border-[#e2e6ec] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="任意のメモ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#24292f] mb-1">
              回答期限 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.deadline}
              onChange={e => handleChange('deadline', e.target.value)}
              className="w-full border border-[#e2e6ec] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_anonymous"
              checked={form.is_anonymous}
              onChange={e => handleChange('is_anonymous', e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <label htmlFor="is_anonymous" className="text-sm text-[#24292f]">
              匿名回答オプションを有効にする
            </label>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-[#e2e6ec] rounded-lg hover:bg-[#f6f8fa]"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? '保存中…' : isEdit ? '更新する' : '作成する'}
          </button>
        </div>
      </div>
    </div>
  )
}
