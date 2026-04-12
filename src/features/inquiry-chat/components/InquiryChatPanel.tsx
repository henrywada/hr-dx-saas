'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { sendInquiryMessage, type InquiryCitation } from '../actions'
import { cn } from '@/lib/utils'

type Variant = 'page' | 'modal'

type Props = {
  variant?: Variant
}

export function InquiryChatPanel({ variant = 'page' }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answer, setAnswer] = useState<string | null>(null)
  const [citations, setCitations] = useState<InquiryCitation[]>([])

  const isModal = variant === 'modal'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return
    setLoading(true)
    setError(null)
    setAnswer(null)
    setCitations([])
    const res = await sendInquiryMessage({ sessionId, message: input.trim() })
    setLoading(false)
    if (res.ok === false) {
      setError(res.error)
      return
    }
    setSessionId(res.sessionId)
    setAnswer(res.answer)
    setCitations(res.citations)
    setInput('')
  }

  function onNewSession() {
    setSessionId(null)
    setAnswer(null)
    setCitations([])
    setError(null)
    setInput('')
  }

  return (
    <div
      className={cn(
        'space-y-6',
        !isModal && 'max-w-3xl mx-auto',
        isModal && 'space-y-4',
      )}
    >
      <div
        className={cn(
          'rounded-xl border border-amber-200 bg-amber-50/80 text-sm text-amber-950',
          isModal ? 'p-3' : 'p-4',
        )}
      >
        <p className="font-semibold mb-1">社内情報の取り扱いについて</p>
        <p>
          回答は登録された制度文書に基づきます。内容の最終確認は人事担当までお問い合わせください。AI
          の解釈ミスがある場合があります。
        </p>
      </div>

      {answer && (
        <div
          className={cn(
            'rounded-xl border border-slate-200 bg-white shadow-sm space-y-3',
            isModal ? 'p-4' : 'p-5',
          )}
        >
          <h2 className="text-sm font-semibold text-slate-500">回答</h2>
          <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-800 text-sm">{answer}</div>
          {citations.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-2">参照した資料</p>
              <ul className="space-y-2">
                {citations.map((c, i) => (
                  <li key={i} className="text-sm text-slate-600">
                    <span className="font-medium text-slate-800">{c.title}</span>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{c.snippet}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">質問を入力</label>
        <textarea
          className={cn(
            'w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            isModal ? 'min-h-[88px] text-sm' : 'min-h-[120px]',
          )}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="例：有給休暇の申請期限はいつまでですか？"
          disabled={loading}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div
          className={cn(
            'flex flex-col gap-3',
            answer && 'sm:flex-row sm:items-start sm:justify-between sm:gap-6',
          )}
        >
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !input.trim()}
            className={cn(!answer && 'w-full sm:w-auto')}
          >
            {loading ? '回答を生成中…' : '送信'}
          </Button>
          {answer && (
            <div className="flex flex-col gap-2 sm:max-w-[min(100%,18rem)] sm:shrink-0 sm:items-end sm:text-right">
              <p className="text-xs text-slate-600 leading-snug">
                続きは上に入力して「送信」。別の話題はこのボタンで回答を消してから入力してください。
              </p>
              <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={onNewSession}>
                新質問の展開
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
