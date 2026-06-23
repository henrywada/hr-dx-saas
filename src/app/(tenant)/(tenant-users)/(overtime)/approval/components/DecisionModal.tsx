/**
 * 残業申請の詳細表示・承認／却下／修正依頼モーダル
 */
'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { OvertimeApplication } from '../types'
import { formatDateTimeInJST, formatTimeInJSTFromIso } from '@/lib/datetime'

export type DecisionKind = 'approve' | 'reject' | 'request_correction'

type Mode = 'detail' | 'decision'

type Props = {
  open: boolean
  mode: Mode
  application: OvertimeApplication | null
  /** 決裁モーダルを開いた直後の選択（詳細・操作ボタンから） */
  initialKind?: DecisionKind
  onClose: () => void
  onConfirmDecision?: (payload: {
    kind: DecisionKind
    comment: string
    suggestedHours?: number
  }) => Promise<void>
  submitting?: boolean
}

function formatWorkDate(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1)
  const w = ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()]
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}/${mm}/${dd} (${w})`
}

function formatIsoTime(iso: string | undefined) {
  if (!iso) return '—'
  const t = formatTimeInJSTFromIso(iso)
  return t ?? iso
}

export function DecisionModal({
  open,
  mode,
  application,
  onClose,
  onConfirmDecision,
  submitting,
  initialKind,
}: Props) {
  const [kind, setKind] = useState<DecisionKind>(() => initialKind ?? 'approve')
  const [comment, setComment] = useState('')
  const [suggestedHours, setSuggestedHours] = useState(
    () =>
      application?.requested_hours != null ? String(application.requested_hours) : '',
  )

  // フォームの初期化は親の key（id + mode + initialKind）でマウントし直す。useLayoutEffect の依存配列は React 19 で長さ不一致エラーになり得るため使わない。

  if (!open || !application) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode !== 'decision' || !onConfirmDecision) return
    if (kind === 'request_correction' && !comment.trim()) return
    const sh =
      kind === 'request_correction' && suggestedHours.trim() !== ''
        ? Number(suggestedHours)
        : undefined
    if (kind === 'request_correction' && sh !== undefined && (Number.isNaN(sh) || sh <= 0)) {
      return
    }
    await onConfirmDecision({
      kind,
      comment: comment.trim(),
      suggestedHours: sh,
    })
  }

  const title = mode === 'detail' ? '申請の詳細' : '承認処理'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="overtime-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー: 青背景・白文字・閉じる */}
        <div className="flex shrink-0 items-start justify-between gap-4 bg-[#0078d4] px-6 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="overtime-modal-title" className="text-lg font-bold text-white">
              {title}
            </h2>
            <p className="mt-1 text-sm text-white/90">
              {application.employee_name ?? '（氏名なし）'} / {formatWorkDate(application.work_date)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="shrink-0 rounded-lg p-1.5 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:opacity-50"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>

        {/* 本文 */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 py-6 text-sm text-slate-700">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
            <div>
              <dt className="text-xs font-medium text-slate-500">出勤</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{application.clock_in ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">退勤</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{application.clock_out ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">休暇</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {application.is_holiday ? '●' : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">ソース</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{application.source ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">残業開始</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {formatIsoTime(application.overtime_start)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">残業終了</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {formatIsoTime(application.overtime_end)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">残業時間</dt>
              <dd className="mt-0.5 font-medium text-slate-900 tabular-nums">
                {application.requested_hours != null
                  ? `${Number(application.requested_hours).toFixed(2)} 時間`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">ステータス</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{application.status}</dd>
            </div>
          </dl>

          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500">残業理由</p>
            <div className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50 p-3 text-slate-800">
              {application.reason?.trim() ? application.reason : '—'}
            </div>
          </div>

          {application.created_at && (
            <p className="mt-3 text-xs text-slate-400">
              作成: {formatDateTimeInJST(application.created_at)}
            </p>
          )}

          {mode === 'decision' && (
            <form onSubmit={handleSubmit} className="mt-6 border-t border-slate-200 pt-6">
              <fieldset>
                <legend className="text-sm font-semibold text-slate-800">処理内容</legend>
                <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="decision"
                      checked={kind === 'approve'}
                      onChange={() => setKind('approve')}
                      className="accent-[#0078d4] focus:ring-[#0078d4]"
                    />
                    承認
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="decision"
                      checked={kind === 'reject'}
                      onChange={() => setKind('reject')}
                      className="accent-[#0078d4] focus:ring-[#0078d4]"
                    />
                    却下
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="decision"
                      checked={kind === 'request_correction'}
                      onChange={() => setKind('request_correction')}
                      className="accent-[#0078d4] focus:ring-[#0078d4]"
                    />
                    修正依頼
                  </label>
                </div>
              </fieldset>

              {kind === 'request_correction' && (
                <div className="mt-4">
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    提案残業時間（任意・小数可）
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0.01}
                    value={suggestedHours}
                    onChange={(e) => setSuggestedHours(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                  />
                </div>
              )}

              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  コメント
                  {kind === 'request_correction' ? '（必須）' : '（任意）'}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-[#0078d4] focus:outline-none focus:ring-1 focus:ring-[#0078d4]"
                  placeholder={
                    kind === 'request_correction' ? '修正内容を具体的に記入してください' : ''
                  }
                />
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    (kind === 'request_correction' && !comment.trim()) ||
                    (kind === 'request_correction' &&
                      suggestedHours.trim() !== '' &&
                      (Number.isNaN(Number(suggestedHours)) || Number(suggestedHours) <= 0))
                  }
                  className="rounded-lg bg-[#0078d4] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#106ebe] disabled:opacity-50"
                >
                  {submitting ? '送信中…' : '確定'}
                </button>
              </div>
            </form>
          )}

          {mode === 'detail' && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                承認者コメント
              </label>
              <textarea
                readOnly
                rows={4}
                className="w-full cursor-default rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                placeholder="（コメントはありません）"
                value={application.supervisor_comment?.trim() ?? ''}
              />
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
