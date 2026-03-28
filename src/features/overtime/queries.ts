import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import {
  formatTimeInJSTFromIso,
  getJSTYearMonth,
  lastDayOfMonthYmd,
} from '@/lib/datetime'
import type { OvertimeMonthRow } from './types'

/** searchParams の ym を検証し、不正時は JST 現在月 */
export function parseYearMonthOrDefault(ym: string | string[] | undefined | null): string {
  const raw = Array.isArray(ym) ? ym[0] : ym
  if (!raw || !/^\d{4}-\d{2}$/.test(raw)) return getJSTYearMonth()
  const [y, m] = raw.split('-').map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return getJSTYearMonth()
  }
  return raw
}

/** 前月 / 翌月の YYYY-MM（暦操作はローカル Date） */
export function shiftYearMonth(ym: string, deltaMonths: number): string {
  const [ys, ms] = ym.split('-')
  const y = Number(ys)
  const m = Number(ms)
  const d = new Date(y, m - 1 + deltaMonths, 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

function enumerateDaysYmdInMonth(yearMonth: string): string[] {
  const lastYmd = lastDayOfMonthYmd(yearMonth)
  const lastDay = Number(lastYmd.split('-')[2])
  const pad = (n: number) => String(n).padStart(2, '0')
  const days: string[] = []
  for (let d = 1; d <= lastDay; d++) {
    days.push(`${yearMonth}-${pad(d)}`)
  }
  return days
}

type WtrRow = Pick<
  Database['public']['Tables']['work_time_records']['Row'],
  'record_date' | 'start_time' | 'end_time' | 'is_holiday'
>

type OtRow = Pick<
  Database['public']['Tables']['overtime_applications']['Row'],
  | 'work_date'
  | 'overtime_start'
  | 'overtime_end'
  | 'requested_hours'
  | 'reason'
  | 'status'
  | 'created_at'
>

/**
 * 指定月の暦日ごとに勤怠・残業申請を結合した一覧を返す
 */
export async function getOvertimeApplicationMonthRows(
  supabase: SupabaseClient<Database>,
  employeeId: string,
  yearMonth: string,
): Promise<OvertimeMonthRow[]> {
  const firstDay = `${yearMonth}-01`
  const lastDay = lastDayOfMonthYmd(yearMonth)
  const dayList = enumerateDaysYmdInMonth(yearMonth)

  const [wtrRes, otRes] = await Promise.all([
    supabase
      .from('work_time_records')
      .select('record_date, start_time, end_time, is_holiday')
      .eq('employee_id', employeeId)
      .gte('record_date', firstDay)
      .lte('record_date', lastDay),
    supabase
      .from('overtime_applications')
      .select(
        'work_date, overtime_start, overtime_end, requested_hours, reason, status, created_at',
      )
      .eq('employee_id', employeeId)
      .gte('work_date', firstDay)
      .lte('work_date', lastDay)
      .order('created_at', { ascending: false }),
  ])

  const wtrByDate = new Map<string, WtrRow>()
  if (wtrRes.data) {
    for (const row of wtrRes.data) {
      wtrByDate.set(row.record_date, row)
    }
  }

  // 同一日は created_at 降順の先頭のみ（最新申請）
  const otByDate = new Map<string, OtRow>()
  if (otRes.data) {
    for (const row of otRes.data) {
      const key = row.work_date
      if (!otByDate.has(key)) otByDate.set(key, row)
    }
  }

  return dayList.map((workDate): OvertimeMonthRow => {
    const wtr = wtrByDate.get(workDate)
    const ot = otByDate.get(workDate)

    const clockInDisplay = wtr?.start_time
      ? formatTimeInJSTFromIso(wtr.start_time) ?? null
      : null
    const clockOutDisplay = wtr?.end_time
      ? formatTimeInJSTFromIso(wtr.end_time) ?? null
      : null

    let overtimeStartDisplay: string | null = null
    let overtimeEndDisplay: string | null = null
    let overtimeHoursDisplay: string | null = null
    let reasonDisplay: string | null = null
    let statusDisplay: string | null = null

    if (ot) {
      overtimeStartDisplay = ot.overtime_start
        ? formatTimeInJSTFromIso(ot.overtime_start) ?? null
        : null
      overtimeEndDisplay = ot.overtime_end
        ? formatTimeInJSTFromIso(ot.overtime_end) ?? null
        : null
      overtimeHoursDisplay =
        ot.requested_hours != null ? `${Number(ot.requested_hours).toFixed(2)} 時間` : null
      reasonDisplay = ot.reason?.trim() ? ot.reason : null
      statusDisplay = ot.status ?? null
    }

    const isLeaveDay = wtr?.is_holiday === true

    return {
      workDate,
      clockInDisplay,
      clockOutDisplay,
      overtimeStartDisplay,
      overtimeEndDisplay,
      overtimeHoursDisplay,
      reasonDisplay,
      statusDisplay,
      isLeaveDay,
      overtimeStartIso: ot?.overtime_start ?? null,
      overtimeEndIso: ot?.overtime_end ?? null,
      reasonRaw: ot?.reason ?? null,
    }
  })
}
