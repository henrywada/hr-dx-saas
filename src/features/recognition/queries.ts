// src/features/recognition/queries.ts

import { createClient } from '@/lib/supabase/server'
import type {
  KudosDivisionStat,
  KudosFeedItem,
  KudosPersonalRanking,
  KudosRecipient,
  MvpCandidate,
} from './types'
import {
  buildMvpCandidateList,
  getPreviousMonthPeriodLabel,
  jstMonthRangeUtc,
  type MvpCandidateAggregate,
} from './mvp-candidates'

const RECENT_NOTICE_DAYS = 7
const STATS_PERIOD_DAYS = 30
const UNASSIGNED_DIVISION_LABEL = '未配属'

function employeeName(row: unknown): string {
  const employee = row as { name: string | null } | null
  return employee?.name ?? '（不明）'
}

/** 全社フィード表示（新着順）。recipients/reactionCount/hasReactedByMe/isRelatedToMeを付与する */
export async function getKudosFeed(employeeId: string, limit = 30): Promise<KudosFeedItem[]> {
  const supabase = await createClient()

  const { data: kudosRows, error } = await supabase
    .from('kudos')
    .select(
      'id, tenant_id, sender_employee_id, message, value_tag, created_at, employees!kudos_sender_employee_id_fkey(name)'
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getKudosFeed error:', error)
    return []
  }
  if (!kudosRows || kudosRows.length === 0) return []

  const kudosIds = kudosRows.map(k => k.id)

  const [
    { data: recipientRows, error: recipientError },
    { data: reactionRows, error: reactionError },
  ] = await Promise.all([
    supabase
      .from('kudos_recipients')
      .select('kudos_id, employee_id, employees!kudos_recipients_employee_id_fkey(name)')
      .in('kudos_id', kudosIds),
    supabase.from('kudos_reactions').select('kudos_id, employee_id').in('kudos_id', kudosIds),
  ])

  if (recipientError) console.error('getKudosFeed (recipients) error:', recipientError)
  if (reactionError) console.error('getKudosFeed (reactions) error:', reactionError)

  const recipientsByKudosId = new Map<string, KudosRecipient[]>()
  for (const row of recipientRows ?? []) {
    const list = recipientsByKudosId.get(row.kudos_id) ?? []
    list.push({ employee_id: row.employee_id, employee_name: employeeName(row.employees) })
    recipientsByKudosId.set(row.kudos_id, list)
  }

  const reactionsByKudosId = new Map<string, string[]>()
  for (const row of reactionRows ?? []) {
    const list = reactionsByKudosId.get(row.kudos_id) ?? []
    list.push(row.employee_id)
    reactionsByKudosId.set(row.kudos_id, list)
  }

  return kudosRows.map(row => {
    const recipients = recipientsByKudosId.get(row.id) ?? []
    const reactors = reactionsByKudosId.get(row.id) ?? []
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      sender_employee_id: row.sender_employee_id,
      sender_name: employeeName(row.employees),
      message: row.message,
      value_tag: row.value_tag,
      created_at: row.created_at,
      recipients,
      reactionCount: reactors.length,
      hasReactedByMe: reactors.includes(employeeId),
      isRelatedToMe:
        row.sender_employee_id === employeeId || recipients.some(r => r.employee_id === employeeId),
    }
  })
}

