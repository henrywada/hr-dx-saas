'use client'

import { Fragment, type ReactNode } from 'react'
import { displayItemName } from '@/features/health-check/kyokai-preset'
import { EMPLOYMENT_JUDGMENT_LABEL, type EmployeeResultView } from '@/features/health-check/types'

/** 健診票の項目列（濃緑・白文字・白枠） */
const ITEM_BG = '#2d5a3d'

const LATEST_COLUMNS = ['機関値', '標準値', '機関判定', '標準判定'] as const
const PAST_COLUMNS = ['標準値', '標準判定'] as const
const COMPARE_ROUNDS = 2
const TOTAL_COLSPAN = LATEST_COLUMNS.length + PAST_COLUMNS.length * (COMPARE_ROUNDS - 1)

function columnsForRound(index: number) {
  return index === 0 ? LATEST_COLUMNS : PAST_COLUMNS
}

function padRounds(
  history: EmployeeResultView[] | undefined,
  view: EmployeeResultView
): (EmployeeResultView | null)[] {
  const filled: (EmployeeResultView | null)[] = [
    ...(history && history.length > 0 ? history : [view]).slice(0, COMPARE_ROUNDS),
  ]
  while (filled.length < COMPARE_ROUNDS) filled.push(null)
  return filled
}

function roundLabel(view: EmployeeResultView): string {
  if (view.campaign) {
    return `${view.campaign.fiscal_year}年度 第${view.campaign.round}回`
  }
  return view.record.exam_date
}

function formatValue(value: string | null | undefined, unit: string | null | undefined): string {
  if (value == null || value === '') return '—'
  return unit ? `${value} ${unit}` : String(value)
}

function cellInstitutionValue(row: EmployeeResultView['items'][number] | undefined): string {
  if (!row) return '—'
  return formatValue(row.result.raw_value, row.result.raw_unit)
}

function cellStandardValue(row: EmployeeResultView['items'][number] | undefined): string {
  if (!row) return '—'
  return formatValue(row.result.standard_value, row.result.standard_unit)
}

function cellInstitutionJudgment(row: EmployeeResultView['items'][number] | undefined): string {
  if (!row) return '—'
  return row.result.institution_judgment_raw ?? '—'
}

function cellStandardJudgment(row: EmployeeResultView['items'][number] | undefined): string {
  if (!row) return '—'
  return row.standardJudgmentCode ?? '—'
}

const cellClass =
  'py-1 px-2 border border-slate-200 bg-white text-slate-800 transition-colors duration-150 group-hover/hc:bg-[#f6f8fa]'
const headerSubClass =
  'py-1 px-2 text-center font-normal text-[10px] text-slate-500 border border-slate-200 bg-white'

export function ResultDetailView({
  view,
  history,
  showName,
  sideContent,
}: {
  view: EmployeeResultView
  history?: EmployeeResultView[]
  showName?: string | null
  sideContent?: ReactNode
}) {
  const rounds = padRounds(history, view)
  // 今回の項目順を維持（過去回にしかない項目は追加しない）
  const items = view.items.map(row => row.item)
  const byRoundCode = rounds.map(r =>
    r ? new Map(r.items.map(i => [i.item.code, i] as const)) : new Map()
  )

  const summaryCard = (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-slate-500">受診日</dt>
          <dd className="mt-0.5 font-medium text-slate-900">
            {view.record.exam_date}
            {view.campaign ? ` / ${view.campaign.fiscal_year}年度 第${view.campaign.round}回` : ''}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">機関</dt>
          <dd className="mt-0.5 font-medium text-slate-900">
            {view.institution?.name ?? '—'}
            {view.institution?.is_standard ? '（標準）' : ''}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">総合判定</dt>
          <dd className="mt-0.5 font-medium text-slate-900">
            機関={view.record.institution_overall_judgment_raw ?? '—'} / 標準=
            {view.overallStandardCode ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">就業判定</dt>
          <dd className="mt-0.5 font-medium text-slate-900">
            {EMPLOYMENT_JUDGMENT_LABEL[view.record.employment_judgment]}
          </dd>
        </div>
      </dl>
      {!sideContent && view.notes?.doctor_comment && (
        <p className="mt-3 text-xs">産業医コメント {view.notes.doctor_comment}</p>
      )}
      {!sideContent && view.notes?.nurse_comment && (
        <p className="mt-1 text-xs">保健師コメント {view.notes.nurse_comment}</p>
      )}
    </div>
  )

  const resultTable = (
    <div className="rounded-lg overflow-x-auto border border-slate-200 shadow-xs">
      <table className="w-full min-w-[720px] text-xs border-collapse table-fixed">
        <thead>
          <tr>
            <th
              rowSpan={3}
              className="sticky left-0 z-10 w-72 py-1 px-4 text-left font-semibold border border-white"
              style={{ backgroundColor: ITEM_BG, color: '#fff' }}
            >
              項目
            </th>
            <th
              colSpan={TOTAL_COLSPAN}
              className="py-1 px-4 text-center font-semibold text-slate-800 border border-slate-200 bg-white"
            >
              実施回
            </th>
          </tr>
          <tr>
            {rounds.map((r, i) => (
              <th
                key={r?.record.id ?? `empty-round-${i}`}
                colSpan={columnsForRound(i).length}
                className="py-1 px-2 text-center font-medium text-slate-700 border border-slate-200 bg-white"
              >
                {r ? roundLabel(r) : '—'}
              </th>
            ))}
          </tr>
          <tr>
            {rounds.map((r, i) => (
              <Fragment key={`${r?.record.id ?? `empty-round-${i}`}-cols`}>
                {columnsForRound(i).map(label => (
                  <th key={`${r?.record.id ?? `empty-${i}`}-${label}`} className={headerSubClass}>
                    {label}
                  </th>
                ))}
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.code} className="group/hc">
              <td className="sticky left-0 z-10 w-72 py-1 px-4 border border-white text-white bg-[#2d5a3d] transition-colors duration-150 group-hover/hc:bg-[#3d7a52]">
                {displayItemName(item.code, item.name)}
              </td>
              {rounds.map((r, i) => {
                const cell = byRoundCode[i].get(item.code)
                const key = r?.record.id ?? `empty-round-${i}`
                if (i === 0) {
                  return (
                    <Fragment key={key}>
                      <td className={`${cellClass} font-mono`}>{cellInstitutionValue(cell)}</td>
                      <td className={`${cellClass} font-mono`}>{cellStandardValue(cell)}</td>
                      <td className={cellClass}>{cellInstitutionJudgment(cell)}</td>
                      <td className={cellClass}>{cellStandardJudgment(cell)}</td>
                    </Fragment>
                  )
                }
                return (
                  <Fragment key={key}>
                    <td className={`${cellClass} font-mono`}>{cellStandardValue(cell)}</td>
                    <td className={cellClass}>{cellStandardJudgment(cell)}</td>
                  </Fragment>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-3">
      {showName && <p className="text-sm font-semibold text-slate-900">{showName}</p>}
      {sideContent ? (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-3 items-start">
          <div className="min-w-0 space-y-3">
            {summaryCard}
            {resultTable}
          </div>
          <div className="lg:sticky lg:top-4">{sideContent}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {summaryCard}
          {resultTable}
        </div>
      )}
    </div>
  )
}
