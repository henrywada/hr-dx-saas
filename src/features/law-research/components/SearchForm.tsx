'use client'

import type { ResearchMode } from '../types'

/** 人事・経営者が現場の処理から調べるときの入力例 */
const QUERY_SAMPLES: Record<ResearchMode, string[]> = {
  tax: [
    'この経費は損金算入できる？',
    '出張手当は課税される？',
    '通勤手当の非課税限度額は？',
    '退職金の税金はどう計算する？',
  ],
  labor: [
    'ストレスチェックは誰が実施する？',
    '36協定の残業上限は何時間？',
    '有給休暇はいつまでに取らせる？',
    '産休中の社会保険料はどうなる？',
  ],
  law: ['個人情報を社内で共有してよいか', '育児休業の対象者は誰か', '契約社員の雇止めはできるか'],
}

const PLACEHOLDER: Record<ResearchMode, string> = {
  tax: '例）この経費は損金算入できる？',
  labor: '例）ストレスチェックは誰が実施する？',
  law: '例）個人情報を社内で共有してよいか',
}

export function SearchForm({
  mode,
  keyword,
  pending,
  onKeywordChange,
  onSubmit,
}: {
  mode: ResearchMode
  keyword: string
  pending: boolean
  onKeywordChange: (value: string) => void
  onSubmit: (keyword: string) => void
}) {
  const samples = QUERY_SAMPLES[mode]

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={e => {
          e.preventDefault()
          onSubmit(keyword)
        }}
      >
        <div className="flex flex-col gap-1 min-w-[240px] flex-1">
          <label className="text-xs text-slate-600" htmlFor="research-keyword">
            調べたいこと
          </label>
          <input
            id="research-keyword"
            value={keyword}
            onChange={e => onKeywordChange(e.target.value)}
            placeholder={PLACEHOLDER[mode]}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-[#FD7601]"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !keyword.trim()}
          className="px-3 py-1.5 text-xs rounded-lg bg-[#FD7601] text-white font-medium hover:bg-[#e56a00] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? '検索中…' : '検索'}
        </button>
      </form>

      <div className="space-y-1.5">
        <p className="text-xs text-slate-500">
          こんな聞き方で調べられます（下の例のように、現場で迷っていることを入力して検索してください。）
        </p>
        <div className="flex flex-wrap gap-2">
          {samples.map(sample => (
            <button
              key={sample}
              type="button"
              disabled={pending}
              onClick={() => {
                onKeywordChange(sample)
                onSubmit(sample)
              }}
              className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:border-[#FD7601] hover:text-[#FD7601] disabled:opacity-50"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
