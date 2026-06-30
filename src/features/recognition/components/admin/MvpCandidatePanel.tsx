'use client'

import { Trophy } from 'lucide-react'
import type { MvpCandidate } from '../../types'

interface Props {
  periodLabel: string
  candidates: MvpCandidate[]
  /** E-S2: 表彰登録フォームへ候補を流す */
  onSelectCandidate?: (candidate: MvpCandidate) => void
  /** K-C1: 表彰管理画面へのリンク表示のみ */
  showRegisterHint?: boolean
}

/** K-C1 / E-S2: 月次 Kudos 集計に基づく MVP 表彰候補パネル */
export function MvpCandidatePanel({
  periodLabel,
  candidates,
  onSelectCandidate,
  showRegisterHint = false,
}: Props) {
  const actionable = candidates.filter(c => !c.already_awarded)

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-amber-50/40 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
        <div>
          <h3 className="text-xs font-bold text-slate-800">月次 MVP 表彰候補（Kudos 集計）</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            対象期間: {periodLabel}（JST）— 受信件数の多い順
          </p>
        </div>
      </div>

      {candidates.length === 0 ? (
        <p className="px-4 sm:px-5 py-4 text-xs text-slate-500">
          対象期間の Kudos 受信データがありません。
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-4 py-2 font-semibold">順位</th>
                <th className="px-4 py-2 font-semibold">従業員 / 部署</th>
                <th className="px-4 py-2 font-semibold text-center">受信</th>
                <th className="px-4 py-2 font-semibold text-center">送信者数</th>
                <th className="px-4 py-2 font-semibold">最多バリュー</th>
                <th className="px-4 py-2 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {candidates.map((candidate, index) => (
                <tr key={candidate.employee_id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-2 font-mono text-slate-500">{index + 1}</td>
                  <td className="px-4 py-2">
                    <div className="font-semibold text-slate-800">{candidate.employee_name}</div>
                    <div className="text-[11px] text-slate-400">{candidate.division_name}</div>
                  </td>
                  <td className="px-4 py-2 text-center font-bold text-slate-800">
                    {candidate.received_count}件
                  </td>
                  <td className="px-4 py-2 text-center text-slate-600">
                    {candidate.unique_sender_count}名
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {candidate.top_value_tag ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {candidate.already_awarded ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                        表彰済
                      </span>
                    ) : onSelectCandidate ? (
                      <button
                        type="button"
                        onClick={() => onSelectCandidate(candidate)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FD7601] text-white hover:opacity-90"
                      >
                        この候補で登録
                      </button>
                    ) : showRegisterHint ? (
                      <span className="text-[11px] text-slate-400">表彰管理で登録</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showRegisterHint && actionable.length > 0 && (
        <p className="px-4 sm:px-5 py-2 text-[11px] text-slate-500 border-t border-slate-100">
          候補を表彰に登録する場合は「イベント・表彰管理」画面から行ってください。
        </p>
      )}
    </div>
  )
}
