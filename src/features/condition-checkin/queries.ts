// src/features/condition-checkin/queries.ts

import { createClient } from '@/lib/supabase/server'
import { toJSTDateString } from '@/lib/datetime'
import type { ConditionCheckin, ConditionTrendPoint, DivisionConditionTrendPoint } from './types'

export async function getTodayCheckin(employeeId: string): Promise<ConditionCheckin | null> {
  const supabase = await createClient()
  const todayYmd = toJSTDateString()

  const { data, error } = await supabase
    .from('condition_checkins')
    .select('id, tenant_id, employee_id, score, memo, checkin_date, created_at')
    .eq('employee_id', employeeId)
    .eq('checkin_date', todayYmd)
    .maybeSingle()

  if (error) {
    console.error('getTodayCheckin error:', error)
    return null
  }
  return data
}

/**
 * 直近 days 日分のチェックイン履歴を、欠損日を score: null で埋めた連続シリーズに変換する。
 * グラフの connectNulls 表示・トレンド境界判定のための純粋関数。
 */
export function buildTrendSeries(
  rows: { checkin_date: string; score: number }[],
  days: number,
  todayYmd: string
): ConditionTrendPoint[] {
  const scoreByDate = new Map(rows.map(row => [row.checkin_date, row.score]))
  const today = new Date(`${todayYmd}T00:00:00+09:00`)

  const series: ConditionTrendPoint[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const d = new Date(today)
    d.setDate(d.getDate() - offset)
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    series.push({ checkin_date: ymd, score: scoreByDate.get(ymd) ?? null })
  }
  return series
}

function subtractDaysFromYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00+09:00`)
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function getMyCheckinTrend(
  employeeId: string,
  days = 30
): Promise<ConditionTrendPoint[]> {
  const supabase = await createClient()
  const todayYmd = toJSTDateString()
  const startYmd = subtractDaysFromYmd(todayYmd, days - 1)

  const { data, error } = await supabase
    .from('condition_checkins')
    .select('checkin_date, score')
    .eq('employee_id', employeeId)
    .gte('checkin_date', startYmd)
    .lte('checkin_date', todayYmd)

  if (error) {
    console.error('getMyCheckinTrend error:', error)
    return buildTrendSeries([], days, todayYmd)
  }

  return buildTrendSeries(data || [], days, todayYmd)
}

export async function getDivisionConditionTrend(
  divisionId: string,
  days = 30
): Promise<DivisionConditionTrendPoint[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_division_condition_trend', {
    p_division_id: divisionId,
    p_days: days,
  })

  if (error) {
    console.error('getDivisionConditionTrend error:', error)
    return []
  }
  return data || []
}
