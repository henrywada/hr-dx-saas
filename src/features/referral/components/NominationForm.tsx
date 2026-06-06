'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { createNomination } from '../actions'
import type { ReferralPosting } from '../types'

interface NominationFormProps {
  posting: ReferralPosting
  onClose: () => void
  onSuccess: () => void
}

/** 知人推薦フォーム（従業員向けモーダル） */
export function NominationForm({ posting, onClose, onSuccess }: NominationFormProps) {
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // フォーム送信ハンドラ
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)

    const form = e.currentTarget
    const data = new FormData(form)

    const nomineeName = (data.get('nominee_name') as string).trim()
    if (!nomineeName) {
      setErrorMessage('候補者名は必須です。')
      return
    }

    startTransition(async () => {
      const result = await createNomination({
        referral_posting_id: posting.id,
        nominee_name: nomineeName,
        nominee_email: (data.get('nominee_email') as string).trim() || undefined,
        nominee_phone: (data.get('nominee_phone') as string).trim() || undefined,
        relationship: (data.get('relationship') as string) || undefined,
        nomination_reason: (data.get('nomination_reason') as string).trim() || undefined,
      })

      if (result.success) {
        onSuccess()
      } else {
        setErrorMessage(result.error ?? '推薦の登録に失敗しました。')
      }
    })
  }

  return (
    // オーバーレイ
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-lg">
        {/* ヘッダー */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">推薦フォーム</h2>
            <p className="mt-0.5 text-xs text-slate-500">求人: {posting.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* フォーム本体 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 候補者名（必須） */}
          <div>
            <label htmlFor="nominee_name" className="block text-sm font-medium text-slate-700 mb-1">
              候補者名 <span className="text-red-500">*</span>
            </label>
            <input
              id="nominee_name"
              name="nominee_name"
              type="text"
              required
              placeholder="山田 太郎"
              className="border border-slate-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* メールアドレス（任意） */}
          <div>
            <label
              htmlFor="nominee_email"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              メールアドレス <span className="text-slate-400 text-xs font-normal">任意</span>
            </label>
            <input
              id="nominee_email"
              name="nominee_email"
              type="email"
              placeholder="taro.yamada@example.com"
              className="border border-slate-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* 電話番号（任意） */}
          <div>
            <label
              htmlFor="nominee_phone"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              電話番号 <span className="text-slate-400 text-xs font-normal">任意</span>
            </label>
            <input
              id="nominee_phone"
              name="nominee_phone"
              type="text"
              placeholder="090-0000-0000"
              className="border border-slate-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* 関係性（任意） */}
          <div>
            <label htmlFor="relationship" className="block text-sm font-medium text-slate-700 mb-1">
              関係性 <span className="text-slate-400 text-xs font-normal">任意</span>
            </label>
            <select
              id="relationship"
              name="relationship"
              className="border border-slate-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            >
              <option value="">選択してください</option>
              <option value="元同僚">元同僚</option>
              <option value="友人">友人</option>
              <option value="知人">知人</option>
              <option value="その他">その他</option>
            </select>
          </div>

          {/* 推薦理由（任意） */}
          <div>
            <label
              htmlFor="nomination_reason"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              推薦理由 <span className="text-slate-400 text-xs font-normal">任意</span>
            </label>
            <textarea
              id="nomination_reason"
              name="nomination_reason"
              rows={3}
              placeholder="候補者の強みや推薦理由をご記入ください"
              className="border border-slate-300 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* エラーメッセージ */}
          {errorMessage && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{errorMessage}</p>
          )}

          {/* アクションボタン */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
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
              {isPending ? '送信中...' : '推薦する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
