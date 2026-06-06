'use client'

import { useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { createReferralPosting } from '@/features/referral/actions'
import type { ReferralPosting, UpsertReferralPostingInput } from '@/features/referral/types'
import { EMPLOYMENT_TYPE_LABELS } from '@/features/referral/types'
import { ReferralPostingCard } from '@/features/referral/components/ReferralPostingCard'

interface PostingsPageClientProps {
  postings: (ReferralPosting & { nomination_count: number })[]
}

/** 求人管理ページ クライアント側：モーダル開閉 + 新規作成フォーム */
export function PostingsPageClient({ postings }: PostingsPageClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 新規求人作成フォーム送信
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)

    const form = e.currentTarget
    const data = new FormData(form)

    const title = (data.get('title') as string).trim()
    if (!title) {
      setErrorMessage('求人タイトルは必須です。')
      return
    }

    const rewardAmountRaw = parseInt(data.get('reward_amount') as string, 10)
    const rewardAmount = isNaN(rewardAmountRaw) ? 0 : rewardAmountRaw

    const input: UpsertReferralPostingInput = {
      job_posting_id: null,
      title,
      description: (data.get('description') as string).trim() || null,
      department: (data.get('department') as string).trim() || null,
      employment_type: (data.get('employment_type') as UpsertReferralPostingInput['employment_type']) || null,
      reward_amount: rewardAmount,
      reward_condition: (data.get('reward_condition') as string).trim() || null,
      is_active: data.get('is_active') === 'on',
      deadline: (data.get('deadline') as string) || null,
    }

    startTransition(async () => {
      const result = await createReferralPosting(input)
      if (result.success) {
        setIsModalOpen(false)
      } else {
        setErrorMessage(result.error ?? '求人の作成に失敗しました。')
      }
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* ページヘッダー */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">リファラル求人管理</h1>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          新規求人追加
        </button>
      </div>

      {/* 求人カードグリッド */}
      {postings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-slate-400 text-sm">リファラル求人がまだ登録されていません</p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-4 text-sm text-primary hover:underline"
          >
            最初の求人を追加する
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {postings.map((posting) => (
            <ReferralPostingCard
              key={posting.id}
              posting={posting}
              showToggle={true}
            />
          ))}
        </div>
      )}

      {/* 新規求人作成モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-lg max-h-[90vh] overflow-y-auto">
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="text-base font-bold text-slate-900">新規リファラル求人</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="閉じる"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* フォーム */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* タイトル（必須） */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                  求人タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  placeholder="例: エンジニア（バックエンド）"
                  className="border border-slate-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* 説明 */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                  求人説明 <span className="text-slate-400 text-xs font-normal">任意</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="業務内容・求めるスキル等"
                  className="border border-slate-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* 部署 */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-slate-700 mb-1">
                  部署 <span className="text-slate-400 text-xs font-normal">任意</span>
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  placeholder="例: 開発部"
                  className="border border-slate-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* 雇用形態 */}
              <div>
                <label htmlFor="employment_type" className="block text-sm font-medium text-slate-700 mb-1">
                  雇用形態 <span className="text-slate-400 text-xs font-normal">任意</span>
                </label>
                <select
                  id="employment_type"
                  name="employment_type"
                  className="border border-slate-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                >
                  <option value="">選択してください</option>
                  {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* 報奨金額 */}
              <div>
                <label htmlFor="reward_amount" className="block text-sm font-medium text-slate-700 mb-1">
                  報奨金額（円）
                </label>
                <input
                  id="reward_amount"
                  name="reward_amount"
                  type="number"
                  min={0}
                  step={1000}
                  defaultValue={50000}
                  className="border border-slate-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* 報奨金条件 */}
              <div>
                <label htmlFor="reward_condition" className="block text-sm font-medium text-slate-700 mb-1">
                  報奨金支払い条件 <span className="text-slate-400 text-xs font-normal">任意</span>
                </label>
                <input
                  id="reward_condition"
                  name="reward_condition"
                  type="text"
                  placeholder="例: 入社3ヶ月後に支払い"
                  className="border border-slate-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* 応募締切 */}
              <div>
                <label htmlFor="deadline" className="block text-sm font-medium text-slate-700 mb-1">
                  応募締切 <span className="text-slate-400 text-xs font-normal">任意</span>
                </label>
                <input
                  id="deadline"
                  name="deadline"
                  type="date"
                  className="border border-slate-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* 公開設定 */}
              <div className="flex items-center gap-2">
                <input
                  id="is_active"
                  name="is_active"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-slate-300 accent-primary"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                  公開する（従業員に表示する）
                </label>
              </div>

              {/* エラーメッセージ */}
              {errorMessage && (
                <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                  {errorMessage}
                </p>
              )}

              {/* ボタン */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isPending ? '作成中...' : '求人を作成する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
