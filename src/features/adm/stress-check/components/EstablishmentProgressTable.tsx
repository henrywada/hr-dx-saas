'use client'

import { Fragment, useState } from 'react'
import { Building2, Users } from 'lucide-react'
import type { EstablishmentProgressTableRow } from '../types'
import NotSubmittedListModal from './NotSubmittedListModal'

/** `/adm/establishments` の一覧と同じ状態表示 */
const periodStatusClass = (status: string) =>
  status === 'active'
    ? 'text-emerald-700 font-semibold'
    : status === 'draft'
      ? 'text-[#57606a]'
      : 'text-[#57606a]'

const periodStatusLabel: Record<string, string> = {
  draft: '準備中',
  active: '実施中',
  closed: '終了',
}

type Props = {
  periodId: string
  rows: EstablishmentProgressTableRow[]
}

/** 拠点別進捗：各拠点の1行目に実施期間（タイトル・年度・質問・状態・期間）、2行目に進捗指標 */
export default function EstablishmentProgressTable({ periodId, rows }: Props) {
  const [selectedEstablishment, setSelectedEstablishment] =
    useState<EstablishmentProgressTableRow | null>(null)

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[#57606a]">
        <Building2 className="w-10 h-10 text-[#57606a] mb-3" />
        <p className="text-sm font-medium">拠点データがありません</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#e2e6ec]">
          <thead className="bg-[#f6f8fa]">
            <tr className="border-b border-[#e2e6ec]">
              <th colSpan={8} className="p-0 text-left">
                <table className="w-full table-fixed text-[11px] font-bold text-[#57606a] uppercase tracking-wider">
                  <thead>
                    <tr className="bg-[#f6f8fa]">
                      <th className="py-2 px-6 pr-2 font-semibold w-[28%] text-left">タイトル</th>
                      <th className="py-2 px-2 font-semibold whitespace-nowrap w-[4.5rem] text-left">
                        年度
                      </th>
                      <th className="py-2 px-2 font-semibold whitespace-nowrap w-[3.5rem] text-left">
                        質問
                      </th>
                      <th className="py-2 px-2 font-semibold whitespace-nowrap w-[4.5rem] text-left">
                        状態
                      </th>
                      <th className="py-2 px-2 font-semibold min-w-0 text-left">期間</th>
                      <th className="py-2 px-2 text-left" colSpan={3}>
                        {' '}
                      </th>
                    </tr>
                  </thead>
                </table>
              </th>
            </tr>
            <tr>
              <th className="px-6 py-3 text-left text-[11px] font-bold text-[#57606a] uppercase tracking-wider">
                拠点
              </th>
              <th className="px-6 py-3 text-center text-[11px] font-bold text-[#57606a] uppercase tracking-wider">
                対象者
              </th>
              <th className="px-6 py-3 text-center text-[11px] font-bold text-[#57606a] uppercase tracking-wider">
                受検済み
              </th>
              <th className="px-6 py-3 text-center text-[11px] font-bold text-[#57606a] uppercase tracking-wider">
                未受検
              </th>
              <th className="px-6 py-3 text-center text-[11px] font-bold text-[#57606a] uppercase tracking-wider">
                否提出
              </th>
              <th className="px-6 py-3 text-center text-[11px] font-bold text-[#57606a] uppercase tracking-wider">
                受検率
              </th>
              <th className="px-6 py-3 text-right text-[11px] font-bold text-[#57606a] uppercase tracking-wider w-56">
                進捗
              </th>
              <th className="px-6 py-3 text-right text-[11px] font-bold text-[#57606a] uppercase tracking-wider">
                未受検者
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#e2e6ec]">
            {rows.map(establishment => {
              const p = establishment.stressCheckPeriod
              return (
                <Fragment key={establishment.id}>
                  <tr className="bg-emerald-50/90 text-xs border-t border-emerald-100 align-top">
                    <td colSpan={8} className="p-0 border-t border-emerald-100">
                      <table className="w-full table-fixed">
                        <tbody>
                          <tr>
                            <td className="py-2.5 px-6 pr-2 text-[#24292f] font-medium break-words w-[28%] align-top">
                              {p?.title ?? '—'}
                            </td>
                            <td className="py-2.5 px-2 text-[#57606a] whitespace-nowrap w-[4.5rem] align-top">
                              {p ? p.fiscal_year : '—'}
                            </td>
                            <td className="py-2.5 px-2 text-[#57606a] whitespace-nowrap w-[3.5rem] align-top">
                              {p ? `${p.questionnaire_type}問` : '—'}
                            </td>
                            <td className="py-2.5 px-2 whitespace-nowrap w-[4.5rem] align-top">
                              {p ? (
                                <span className={periodStatusClass(p.status)}>
                                  {periodStatusLabel[p.status] ?? p.status}
                                </span>
                              ) : (
                                <span className="text-[#57606a]">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-[#57606a] whitespace-nowrap align-top">
                              {p
                                ? `${String(p.start_date).split('T')[0]} 〜 ${String(p.end_date).split('T')[0]}`
                                : '—'}
                            </td>
                            <td className="py-2.5 px-2 align-top" colSpan={3} />
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#f6f8fa] transition-colors border-b border-[#e2e6ec]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                          <Building2 className="w-4 h-4" />
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#24292f]">{establishment.name}</p>
                          {establishment.id === 'unassigned' && (
                            <p className="text-xs text-amber-600 mt-0.5">拠点設定の見直し対象</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-center font-semibold text-[#24292f] tabular-nums">
                      {establishment.total}
                    </td>
                    <td className="px-6 py-4 text-sm text-center font-semibold text-emerald-600 tabular-nums">
                      {establishment.submitted}
                    </td>
                    <td className="px-6 py-4 text-sm text-center font-semibold text-orange-500 tabular-nums">
                      {establishment.notSubmitted}
                    </td>
                    <td className="px-6 py-4 text-sm text-center font-semibold text-amber-600 tabular-nums">
                      {establishment.inProgress}
                    </td>
                    <td className="px-6 py-4 text-sm text-center font-bold text-[#24292f] tabular-nums">
                      {establishment.rate}%
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full h-2.5 bg-[#f6f8fa] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            establishment.rate >= 80
                              ? 'bg-linear-to-r from-emerald-400 to-emerald-500'
                              : establishment.rate >= 50
                                ? 'bg-linear-to-r from-amber-400 to-yellow-400'
                                : 'bg-linear-to-r from-red-400 to-orange-400'
                          }`}
                          style={{ width: `${establishment.rate}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        disabled={establishment.notSubmitted === 0}
                        onClick={() => setSelectedEstablishment(establishment)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e6ec] bg-white px-3 py-1.5 text-xs font-semibold text-[#24292f] shadow-sm hover:bg-[#f6f8fa] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Users className="w-3.5 h-3.5" />
                        一覧
                      </button>
                    </td>
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <NotSubmittedListModal
        key={selectedEstablishment?.id ?? 'closed'}
        open={selectedEstablishment !== null}
        onClose={() => setSelectedEstablishment(null)}
        periodId={periodId}
        establishmentId={selectedEstablishment?.id}
        title={
          selectedEstablishment ? `${selectedEstablishment.name}の未受検者一覧` : '未受検者一覧'
        }
      />
    </>
  )
}
