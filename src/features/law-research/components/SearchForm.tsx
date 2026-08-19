'use client'

import { useState } from 'react'

import type { ResearchSubTab } from '../types'

/** 第2入力に条番号が必要なサブタブ */
const SUB_TABS_WITH_ARTICLE: ResearchSubTab[] = ['tax_article', 'labor_article', 'law_article']
/** 第2入力に通達番号が必要なサブタブ */
const SUB_TABS_WITH_NUMBER: ResearchSubTab[] = ['tax_tsutatsu']

/**
 * サブタブごとの第1入力のラベルとプレースホルダ。
 * ResearchClient が「入力欄の意味が変わったか」を判定するために export する
 * （ラベルが同じ間は入力値を保持し、変わったらリセットする）。
 */
export const PRIMARY_FIELD: Record<ResearchSubTab, { label: string; placeholder: string }> = {
  tax_article: { label: '法令名', placeholder: '法人税法 / 所得税法' },
  tax_tsutatsu: { label: '通達名', placeholder: '法人税基本通達' },
  tax_saiketsu: { label: 'キーワード', placeholder: '交際費 / 役員報酬' },
  labor_article: { label: '法令名', placeholder: '労働基準法 / 労基法' },
  labor_mhlw: { label: 'キーワード', placeholder: '36協定 / 賃金不払残業' },
  labor_jaish: { label: 'キーワード', placeholder: 'ストレスチェック' },
  law_search: { label: 'キーワード', placeholder: '育児 / 個人情報' },
  law_article: { label: '法令名', placeholder: '民法 / 個人情報の保護に関する法律' },
  law_revision: { label: '法令ID', placeholder: '322AC0000000049' },
}

export function SearchForm({
  subTab,
  pending,
  onSubmit,
}: {
  subTab: ResearchSubTab
  pending: boolean
  onSubmit: (input: { keyword: string; article?: string }) => void
}) {
  const [keyword, setKeyword] = useState('')
  const [article, setArticle] = useState('')

  const needsArticle = SUB_TABS_WITH_ARTICLE.includes(subTab)
  const needsNumber = SUB_TABS_WITH_NUMBER.includes(subTab)
  const field = PRIMARY_FIELD[subTab]

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
      onSubmit={e => {
        e.preventDefault()
        onSubmit({ keyword, article: needsArticle || needsNumber ? article : undefined })
      }}
    >
      <div className="flex flex-col gap-1 min-w-[240px] flex-1">
        <label className="text-xs text-slate-600" htmlFor="research-keyword">
          {field.label}
        </label>
        <input
          id="research-keyword"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder={field.placeholder}
          className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#FD7601]"
        />
      </div>

      {(needsArticle || needsNumber) && (
        <div className="flex flex-col gap-1 w-[160px]">
          {/* いずれも任意。未入力なら目次を返し、そこから辿れるようにする */}
          <label className="text-xs text-slate-600" htmlFor="research-article">
            {needsArticle ? '条番号（任意）' : '通達番号（任意）'}
          </label>
          <input
            id="research-article"
            value={article}
            onChange={e => setArticle(e.target.value)}
            placeholder={needsArticle ? '36' : '33-6'}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#FD7601]"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !keyword.trim()}
        className="px-3 py-1.5 text-xs rounded-lg bg-[#FD7601] text-white font-medium hover:bg-[#e56a00] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? '検索中…' : '検索'}
      </button>
    </form>
  )
}
