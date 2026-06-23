/**
 * 残業申請一覧テーブル・カード表示と、SWR による一覧取得・ページネーション
 */
'use client'

import useSWR from 'swr'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Timer } from 'lucide-react'
import { Filters, type FiltersState } from './Filters'
import { ApprovalTargetsModal } from './ApprovalTargetsModal'
import { DecisionModal, type DecisionKind } from './DecisionModal'
import {
  approveApplication,
  fetchApplications,
  rejectApplication,
  requestCorrection,
} from '../lib/api'
import type {
  EmployeeOvertimeAggPayload,
  EmployeeOvertimeWarningPayload,
  OvertimeApplication,
  OvertimeApplicationStatus,
  OvertimeApprovalTargetPeer,
  OvertimeListThresholds,
} from '../types'
import { formatTimeInJSTFromIso } from '@/lib/datetime'

function tableRowClass(
  isHoliday: boolean | undefined,
  workDateYmd: string,
  status?: OvertimeApplicationStatus,
): string {
  if (status === '未申請') {
    return 'border-b border-slate-100 bg-slate-50/85 hover:bg-slate-50'
  }
  if (isHoliday) {
    return 'bg-violet-50/85 hover:bg-violet-100/75 border-b border-violet-100/80'
  }
  const [y, m, d] = workDateYmd.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const w = dt.getDay()
  if (w === 0) {
    return 'bg-rose-50/70 hover:bg-rose-100/70 border-b border-rose-100/70'
  }
  if (w === 6) {
    return 'bg-sky-50/70 hover:bg-sky-100/70 border-b border-sky-100/70'
  }
  return 'border-b border-slate-100 hover:bg-slate-50/80 even:bg-slate-50/40'
}

