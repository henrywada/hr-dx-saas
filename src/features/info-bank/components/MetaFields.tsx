'use client'

import React from 'react'

import { INFO_BANK_CATEGORIES } from '../constants'
import type { DocumentMetaInput } from '../schema'

/** 画面で編集中の値。タグ・キーワードは入力しやすいよう 1 本のテキストで持つ */
export interface MetaDraft {
  title: string
  category: string
  tagsText: string
  keywordsText: string
  summary: string
}

export const EMPTY_META_DRAFT: MetaDraft = {
  title: '',
  category: 'その他',
  tagsText: '',
  keywordsText: '',
  summary: '',
}

/** カンマ・読点・改行区切りのテキストを配列にする（空要素は除く） */
export function parseList(text: string): string[] {
  return text
    .split(/[,、，\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

export function draftToInput(draft: MetaDraft): DocumentMetaInput {
  return {
    title: draft.title,
    category: draft.category as DocumentMetaInput['category'],
    tags: parseList(draft.tagsText),
    keywords: parseList(draft.keywordsText),
    summary: draft.summary,
  }
}

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-slate-50 disabled:text-slate-500'

interface Props {
  value: MetaDraft
  onChange: (next: MetaDraft) => void
  disabled?: boolean
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  )
}

/** 資料の検索用メタデータ（タイトル・カテゴリ・タグ・検索キーワード・要約）の入力欄 */
export function MetaFields({ value, onChange, disabled }: Props) {
  const set = (patch: Partial<MetaDraft>) => onChange({ ...value, ...patch })

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="md:col-span-2">
        <Field label="タイトル（必須）">
          <input
            className={INPUT_CLASS}
            value={value.title}
            maxLength={200}
            disabled={disabled}
            onChange={e => set({ title: e.target.value })}
            placeholder="例: 就業規則（2026年版）"
          />
        </Field>
      </div>
      <Field label="カテゴリ">
        <select
          className={INPUT_CLASS}
          value={value.category}
          disabled={disabled}
          onChange={e => set({ category: e.target.value })}
        >
          {INFO_BANK_CATEGORIES.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <Field label="タグ" hint="カンマ区切り。最大20個。例: 休暇, 申請">
        <input
          className={INPUT_CLASS}
          value={value.tagsText}
          disabled={disabled}
          onChange={e => set({ tagsText: e.target.value })}
        />
      </Field>
      <div className="md:col-span-2">
        <Field
          label="検索キーワード（別名・略称・旧称）"
          hint="資料の本文に書かれていない呼び方も登録すると、質問で見つかりやすくなります。例: 育休, 育児休業"
        >
          <input
            className={INPUT_CLASS}
            value={value.keywordsText}
            disabled={disabled}
            onChange={e => set({ keywordsText: e.target.value })}
          />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="要約（任意）">
          <textarea
            className={INPUT_CLASS}
            rows={2}
            maxLength={1000}
            value={value.summary}
            disabled={disabled}
            onChange={e => set({ summary: e.target.value })}
          />
        </Field>
      </div>
    </div>
  )
}