/** /top通知ウィジェット向け: 直近7日間に自分宛のKudosが届いた件数 */
export async function getRecentKudosCountForRecipient(employeeId: string): Promise<number> {
  const supabase = await createClient()
  const sinceIso = new Date(Date.now() - RECENT_NOTICE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('kudos_recipients')
    .select('kudos_id, kudos(created_at)')
    .eq('employee_id', employeeId)

  if (error) {
    console.error('getRecentKudosCountForRecipient error:', error)
    return 0
  }

  return (data ?? []).filter(row => {
    const kudos = row.kudos as unknown as { created_at: string } | null
    return kudos && kudos.created_at >= sinceIso
  }).length
}

function divisionOf(row: unknown): { id: string | null; name: string } {
  const division = row as { id: string; name: string | null } | null
  return { id: division?.id ?? null, name: division?.name ?? UNASSIGNED_DIVISION_LABEL }
}

/** 管理者向け集計: 直近periodDays日の部署別 送信・受信件数 */
export async function getKudosStatsByDivision(
  periodDays = STATS_PERIOD_DAYS
): Promise<KudosDivisionStat[]> {
  const supabase = await createClient()
  const sinceIso = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: employees, error: employeesError }, { data: kudosRows, error: kudosError }] =
    await Promise.all([
      supabase.from('employees').select('id, division:division_id(id, name)'),
      supabase
        .from('kudos')
        .select('id, sender_employee_id, created_at')
        .gte('created_at', sinceIso),
    ])

  if (employeesError) {
    console.error('getKudosStatsByDivision (employees) error:', employeesError)
    return []
  }
  if (kudosError) {
    console.error('getKudosStatsByDivision (kudos) error:', kudosError)
    return []
  }

  const kudosIds = (kudosRows ?? []).map(k => k.id)
  const { data: recipientRows, error: recipientError } = kudosIds.length
    ? await supabase
        .from('kudos_recipients')
        .select('kudos_id, employee_id')
        .in('kudos_id', kudosIds)
    : { data: [], error: null }
  if (recipientError) console.error('getKudosStatsByDivision (recipients) error:', recipientError)

  const divisionByEmployeeId = new Map<string, { id: string | null; name: string }>()
  for (const emp of employees ?? []) {
    divisionByEmployeeId.set(emp.id, divisionOf(emp.division))
  }

  const statsByDivisionKey = new Map<string, KudosDivisionStat>()
  const ensureStat = (divisionId: string | null, divisionName: string): KudosDivisionStat => {
    const key = divisionId ?? 'unassigned'
    const existing = statsByDivisionKey.get(key)
    if (existing) return existing
    const created: KudosDivisionStat = {
      division_id: divisionId,
      division_name: divisionName,
      sentCount: 0,
      receivedCount: 0,
    }
    statsByDivisionKey.set(key, created)
    return created
  }

  for (const row of kudosRows ?? []) {
    const division = divisionByEmployeeId.get(row.sender_employee_id) ?? {
      id: null,
      name: UNASSIGNED_DIVISION_LABEL,
    }
    ensureStat(division.id, division.name).sentCount += 1
  }

  for (const row of recipientRows ?? []) {
    const division = divisionByEmployeeId.get(row.employee_id) ?? {
      id: null,
      name: UNASSIGNED_DIVISION_LABEL,
    }
    ensureStat(division.id, division.name).receivedCount += 1
  }

  return Array.from(statsByDivisionKey.values()).sort(
    (a, b) => b.sentCount + b.receivedCount - (a.sentCount + a.receivedCount)
  )
}

/** 管理者向け集計: 直近periodDays日の個人別 送信・受信件数ランキング */
export async function getKudosPersonalRanking(
  periodDays = STATS_PERIOD_DAYS,
  limit = 10
): Promise<KudosPersonalRanking[]> {
  const supabase = await createClient()
  const sinceIso = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: kudosRows, error } = await supabase
    .from('kudos')
    .select('id, sender_employee_id, created_at, employees!kudos_sender_employee_id_fkey(name)')
    .gte('created_at', sinceIso)

  if (error) {
    console.error('getKudosPersonalRanking error:', error)
    return []
  }
  if (!kudosRows || kudosRows.length === 0) return []

  const kudosIds = kudosRows.map(k => k.id)
  const { data: recipientRows, error: recipientError } = await supabase
    .from('kudos_recipients')
    .select('kudos_id, employee_id, employees!kudos_recipients_employee_id_fkey(name)')
    .in('kudos_id', kudosIds)
  if (recipientError) console.error('getKudosPersonalRanking (recipients) error:', recipientError)

  const rankingByEmployeeId = new Map<string, KudosPersonalRanking>()
  const ensureRanking = (employeeId: string, employeeNameValue: string): KudosPersonalRanking => {
    const existing = rankingByEmployeeId.get(employeeId)
    if (existing) return existing
    const created: KudosPersonalRanking = {
      employee_id: employeeId,
      employee_name: employeeNameValue,
      sentCount: 0,
      receivedCount: 0,
    }
    rankingByEmployeeId.set(employeeId, created)
    return created
  }

  for (const row of kudosRows) {
    ensureRanking(row.sender_employee_id, employeeName(row.employees)).sentCount += 1
  }
  for (const row of recipientRows ?? []) {
    ensureRanking(row.employee_id, employeeName(row.employees)).receivedCount += 1
  }

  return Array.from(rankingByEmployeeId.values())
    .sort((a, b) => b.sentCount + b.receivedCount - (a.sentCount + a.receivedCount))
    .slice(0, limit)
}