function formatWorkDateDisplay(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const w = ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()]
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}/${mm}/${dd} (${w})`
}

/** YYYY-MM → 2026年3月 */
function formatJapaneseYearMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  if (!y || !m) return ym
  return `${y}年${m}月`
}

function statusBadgeClass(s: OvertimeApplicationStatus): string {
  switch (s) {
    case '申請中':
      return 'bg-amber-50 text-amber-900 ring-amber-200'
    case '承認済':
      return 'bg-emerald-50 text-emerald-900 ring-emerald-200'
    case '却下':
      return 'bg-red-50 text-red-900 ring-red-200'
    case '修正依頼':
      return 'bg-orange-50 text-orange-900 ring-orange-200'
    case '未申請':
      return 'bg-slate-100 text-slate-600 ring-slate-200'
    default:
      return 'bg-slate-50 text-slate-800 ring-slate-200'
  }
}

function truncReason(s: string | undefined, max = 36) {
  const t = s?.trim() ?? ''
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

/** 注意列: 当月申請ベース合計を常に表示し、閾値超過時は警告アイコン */
function OvertimeAttentionCell({
  warning,
  agg,
  thresholds,
}: {
  warning: EmployeeOvertimeWarningPayload | undefined
  agg: EmployeeOvertimeAggPayload | undefined
  thresholds: OvertimeListThresholds | undefined
}) {
  const monthly = agg?.monthly_requested ?? 0
  const ytd = agg?.ytd_approved ?? 0
  const warnH = thresholds?.monthly_warning_hours ?? 40
  const limitH = thresholds?.monthly_limit_hours ?? 45
  const annualH = thresholds?.annual_limit_hours ?? 360

  const tooltip = [
    `当月合計（承認済・申請中・修正依頼）: ${monthly.toFixed(2)} 時間`,
    `当年合計（承認済のみ）: ${ytd.toFixed(2)} 時間`,
    `閾値の目安: 警告 ${warnH}h / 月間上限 ${limitH}h / 年間 ${annualH}h`,
    ...(warning?.reasons ?? []),
  ].join('\n')

  return (
    <div
      className="flex min-w-[3rem] flex-col items-center justify-center gap-0.5 py-0.5"
      title={tooltip}
    >
      {warning ? (
        <span
          className={`inline-flex ${
            warning.level === 'limit' ? 'text-red-600' : 'text-amber-600'
          }`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
        </span>
      ) : (
        <span className="inline-flex text-emerald-600/85">
          <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
        </span>
      )}
      <span className="text-[10px] font-medium leading-tight text-slate-700 tabular-nums">
        {monthly.toFixed(2)}h
      </span>
    </div>
  )
}

const outlineBtn =
  'rounded-md border border-indigo-400 bg-white px-2 py-1 text-xs font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40'

type ClientProps = {
  tenantId: string
  supervisorEmployeeId: string
  /** employees.is_manager かつ division 割当あり、かつ employee_id あり */
  canApprove: boolean
  isManager: boolean
  hasDivision: boolean
  approvalTargetPeers: OvertimeApprovalTargetPeer[]
  divisionLabel: string | null
  defaultMonth: string
}

export function OvertimeApprovalClient({
  tenantId,
  supervisorEmployeeId,
  canApprove,
  isManager,
  hasDivision,
  approvalTargetPeers,
  divisionLabel,
  defaultMonth,
}: ClientProps) {
  const [filters, setFilters] = useState<FiltersState>({
    month: defaultMonth,
    statuses: [],
    showAllDivisionEmployees: false,
  })
  const [page, setPage] = useState(1)
  const [targetsModalOpen, setTargetsModalOpen] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'detail' | 'decision'>('detail')
  const [modalApp, setModalApp] = useState<OvertimeApplication | null>(null)
  const [initialKind, setInitialKind] = useState<DecisionKind>('approve')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setPage(1)
  }, [filters.month, filters.statuses, filters.showAllDivisionEmployees])

  const swrKey = useMemo(
    () =>
      [
        'overtime-approval',
        tenantId,
        filters.month,
        page,
        filters.statuses.join(','),
        filters.showAllDivisionEmployees ? '1' : '0',
      ] as const,
    [tenantId, filters.month, page, filters.statuses, filters.showAllDivisionEmployees],
  )

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    swrKey,
    async () =>
      fetchApplications({
        tenant_id: tenantId,
        month: filters.month,
        page,
        limit: 10,
        status: filters.statuses.length ? filters.statuses : undefined,
        all_division_employees: filters.showAllDivisionEmployees,
      }),
    { keepPreviousData: true },
  )

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(id)
  }, [toast])

  const openDetail = useCallback((app: OvertimeApplication) => {
    setModalApp(app)
    setModalMode('detail')
    setModalOpen(true)
  }, [])

  const openDecision = useCallback((app: OvertimeApplication, kind: DecisionKind) => {
    setModalApp(app)
    setInitialKind(kind)
    setModalMode('decision')
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setModalApp(null)
  }, [])

  const onConfirmDecision = useCallback(
    async (payload: { kind: DecisionKind; comment: string; suggestedHours?: number }) => {
      if (!modalApp || !supervisorEmployeeId) {
        setToast({ type: 'err', message: '承認者の従業員IDが取得できません' })
        return
      }
      setSubmitting(true)
      try {
        if (payload.kind === 'approve') {
          await approveApplication(modalApp.id, {
            supervisor_id: supervisorEmployeeId,
            comment: payload.comment,
          })
          setToast({ type: 'ok', message: '承認しました' })
        } else if (payload.kind === 'reject') {
          await rejectApplication(modalApp.id, {
            supervisor_id: supervisorEmployeeId,
            comment: payload.comment,
          })
          setToast({ type: 'ok', message: '却下しました' })
        } else {
          await requestCorrection(modalApp.id, {
            supervisor_id: supervisorEmployeeId,
            comment: payload.comment,
            suggested_hours: payload.suggestedHours,
          })
          setToast({ type: 'ok', message: '修正依頼を送信しました' })
        }
        closeModal()
        await mutate()
      } catch (e) {
        setToast({
          type: 'err',
          message: e instanceof Error ? e.message : '処理に失敗しました',
        })
      } finally {
        setSubmitting(false)
      }
    },
    [modalApp, supervisorEmployeeId, closeModal, mutate],
  )

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1
  const items = data?.items ?? []
  const pageLimit = data?.limit ?? 10
  /** 月次締め（集計済・人事承認・ロック）済みの月は上長操作のみ抑止 */
  const monthClosureBlocks = data?.month_closure_blocks_overtime_approval === true

  return (
    <div className="mx-auto max-w-[1920px] space-y-6 pb-10">
      {toast && (
        <div
          className={`fixed right-4 top-20 z-[60] max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
          role="status"
        >
          {toast.message}
        </div>
      )}

      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">残業申請の承認</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
          管理メニュー「月次締め管理」で、対象月の締めが集計済み以降（集計済・人事による承認・ロック）まで進んだ月は、集計結果と申請内容の食い違いを防ぐため、上長による承認・却下・修正依頼はできません。該当する月では操作欄に「詳細（締め済）」のみ表示され、内容の確認のみ可能です。締めが未完了の月は従来どおり承認操作ができます。
        </p>
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-4">
        <div
          className={`min-w-0 ${isManager && hasDivision ? 'shrink-0 lg:max-w-sm xl:max-w-xs' : 'w-full'}`}
        >
          <Filters
            value={filters}
            onChange={setFilters}
            disabled={isLoading && !data}
            showDivisionEmployeeOption={isManager && hasDivision}
          />
        </div>

        {isManager && hasDivision && (
          <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <div
              className="w-full max-w-md shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              role="region"
              aria-label="部署別・当月の残業時間サマリー"
            >
              <div className="flex gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"
                  aria-hidden
                >
                  <Timer className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900">{divisionLabel ?? '—'}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatJapaneseYearMonth(filters.month)}の集計
                  </p>
                  <dl className="mt-3 space-y-1.5 text-sm text-slate-700">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <dt className="text-slate-600">残業時間（承認済）</dt>
                      <dd className="font-semibold tabular-nums text-slate-900">
                        {!data && isLoading ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                            …
                          </span>
                        ) : (
                          <>
                            {Number(data?.month_approved_hours_total ?? 0).toFixed(2)}
                            <span className="ml-0.5 font-medium text-slate-600">時間</span>
                          </>
                        )}
                      </dd>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <dt className="text-slate-600">残業時間（承認済以外）</dt>
                      <dd className="font-semibold tabular-nums text-slate-900">
                        {!data && isLoading ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                            …
                          </span>
                        ) : (
                          <>
                            {Number(data?.month_unapproved_hours_total ?? 0).toFixed(2)}
                            <span className="ml-0.5 font-medium text-slate-600">時間</span>
                          </>
                        )}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                    「注意」列は従業員ごとの当月申請合計（承認済・申請中・修正依頼）を表示します。✓は閾値未満、▲は警告／上限超過です。法定の時間外・休日労働実績とは一致しない場合があります。
                    {data?.overtime_thresholds?.source === 'tenant_settings'
                      ? ' 閾値は overtime_settings の値です。'
                      : data?.overtime_thresholds
                        ? ' overtime_settings 未登録のため、労基法の目安（月45h・警告40h・年360h 等）を使用しています。'
                        : null}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTargetsModalOpen(true)}
              className="w-full shrink-0 rounded-lg border border-indigo-400 bg-white px-4 py-2.5 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-50 lg:ml-auto lg:w-auto"
            >
              承認対象者
            </button>
          </div>
        )}
      </div>

      {!isManager && (
        <p className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
          承認の権限がありません
        </p>
      )}

      {isManager && !hasDivision && (
        <p className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
          部署が未設定のため承認対象を表示できません
        </p>
      )}

      {canApprove && !supervisorEmployeeId && (
        <p className="rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-900">
          従業員マスタに紐づいていないため、承認 API を呼び出せません。管理者に連絡してください。
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
        {isLoading && !data && (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            読み込み中…
          </span>
        )}
        {data && (
          <span>
            {data.total} 件中 {(page - 1) * data.limit + 1}–
            {Math.min(page * data.limit, data.total)} 件を表示
          </span>
        )}
        {isValidating && data && (
          <span className="inline-flex items-center gap-1 text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            更新中
          </span>
        )}
        {error && (
          <span className="text-red-600">{error instanceof Error ? error.message : '取得エラー'}</span>
        )}
      </div>

      {/* デスクトップ: テーブル */}
      <div className="hidden md:block w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
            <tr>
              <th className="w-12 whitespace-nowrap px-2 py-2 text-center text-xs font-medium">
                No
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">日付</th>
              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">氏名</th>
              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">出勤</th>
              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">退勤</th>
              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">休暇</th>
              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">残業開始</th>
              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">残業終了</th>
              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">時間</th>
              <th className="w-14 whitespace-nowrap px-2 py-2 text-center text-xs font-medium">
                注意
              </th>
              <th className="min-w-[8rem] px-3 py-2 text-xs font-medium">理由</th>
              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium">ステータス</th>
              <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !isLoading && (
              <tr>
                <td colSpan={13} className="px-3 py-10 text-center text-slate-500">
                  該当する申請がありません
                </td>
              </tr>
            )}
            {items.map((app, index) => (
              <tr
                key={app.id}
                className={tableRowClass(app.is_holiday, app.work_date, app.status)}
              >
                <td className="whitespace-nowrap px-2 py-2 text-center tabular-nums text-slate-600">
                  {(page - 1) * pageLimit + index + 1}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-900">
                  {app.status === '未申請' ? '—' : formatWorkDateDisplay(app.work_date)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-800">
                  {app.employee_name ?? '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{app.clock_in ?? '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{app.clock_out ?? '—'}</td>
                <td className="px-3 py-2 text-center">{app.is_holiday ? '●' : '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {app.overtime_start ? formatTimeInJSTFromIso(app.overtime_start) ?? '—' : '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {app.overtime_end ? formatTimeInJSTFromIso(app.overtime_end) ?? '—' : '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                  {app.requested_hours != null ? Number(app.requested_hours).toFixed(2) : '—'}
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-center align-middle">
                  <OvertimeAttentionCell
                    warning={data?.employee_overtime_warnings?.[app.employee_id]}
                    agg={data?.employee_overtime_aggs?.[app.employee_id]}
                    thresholds={data?.overtime_thresholds}
                  />
                </td>
                <td
                  className="max-w-[10rem] truncate px-3 py-2 text-slate-700"
                  title={app.reason ?? ''}
                >
                  {truncReason(app.reason) || '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(app.status)}`}
                  >
                    {app.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    {app.status !== '未申請' && (
                      <>
                        <button type="button" className={outlineBtn} onClick={() => openDetail(app)}>
                          {monthClosureBlocks ? '詳細（締め済）' : '詳細'}
                        </button>
                        {canApprove &&
                          app.status === '申請中' &&
                          !!supervisorEmployeeId &&
                          !monthClosureBlocks && (
                          <>
                            <button
                              type="button"
                              className={outlineBtn}
                              onClick={() => openDecision(app, 'approve')}
                            >
                              承認
                            </button>
                            <button
                              type="button"
                              className={outlineBtn}
                              onClick={() => openDecision(app, 'reject')}
                            >
                              却下
                            </button>
                            <button
                              type="button"
                              className={outlineBtn}
                              onClick={() => openDecision(app, 'request_correction')}
                            >
                              修正依頼
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* モバイル: カード */}
      <div className="space-y-3 md:hidden">
        {items.length === 0 && !isLoading && (
          <p className="rounded-xl border border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
            該当する申請がありません
          </p>
        )}
        {items.map((app, index) => (
          <article
            key={app.id}
            className={`rounded-xl border border-slate-200 p-4 text-sm shadow-sm ${tableRowClass(app.is_holiday, app.work_date, app.status)}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium tabular-nums text-slate-500">
                  No {(page - 1) * pageLimit + index + 1}
                </p>
                <p className="font-semibold text-slate-900">{app.employee_name ?? '—'}</p>
                <p className="tabular-nums text-slate-600">
                  {app.status === '未申請' ? '—' : formatWorkDateDisplay(app.work_date)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(app.status)}`}
              >
                {app.status}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-700">
              <dt className="text-slate-500">出勤 / 退勤</dt>
              <dd className="tabular-nums text-right">
                {app.clock_in ?? '—'} / {app.clock_out ?? '—'}
              </dd>
              <dt className="text-slate-500">残業</dt>
              <dd className="text-right tabular-nums">
                {app.overtime_start ? formatTimeInJSTFromIso(app.overtime_start) : '—'} –{' '}
                {app.overtime_end ? formatTimeInJSTFromIso(app.overtime_end) : '—'}
              </dd>
              <dt className="text-slate-500">時間</dt>
              <dd className="text-right tabular-nums">
                {app.requested_hours != null ? Number(app.requested_hours).toFixed(2) : '—'}
              </dd>
              <dt className="text-slate-500">注意</dt>
              <dd className="flex justify-end">
                <OvertimeAttentionCell
                  warning={data?.employee_overtime_warnings?.[app.employee_id]}
                  agg={data?.employee_overtime_aggs?.[app.employee_id]}
                  thresholds={data?.overtime_thresholds}
                />
              </dd>
            </dl>
            <p className="mt-2 line-clamp-3 text-xs text-slate-600" title={app.reason}>
              {app.status === '未申請'
                ? '—'
                : app.reason?.trim()
                  ? app.reason
                  : '（理由なし）'}
            </p>
            <div className="mt-3 flex flex-wrap gap-1">
              {app.status !== '未申請' && (
                <>
                  <button type="button" className={outlineBtn} onClick={() => openDetail(app)}>
                    {monthClosureBlocks ? '詳細（締め済）' : '詳細'}
                  </button>
                  {canApprove &&
                    app.status === '申請中' &&
                    !!supervisorEmployeeId &&
                    !monthClosureBlocks && (
                    <>
                      <button
                        type="button"
                        className={outlineBtn}
                        onClick={() => openDecision(app, 'approve')}
                      >
                        承認
                      </button>
                      <button
                        type="button"
                        className={outlineBtn}
                        onClick={() => openDecision(app, 'reject')}
                      >
                        却下
                      </button>
                      <button
                        type="button"
                        className={outlineBtn}
                        onClick={() => openDecision(app, 'request_correction')}
                      >
                        修正依頼
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
        <button
          type="button"
          disabled={page <= 1 || isLoading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
        >
          Prev
        </button>
        <span className="text-sm text-slate-600">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || isLoading}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <DecisionModal
        key={modalApp ? `${modalApp.id}-${modalMode}-${initialKind}` : 'closed'}
        open={modalOpen}
        mode={modalMode}
        application={modalApp}
        initialKind={initialKind}
        onClose={closeModal}
        onConfirmDecision={modalMode === 'decision' ? onConfirmDecision : undefined}
        submitting={submitting}
      />

      <ApprovalTargetsModal
        open={targetsModalOpen}
        onClose={() => setTargetsModalOpen(false)}
        peers={approvalTargetPeers}
        divisionLabel={divisionLabel}
      />
    </div>
  )
}
