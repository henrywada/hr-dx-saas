// src/features/recognition/mvp-candidates.ts
// 月次 MVP 候補のランキングロジック（テスト可能な純粋関数）

import type { MvpCandidate } from './types'

export interface MvpCandidateAggregate {
  employee_id: string
  employee_name: string
  division_name: string
  received_count: number
  sender_ids: Set<string>
  value_tag_counts: Map<string, number>
}

/** JST 基準の先月 YYYY-MM を返す */
export function getPreviousMonthPeriodLabel(date = new Date()): string {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
  const [y, m] = ymd.slice(0, 7).split('-').map(Number)
  if (m === 1) return `${y - 1}-12`
  return `${y}-${String(m - 1).padStart(2, '0')}`
}

/** YYYY-MM の JST 月次範囲 [start, end) を UTC ISO で返す */
export function jstMonthRangeUtc(periodLabel: string): { startIso: string; endIso: string } {
  const [year, month] = periodLabel.split('-').map(Number)
  const startIso = new Date(`${periodLabel}-01T00:00:00+09:00`).toISOString()
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextLabel = `${nextYear}-${String(nextMonth).padStart(2, '0')}`
  const endIso = new Date(`${nextLabel}-01T00:00:00+09:00`).toISOString()
  return { startIso, endIso }
}

function topValueTag(counts: Map<string, number>): string | null {
  let best: string | null = null
  let bestCount = 0
  for (const [tag, count] of counts) {
    if (count > bestCount) {
      best = tag
      bestCount = count
    }
  }
  return best
}

/** 集計結果から MVP 候補リストを生成する */
export function buildMvpCandidateList(
  aggregates: MvpCandidateAggregate[],
  periodLabel: string,
  alreadyAwardedEmployeeIds: Set<string>,
  limit = 5
): MvpCandidate[] {
  return aggregates
    .filter(a => a.received_count > 0)
    .sort((a, b) => {
      if (b.received_count !== a.received_count) return b.received_count - a.received_count
      return b.sender_ids.size - a.sender_ids.size
    })
    .slice(0, limit)
    .map(a => {
      const uniqueSenders = a.sender_ids.size
      const topTag = topValueTag(a.value_tag_counts)
      const tagPart = topTag ? `、最多バリュー「${topTag}」` : ''
      return {
        employee_id: a.employee_id,
        employee_name: a.employee_name,
        division_name: a.division_name,
        received_count: a.received_count,
        unique_sender_count: uniqueSenders,
        top_value_tag: topTag,
        already_awarded: alreadyAwardedEmployeeIds.has(a.employee_id),
        suggest_comment: `${periodLabel}月間、Kudos受信${a.received_count}件（${uniqueSenders}名から）${tagPart}`,
      }
    })
}
