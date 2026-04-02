'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDateTimeInJST } from '@/lib/datetime'
import type { MonthlyClosureListRow } from '@/lib/overtime/closure-list'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'
import { ClosureStatusBadge } from './ClosureStatusBadge'
import { Input } from '../[closure_id]/timecard/components/input'
type MonthDetailRow = {
  no: number
  workDate: string
  workDateDisplay: string
  employeeNo: string
  employeeName: string
  clockIn: string | null
  clockOut: string | null
  overtimeRequestedTotalMinutes: number | null
  overtimeApplicationStatus: string | null
  approverName: string | null
  overtimeReason: string | null
  supervisorRecommend: string | null
}

type Props = {
  /** サーバーで取得した一覧（クライアント fetch に依存しない） */
  initialItems: MonthlyClosureListRow[]
  /** サーバー側の取得失敗時メッセージ */
  loadError?: string | null
  /** 未ロックの締めのうち最古の対象月 YYYY-MM（モーダル初期値） */
  suggestedYearMonth?: string | null
}

export function ClosureListClient({
  initialItems,
  loadError = null,
  suggestedYearMonth = null,
}: Props) {
  const router = useRouter()
  const error = loadError
  const items = initialItems

  const [dialogOpen, setDialogOpen] = useState(false)
  const [yearMonth, setYearMonth] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailYm, setDetailYm] = useState('')
  const [detailRows, setDetailRows] = useState<MonthDetailRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  const [otDetailOpen, setOtDetailOpen] = useState(false)
  const [otDetail, setOtDetail] = useState<{ reason: string; supervisorRecommend: string } | null>(
    null,
  )

  /** 締処理済（locked）のうち、対象月が最も新しい行（一覧は対象月降順のため 1 件） */
  const latestLockedClosureId = useMemo(() => {
    const locked = items.filter((r) => !r.isPendingMonth && r.status === 'locked')
    if (locked.length === 0) return null
    return locked.reduce((best, r) =>
      String(r.year_month) >= String(best.year_month) ? r : best,
    ).id
  }, [items])

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      setCreateError(null)
    }
  }

  function openNewClosureModal() {
    setYearMonth(suggestedYearMonth ?? '')
    setCreateError(null)
    setDialogOpen(true)
  }

  async function openDetailModal(ym: string) {
    setDetailYm(ym)
    setDetailError(null)
    setDetailRows([])
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const res = await fetch(
        `/api/closure/month-detail?year_month=${encodeURIComponent(ym)}`,
        { credentials: 'same-origin' },
      )
      const json = (await res.json()) as { error?: string; rows?: MonthDetailRow[] }
      if (!res.ok) {
        setDetailError(json.error ?? '詳細の取得に失敗しました')
        return
      }
      setDetailRows(json.rows ?? [])
    } catch {
      setDetailError('通信に失敗しました')
    } finally {
      setDetailLoading(false)
    }
  }

  function handleDetailOpenChange(open: boolean) {
    setDetailOpen(open)
    if (!open) {
      setDetailError(null)
      setDetailRows([])
    }
  }

  async function handleExecute(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreating(true)
    try {
      const res = await fetch('/api/closure/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ year_month: yearMonth.trim() }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setCreateError(json.error ?? '締め処理に失敗しました')
        return
      }
      setDialogOpen(false)
      setYearMonth('')
      router.refresh()
    } catch {
      setCreateError('通信に失敗しました')
    } finally {
      setCreating(false)
    }
  }

  function formatYmLabel(ym: string | null | undefined) {
    if (ym == null) return '—'
    return String(ym).slice(0, 7)
  }

  function closingDateTimeLabel(row: MonthlyClosureListRow): string {
    if (row.isPendingMonth || row.status !== 'locked') {
      return ''
    }
    const iso = row.closed_at ?? row.updated_at
    if (!iso) {
      return ''
    }
    return formatDateTimeInJST(iso)
  }

  async function handleCancelClosure(closureId: string) {
    setCancelingId(closureId)
    try {
      const res = await fetch(`/api/closure/${closureId}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        window.alert(json.error ?? '締め取消しに失敗しました')
        return
      }
      router.refresh()
    } catch {
      window.alert('通信に失敗しました')
    } finally {
      setCancelingId(null)
    }
  }

  /** 月次詳細モーダル: requested_hours 合計を h:mm（0 はブランク） */
  function detailModalOvertimeHm(m: number | null | undefined): string {
    if (m == null || Number.isNaN(m) || m === 0) return ''
    const h = Math.floor(m / 60)
    const mm = m % 60
    return `${h}:${String(mm).padStart(2, '0')}`
  }

  /** 「—」や空はセルをブランク表示 */
  function detailModalBlankDash(s: string | null | undefined): string {
    const t = s?.trim() ?? ''
    if (t === '' || t === '—') return ''
    return s ?? ''
  }

  /** ステータス列: 「申請中」はバッジで強調（複数は「・」区切りで分割） */
  function detailModalStatusDisplay(raw: string | null | undefined): ReactNode {
    const t = raw?.trim() ?? ''
    if (t === '' || t === '—') return null
    const parts = t.split('・').map((p) => p.trim()).filter(Boolean)
    if (parts.length === 0) return null
    return (
      <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
        {parts.map((part, i) => (
          <span key={`${i}-${part}`} className="inline-flex items-center">
            {i > 0 ? (
              <span className="mx-0.5 text-neutral-300" aria-hidden>
                ・
              </span>
            ) : null}
            {part === '申請中' ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold leading-tight text-amber-950 ring-1 ring-amber-300/90 shadow-sm">
                申請中
              </span>
            ) : (
              <span className="text-neutral-800">{part}</span>
            )}
          </span>
        ))}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">月次締め管理</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-neutral-500">
            月次の集計・承認・ロックを行います。
          </p>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-neutral-500">
            締め処理の完了後は、「承認・却下・修正依頼」はできず、詳細の閲覧のみとなります。
          </p>
        </div>
        <Button type="button" variant="primary" size="sm" className="shrink-0" onClick={openNewClosureModal}>
          月次締め処理の実行
        </Button>
      </div>

      <div className="relative w-full overflow-x-auto rounded-xl border border-neutral-200/80 bg-white">
        {error ? (
          <div
            className="flex min-h-[240px] items-center justify-center px-4 py-12 text-center text-sm text-red-800"
            role="alert"
          >
            {error}
          </div>
        ) : (
          <table className="w-full caption-bottom text-sm leading-snug">
            <TableHeader>
              <TableRow>
                <TableHead className="h-auto py-2 px-3">対象月</TableHead>
                <TableHead className="h-auto py-2 px-3">ステータス</TableHead>
                <TableHead className="h-auto py-2 px-3">締め年月日時</TableHead>
                <TableHead className="h-auto py-2 px-3 text-right tabular-nums">データ件数</TableHead>
                <TableHead className="h-auto py-2 px-3 text-right tabular-nums">申請中</TableHead>
                <TableHead className="h-auto py-2 px-3 text-right tabular-nums">承認件数</TableHead>
                <TableHead className="h-auto py-2 px-3 text-right tabular-nums">却下件数</TableHead>
                <TableHead className="h-auto py-2 px-3 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-4 py-12 text-center text-neutral-600">
                    <p className="font-medium text-neutral-800">締めデータがありません</p>
                    <p className="mt-2 text-sm text-neutral-500">
                      右上の「月次締め処理の実行」で対象月を入力し、ダイアログから集計〜ロックまで一括で行ってください。
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="py-1.5 px-3 font-mono font-medium">{formatYmLabel(row.year_month)}</TableCell>
                    <TableCell className="py-1.5 px-3">
                      {row.isPendingMonth ? null : (
                        <ClosureStatusBadge status={row.status} className="px-2 py-0.5 text-xs" />
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-1.5 text-xs text-neutral-600">
                      {closingDateTimeLabel(row)}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-right tabular-nums">{row.data_count}</TableCell>
                    <TableCell className="px-3 py-1.5 text-right tabular-nums">{row.application_count}</TableCell>
                    <TableCell className="px-3 py-1.5 text-right tabular-nums">{row.approved_count}</TableCell>
                    <TableCell className="px-3 py-1.5 text-right tabular-nums">
                      {row.rejected_count === 0 ? '' : row.rejected_count}
                    </TableCell>
                    <TableCell className="px-3 py-1.5 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {!row.isPendingMonth &&
                          row.status === 'locked' &&
                          row.id === latestLockedClosureId && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 min-h-0 border-orange-200 px-2 py-1 text-xs text-orange-900 hover:bg-orange-50"
                              disabled={cancelingId !== null}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    '最新の締処理を取り消し、未完了状態に戻しますか？',
                                  )
                                ) {
                                  void handleCancelClosure(row.id)
                                }
                              }}
                            >
                              {cancelingId === row.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                              ) : (
                                '締め取消し'
                              )}
                            </Button>
                          )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 min-h-0 px-2 py-1 text-xs"
                          onClick={() => openDetailModal(formatYmLabel(row.year_month))}
                        >
                          詳細
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新規月次締め</DialogTitle>
            <p className="text-sm text-neutral-500">
              対象月は一覧に基づき自動入力されます。「締め処理の実行」で集計・承認・ロックまで一括で行います。
            </p>
          </DialogHeader>
          <form onSubmit={handleExecute} className="space-y-4 px-6 pb-6 pt-2 sm:px-8">
            <div className="space-y-2">
              <label htmlFor="new-ym" className="text-sm font-medium text-neutral-800">
                対象月
              </label>
              <Input
                id="new-ym"
                name="year_month"
                placeholder="YYYY-MM"
                value={yearMonth}
                readOnly
                autoComplete="off"
                aria-readonly="true"
                title="一覧に基づき自動入力されます（編集不可）"
                className="cursor-default bg-neutral-100 text-neutral-800"
                disabled={creating}
                required
              />
            </div>
            {createError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {createError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
                キャンセル
              </Button>
              <Button type="submit" variant="primary" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-1 inline h-4 w-4 animate-spin" aria-hidden />
                    締め処理を実行中…
                  </>
                ) : (
                  '締め処理の実行'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={handleDetailOpenChange}>
        <DialogContent className="flex max-h-[85vh] max-w-5xl flex-col gap-0 p-0 sm:max-w-5xl">
          <DialogHeader className="shrink-0 border-b border-neutral-200 px-6 py-4">
            <DialogTitle>月次詳細（{detailYm}）</DialogTitle>
            <p className="text-sm text-neutral-500">
              打刻と残業申請を日付・社員単位で表示します。残業時間は申請の requested_hours を合計し h:mm で表示します。残業理由は reason、承認者コメントは supervisor_comment を表示します。
            </p>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 pt-2 sm:px-6">
            {detailLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-600">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                読み込み中…
              </div>
            ) : detailError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800" role="alert">
                {detailError}
              </div>
            ) : detailRows.length === 0 ? (
              <p className="py-12 text-center text-sm text-neutral-500">該当する行がありません。</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full min-w-[960px] text-left text-xs leading-snug sm:text-sm">
                  <thead className="sticky top-0 z-10 bg-neutral-50 text-neutral-700 shadow-[0_1px_0_0_rgb(229_229_229)]">
                    <tr>
                      <th className="whitespace-nowrap px-2 py-1.5 font-medium sm:px-3">No</th>
                      <th className="whitespace-nowrap px-2 py-1.5 font-medium sm:px-3">年月日</th>
                      <th className="whitespace-nowrap px-2 py-1.5 font-medium sm:px-3">従業員番号</th>
                      <th className="whitespace-nowrap px-2 py-1.5 font-medium sm:px-3">氏名</th>
                      <th className="whitespace-nowrap px-2 py-1.5 font-medium sm:px-3">出勤時間</th>
                      <th className="whitespace-nowrap px-2 py-1.5 font-medium sm:px-3">退勤時間</th>
                      <th className="whitespace-nowrap px-2 py-1.5 text-center font-medium sm:px-3">残業時間</th>
                      <th className="whitespace-nowrap px-2 py-1.5 font-medium sm:px-3">ステータス</th>
                      <th className="whitespace-nowrap px-2 py-1.5 font-medium sm:px-3">承認者</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailRows.map((r) => (
                      <tr
                        key={`${r.workDate}-${r.employeeNo}-${r.no}`}
                        className="border-t border-neutral-100 transition-[background-color,box-shadow] duration-200 ease-out hover:bg-sky-50/90 hover:shadow-[inset_4px_0_0_0_rgb(14_165_233/0.45)]"
                      >
                        <td className="tabular-nums px-2 py-1 sm:px-3">{r.no}</td>
                        <td className="whitespace-nowrap px-2 py-1 sm:px-3">{r.workDateDisplay}</td>
                        <td className="whitespace-nowrap px-2 py-1 font-mono sm:px-3">
                          {detailModalBlankDash(r.employeeNo)}
                        </td>
                        <td className="px-2 py-1 sm:px-3">{detailModalBlankDash(r.employeeName)}</td>
                        <td className="whitespace-nowrap px-2 py-1 sm:px-3">
                          {detailModalBlankDash(r.clockIn)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1 sm:px-3">
                          {detailModalBlankDash(r.clockOut)}
                        </td>
                        <td className="px-2 py-1 text-center sm:px-3">
                          <span className="inline-flex items-center justify-center gap-1 tabular-nums">
                            {detailModalOvertimeHm(r.overtimeRequestedTotalMinutes)}
                            {(r.overtimeRequestedTotalMinutes ?? 0) > 0 ||
                            (r.overtimeReason?.trim() ?? '') !== '' ||
                            (r.supervisorRecommend?.trim() ?? '') !== '' ? (
                              <button
                                type="button"
                                className="inline-flex shrink-0 rounded p-0.5 text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                                aria-label="残業理由・承認者コメントを表示"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOtDetail({
                                    reason: r.overtimeReason ?? '',
                                    supervisorRecommend: r.supervisorRecommend ?? '',
                                  })
                                  setOtDetailOpen(true)
                                }}
                              >
                                <Info className="h-4 w-4" aria-hidden />
                              </button>
                            ) : null}
                          </span>
                        </td>
                        <td className="px-2 py-1 sm:px-3">{detailModalStatusDisplay(r.overtimeApplicationStatus)}</td>
                        <td className="px-2 py-1 sm:px-3">{detailModalBlankDash(r.approverName)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={otDetailOpen}
        onOpenChange={(open) => {
          setOtDetailOpen(open)
          if (!open) setOtDetail(null)
        }}
      >
        <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>残業理由・承認者コメント</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 pb-6 pt-2">
            <div>
              <p className="text-xs font-semibold text-neutral-500">【残業理由】</p>
              <p className="mt-1 min-h-5 whitespace-pre-wrap text-sm text-neutral-800">
                {otDetail?.reason?.trim() ?? ''}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500">【承認者コメント】</p>
              <p className="mt-1 min-h-5 whitespace-pre-wrap text-sm text-neutral-800">
                {otDetail?.supervisorRecommend?.trim() ?? ''}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
