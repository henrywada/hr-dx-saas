'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { registerImprovementPlan } from '@/features/adm/ai-workplace-improvement/actions'
import type { AIProposal } from '@/features/adm/ai-workplace-improvement/actions'

interface ImprovementPlanFormProps {
  open: boolean
  proposal: AIProposal | null
  onClose: () => void
  onRegistered: () => void
}

/**
 * 職場改善計画 登録モーダル
 *
 * 期待効果の編集・3ヶ月後フォロー設定チェックボックス
 */
export default function ImprovementPlanForm({
  open,
  proposal,
  onClose,
  onRegistered,
}: ImprovementPlanFormProps) {
  const [setFollowUp, setSetFollowUp] = useState(true)
  const [expectedEffect, setExpectedEffect] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open && proposal) {
      setExpectedEffect(proposal.expected_effect || '')
      setSetFollowUp(true)
      setError(null)
    }
  }, [open, proposal])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!proposal) return
    setError(null)

    startTransition(async () => {
      const result = await registerImprovementPlan(
        { ...proposal, expected_effect: expectedEffect.trim() || proposal.expected_effect },
        { setFollowUp }
      )
      if (result.success) {
        onRegistered()
      } else {
        setError(result.error || '登録に失敗しました。')
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-lg font-bold text-slate-900">
            職場改善計画を登録
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {proposal && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">
                提案タイトル
              </p>
              <p className="text-slate-900 font-semibold">
                {proposal.ai_generated_title}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                期待効果（任意・編集可）
              </label>
              <textarea
                value={expectedEffect}
                onChange={(e) => setExpectedEffect(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                placeholder="例：メンバーの心理的安全性向上、業務負荷の適正化"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={setFollowUp}
                onChange={(e) => setSetFollowUp(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">
                3ヶ月後自動フォロー調査を設定する
              </span>
            </label>
            <p className="text-xs text-slate-500 -mt-2 ml-7">
              登録日から3ヶ月後にフォロー日が設定され、効果測定が可能になります。
            </p>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={onClose} type="button">
                キャンセル
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={isPending}
              >
                {isPending ? '登録中...' : '登録する'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
