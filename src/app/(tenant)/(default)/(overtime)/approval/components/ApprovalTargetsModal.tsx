/**
 * 同一部署の承認対象従業員一覧モーダル
 */
'use client'

import { X } from 'lucide-react'
import type { OvertimeApprovalTargetPeer } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  peers: OvertimeApprovalTargetPeer[]
  divisionLabel?: string | null
}

export function ApprovalTargetsModal({ open, onClose, peers, divisionLabel }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approval-targets-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* インライン指定でヘッダー青を確実に適用（DecisionModal と同色） */}
        <div
          className="flex shrink-0 items-center justify-between gap-4 border-b border-[#106ebe] px-4 py-3 sm:px-5"
          style={{ backgroundColor: '#0078d4' }}
        >
          <div className="min-w-0 flex-1">
            <h2 id="approval-targets-title" className="text-lg font-bold text-white">
              承認対象者
            </h2>
            {divisionLabel ? (
              <p className="mt-1 text-xs text-white/90">部署: {divisionLabel}</p>
            ) : (
              <p className="mt-1 text-xs text-white/90">同一所属部署の従業員</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-2 py-2 sm:px-3">
          {peers.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-slate-500">該当者がいません</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">社員番号</th>
                  <th className="px-3 py-2 font-medium">氏名</th>
                </tr>
              </thead>
              <tbody>
                {peers.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 tabular-nums text-slate-700">
                      {p.employee_no?.trim() ? p.employee_no : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-900">{p.name || '（未設定）'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-slate-100 bg-white px-4 py-3 text-right sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-[#0078d4] hover:bg-slate-50"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
