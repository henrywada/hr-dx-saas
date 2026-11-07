'use client'

import React, { useState } from 'react'

import { Button } from '@/components/ui/Button'

import { DocumentListModal } from './DocumentListModal'
import { SourcePreviewModal } from './SourcePreviewModal'
import { askInfoBankAction } from '../ask-action'
import type { InfoBankAnswer, InfoBankHit, ModeUsed, SearchMode } from '../types'

const MODE_OPTIONS: { value: SearchMode; label: string; hint: string }[] = [
  { value: 'auto', label: '自動', hint: '資料の量に応じて最適な方式を選びます' },
  { value: 'text', label: 'テキスト検索', hint: 'キーワードが本文に含まれる箇所を探します' },
  {
    value: 'rag',
    label: 'RAG検索（高速）',
    hint: '意味の近さで探します。資料が多いときに向いています',
  },
]

const MODE_USED_LABEL: Record<ModeUsed, string> = {
  text: 'テキスト検索',
  rag: 'RAG検索',
  hybrid: 'テキスト検索 + RAG検索',
}

const EXAMPLE_QUESTIONS = ['育休の申請方法は？', '経費精算の期限は？', 'VPN の接続手順を教えて']
const EXCERPT_LENGTH = 160
const MAX_QUESTION_LENGTH = 300

/** 同じ資料から複数チャンクが引用された場合、出典は資料ごとに 1 件にまとめる */
function groupByDocument(hits: InfoBankHit[]): InfoBankHit[] {
  const seen = new Set<string>()
  return hits.filter(h => (seen.has(h.documentId) ? false : seen.add(h.documentId)))
}

function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > EXCERPT_LENGTH ? `${flat.slice(0, EXCERPT_LENGTH)}…` : flat
}

export function InfoBankSearchClient() {
  const [question, setQuestion] = useState('')
  const [mode, setMode] = useState<SearchMode>('auto')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answer, setAnswer] = useState<InfoBankAnswer | null>(null)
  const [asked, setAsked] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const previewExcerpts = (answer?.citations ?? [])
    .filter(c => c.documentId === previewId)
    .map(c => c.content)

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    const q = question.trim()
    if (!q || pending) return
    setPending(true)
    setError(null)
    setAnswer(null)
    try {
      const res = await askInfoBankAction({ question: q, mode })
      if (res.ok === false) setError(res.error)
      else {
        setAnswer(res.data)
        setAsked(q)
      }
    } catch {
      setError('回答の取得に失敗しました。時間をおいてもう一度お試しください')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={ask}
        className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 shadow-xs"
      >
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="info-bank-question" className="text-xs font-medium text-slate-700">
            質問
          </label>
          <DocumentListModal />
        </div>
        <div>
          <textarea
            id="info-bank-question"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            rows={2}
            maxLength={MAX_QUESTION_LENGTH}
            placeholder="社内の資料について質問してください"
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <fieldset className="space-y-1.5">
          <legend className="text-xs font-medium text-slate-700">検索方式</legend>
          <div className="flex flex-wrap gap-2">
            {MODE_OPTIONS.map(o => (
              <label
                key={o.value}
                title={o.hint}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  mode === o.value
                    ? 'border-primary bg-primary-light font-medium text-primary'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={o.value}
                  checked={mode === o.value}
                  onChange={() => setMode(o.value)}
                  className="sr-only"
                />
                {o.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500">{MODE_OPTIONS.find(o => o.value === mode)?.hint}</p>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending || question.trim() === ''}>
            {pending ? '検索中…' : '質問する'}
          </Button>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_QUESTIONS.map(q => (
              <button
                key={q}
                type="button"
                onClick={() => setQuestion(q)}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </form>

      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {answer ? (
        <section
          aria-live="polite"
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs"
        >
          <div>
            <p className="text-xs text-slate-500">Q. {asked}</p>
            {answer.answerable ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-900">
                {answer.answer}
              </p>
            ) : (
              <div className="mt-2 rounded-lg bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium text-slate-800">{answer.answer}</p>
                <p className="mt-1 text-xs text-slate-500">
                  登録されている社内資料には、この質問の根拠が見つかりませんでした。別の言葉でもお試しください。
                </p>
              </div>
            )}
          </div>

          {answer.answerable && answer.citations.length > 0 ? (
            <div>
              <h2 className="mb-2 text-xs font-semibold text-slate-700">出典</h2>
              <ul className="space-y-2">
                {groupByDocument(answer.citations).map(c => (
                  <li key={c.documentId} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{c.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {excerpt(c.content)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 whitespace-nowrap"
                        onClick={() => setPreviewId(c.documentId)}
                      >
                        元ファイル
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-xs text-slate-400">
            使った検索方式: {MODE_USED_LABEL[answer.modeUsed]}
          </p>
        </section>
      ) : null}
      <SourcePreviewModal
        documentId={previewId}
        excerpts={previewExcerpts}
        onClose={() => setPreviewId(null)}
      />
    </div>
  )
}
