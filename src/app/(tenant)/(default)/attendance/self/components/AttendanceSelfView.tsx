'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getMonthlyStats,
  getMonthlyRecords,
  getUnresolvedAlerts,
} from '@/features/attendance/actions'
import type {
  MonthlyStatsView,
  OvertimeAlertRow,
  WorkTimeRecordRow,
} from '@/features/attendance/types'
import { toJSTDateString } from '@/lib/datetime'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { MonthlyStats } from './MonthlyStats'
import { AttendanceCalendar } from './AttendanceCalendar'
import { DailyRecordCard } from './DailyRecordCard'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function lastDayOfCalendarMonth(year: number, month: number): string {
  const last = new Date(year, month, 0).getDate()
  return `${year}-${pad2(month)}-${String(last).padStart(2, '0')}`
}

/** 同一日は created_at が新しい行を優先 */
function buildRecordsByDate(
  records: WorkTimeRecordRow[],
): Map<string, WorkTimeRecordRow> {
  const sorted = [...records].sort((a, b) =>
    (b.created_at ?? '').localeCompare(a.created_at ?? ''),
  )
  const m = new Map<string, WorkTimeRecordRow>()
  for (const r of sorted) {
    if (!m.has(r.record_date)) m.set(r.record_date, r)
  }
  return m
}

function alertDatesFromAlerts(alerts: OvertimeAlertRow[]): Set<string> {
  const s = new Set<string>()
  for (const a of alerts) {
    if (a.triggered_at) {
      s.add(toJSTDateString(new Date(a.triggered_at)))
    }
    const v = a.alert_value
    if (v && typeof v === 'object') {
      const rd = v.record_date ?? v.work_date
      if (typeof rd === 'string') s.add(rd.slice(0, 10))
    }
  }
  return s
}

type Props = {
  initialYear: number
  initialMonth: number
}

export function AttendanceSelfView({ initialYear, initialMonth }: Props) {
  const [y, setY] = useState(initialYear)
  const [m, setM] = useState(initialMonth)
  const [stats, setStats] = useState<MonthlyStatsView | null>(null)
  const [records, setRecords] = useState<WorkTimeRecordRow[]>([])
  const [alerts, setAlerts] = useState<OvertimeAlertRow[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    const [r1, r2, r3] = await Promise.all([
      getMonthlyStats(y, m),
      getMonthlyRecords(y, m),
      getUnresolvedAlerts(y, m),
    ])
    setLoading(false)

    if (r1.ok === false || r2.ok === false || r3.ok === false) {
      const err = [r1, r2, r3].find((x) => x.ok === false)
      setError(err && err.ok === false ? err.error : '読み込みに失敗しました')
      setStats(null)
      setRecords([])
      setAlerts([])
      return
    }
    setStats(r1.data)
    setRecords(r2.data)
    setAlerts(r3.data)
  }, [y, m])

  useEffect(() => {
    void load()
  }, [load])

  // 月が変わったときだけ選択日をリセット（当日がその月に含まれるなら当日）
  useEffect(() => {
    const today = toJSTDateString(new Date())
    const start = `${y}-${pad2(m)}-01`
    const end = lastDayOfCalendarMonth(y, m)
    if (today >= start && today <= end) {
      setSelectedDate(today)
    } else {
      setSelectedDate(null)
    }
  }, [y, m])

  const byDate = useMemo(() => buildRecordsByDate(records), [records])
  const alertDates = useMemo(() => alertDatesFromAlerts(alerts), [alerts])
  const monthlyOvertimePositive = (stats?.overtime_minutes ?? 0) > 0

  const shiftMonth = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1)
    setY(d.getFullYear())
    setM(d.getMonth() + 1)
  }

  const title = `${y}年${m}月`

  return (
    <div className="space-y-6 pb-10">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>データ取得エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {alerts.length > 0 && !error && (
        <Alert variant="destructive">
          <AlertTitle>未解決のアラートが {alerts.length} 件あります</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-2 space-y-1">
              {alerts.slice(0, 5).map((a) => (
                <li key={a.id}>
                  {a.alert_type}
                  {a.triggered_at && (
                    <span className="text-red-800/90">
                      {' '}
                      （{toJSTDateString(new Date(a.triggered_at))}）
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => shiftMonth(-1)}
            disabled={loading}
            className="inline-flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            前月
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => shiftMonth(1)}
            disabled={loading}
            className="inline-flex items-center gap-1"
          >
            次月
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
          {loading && (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" aria-hidden />
          )}
          {title}
        </div>
      </div>

      <MonthlyStats
        stats={stats}
        unresolvedAlertCount={alerts.length}
        loadError={error}
      />

      <Card variant="default" title="勤務カレンダー">
        <AttendanceCalendar
          year={y}
          month={m}
          recordsByDate={byDate}
          alertDates={alertDates}
          monthlyOvertimePositive={monthlyOvertimePositive}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </Card>

      <DailyRecordCard
        workDate={selectedDate}
        record={selectedDate ? (byDate.get(selectedDate) ?? null) : null}
      />
    </div>
  )
}
