'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDateTimeInJST } from '@/lib/datetime'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'
import { TimecardCorrectionDialog } from './TimecardCorrectionDialog'
import type { AnomalyListItem } from './types'
import type { BadgeVariant } from '@/components/ui/Badge'

function anomalyLabel(type: string): string {
  switch (type) {
    case 'missing_clock_out':
      return '退勤なし'
    case 'missing_clock_in':
      return '出勤なし'
    case 'time_reversed':
      return '時刻逆転'
    default:
      return type
  }
}

function anomalyBadgeVariant(type: string): BadgeVariant {
  switch (type) {
    case 'missing_clock_out':
      return 'orange'
    case 'missing_clock_in':
      return 'teal'
    case 'time_reversed':
      return 'primary'
    default:
      return 'neutral'
  }
}

type Props = {
  closureId: string
}

export function TimecardAnomaliesClient({ closureId }: Props) {
  const [items, setItems] = useState<AnomalyListItem[]>([])
  const [yearMonth, setYearMonth] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<AnomalyListItem | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/adm/closure/${closureId}/timecard-anomalies`)
      const json = (await res.json()) as {
        error?: string
        items?: AnomalyListItem[]
        closure?: { year_month?: string }
      }
      if (!res.ok) {
        setError(json.error ?? '一覧の取得に失敗しました')
        setItems([])
        return
      }
      setItems(json.items ?? [])
      setYearMonth(json.closure?.year_month ?? null)
    } catch {
      setError('通信に失敗しました')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [closureId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">打刻異常・修正</h1>
          <p className="mt-1 text-sm text-neutral-500">
            対象月の打刻異常を一覧し、修正内容を登録します。
            {yearMonth && (
              <span className="ml-2 font-mono text-neutral-700">
                対象月: {yearMonth.slice(0, 7)}
              </span>
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              再読込
            </>
          ) : (
            '再取得'
          )}
        </Button>
      </div>

      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20" aria-busy="true">
          <Loader2 className="h-10 w-10 animate-spin text-neutral-400" aria-label="読み込み中" />
        </div>
      ) : error ? null : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>異常の種類</TableHead>
              <TableHead>社員</TableHead>
              <TableHead>勤務日</TableHead>
              <TableHead>元の打刻</TableHead>
              <TableHead className="w-[120px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-neutral-500">
                  打刻異常はありません
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => {
                const det = row.details as { start_time?: string; end_time?: string } | null
                const start = det?.start_time
                const end = det?.end_time
                const preview = [
                  start ? `出勤 ${formatDateTimeInJST(start)}` : '出勤 —',
                  end ? `退勤 ${formatDateTimeInJST(end)}` : '退勤 —',
                ].join(' / ')
                return (
                  <TableRow key={`${row.work_time_record_id}-${row.anomaly_type}`}>
                    <TableCell>
                      <Badge variant={anomalyBadgeVariant(row.anomaly_type)}>
                        {anomalyLabel(row.anomaly_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{row.employee_name}</TableCell>
                    <TableCell className="font-mono text-xs">{row.record_date}</TableCell>
                    <TableCell className="max-w-[280px] text-xs text-neutral-600">{preview}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelected(row)
                          setDialogOpen(true)
                        }}
                      >
                        修正
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      )}

      <TimecardCorrectionDialog
        closureId={closureId}
        row={selected}
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) setSelected(null)
        }}
        onCorrected={load}
      />
    </div>
  )
}