/** 有効なバリュータグ一覧（投稿フォーム用） */
export async function getActiveValueTags(): Promise<string[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('kudos_value_tags')
    .select('name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('getActiveValueTags error:', error)
    return []
  }

  return (data ?? []).map(row => row.name)
}

/** 管理者向けバリュータグ一覧 */
export async function getValueTagsForAdmin(): Promise<
  import('./types').KudosValueTag[]
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('kudos_value_tags')
    .select('id, tenant_id, name, sort_order, is_active')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('getValueTagsForAdmin error:', error)
    return []
  }

  return data ?? []
}

const UNASSIGNED_FOR_MVP = '未配属'

/** K-C1 / E-S2: 月次 Kudos 受信数に基づく MVP 表彰候補（先月デフォルト） */
export async function getMonthlyMvpCandidates(
  periodLabel?: string,
  limit = 5
): Promise<{ periodLabel: string; candidates: MvpCandidate[] }> {
  const label = periodLabel ?? getPreviousMonthPeriodLabel()
  const { startIso, endIso } = jstMonthRangeUtc(label)
  const supabase = await createClient()

  const [
    { data: kudosRows, error: kudosError },
    { data: awardRows, error: awardError },
    { data: employees, error: employeesError },
  ] = await Promise.all([
    supabase
      .from('kudos')
      .select('id, sender_employee_id, value_tag, created_at')
      .gte('created_at', startIso)
      .lt('created_at', endIso),
    supabase.from('awards').select('recipient_employee_id').eq('period_label', label),
    supabase.from('employees').select('id, name, division:division_id(name)'),
  ])

  if (kudosError) console.error('getMonthlyMvpCandidates (kudos) error:', kudosError)
  if (awardError) console.error('getMonthlyMvpCandidates (awards) error:', awardError)
  if (employeesError) console.error('getMonthlyMvpCandidates (employees) error:', employeesError)

  const alreadyAwarded = new Set((awardRows ?? []).map(r => r.recipient_employee_id))

  const employeeMeta = new Map<string, { name: string; division_name: string }>()
  for (const emp of employees ?? []) {
    const div = emp.division as { name: string | null } | null
    employeeMeta.set(emp.id, {
      name: emp.name ?? '（不明）',
      division_name: div?.name ?? UNASSIGNED_FOR_MVP,
    })
  }

  const kudosIds = (kudosRows ?? []).map(k => k.id)
  const { data: recipientRows, error: recipientError } = kudosIds.length
    ? await supabase
        .from('kudos_recipients')
        .select('kudos_id, employee_id')
        .in('kudos_id', kudosIds)
    : { data: [], error: null }
  if (recipientError) console.error('getMonthlyMvpCandidates (recipients) error:', recipientError)

  const kudosById = new Map((kudosRows ?? []).map(k => [k.id, k]))
  const aggregateByEmployee = new Map<string, MvpCandidateAggregate>()

  for (const row of recipientRows ?? []) {
    const kudos = kudosById.get(row.kudos_id)
    if (!kudos) continue

    const meta = employeeMeta.get(row.employee_id) ?? {
      name: '（不明）',
      division_name: UNASSIGNED_FOR_MVP,
    }

    let agg = aggregateByEmployee.get(row.employee_id)
    if (!agg) {
      agg = {
        employee_id: row.employee_id,
        employee_name: meta.name,
        division_name: meta.division_name,
        received_count: 0,
        sender_ids: new Set(),
        value_tag_counts: new Map(),
      }
      aggregateByEmployee.set(row.employee_id, agg)
    }

    agg.received_count += 1
    agg.sender_ids.add(kudos.sender_employee_id)
    if (kudos.value_tag) {
      agg.value_tag_counts.set(kudos.value_tag, (agg.value_tag_counts.get(kudos.value_tag) ?? 0) + 1)
    }
  }

  const candidates = buildMvpCandidateList(
    Array.from(aggregateByEmployee.values()),
    label,
    alreadyAwarded,
    limit
  )

  return { periodLabel: label, candidates }
}
