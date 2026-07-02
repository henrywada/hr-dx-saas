import { createClient } from '@/lib/supabase/server'
import type { EngagementStatus } from './alert-transition-detector'

/**
 * 今回のスナップショット記録前の、指定した部署ごとの最新 status を取得する（遷移検知の比較対象）。
 *
 * turnover-risk の getLatestRiskLevelsBeforeUpdate は「最新バッチのタイムスタンプ」で一括取得する
 * 方式だが、これは毎回必ず同じ母集団（全従業員）を対象にする turnover-risk では安全でも、
 * layer フィルタにより記録対象の部署集合が実行のたびに変わりうる本機能では成立しない
 * （例：layer2 を記録した翌日に layer3 を記録すると、直近バッチには layer2 の部署が
 * 1件も含まれず、継続してalertの部署が「初回alert」と誤検知され再通知されてしまう）。
 * そのため、対象部署ごとに個別に最新の1件を取得する。
 */
export async function getLatestDivisionStatusesBeforeUpdate(
  tenantId: string,
  divisionIds: string[]
): Promise<Map<string, EngagementStatus>> {
  if (divisionIds.length === 0) return new Map()

  const supabase = await createClient()

  const results = await Promise.all(
    divisionIds.map(async divisionId => {
      const { data } = await supabase
        .from('engagement_department_scores')
        .select('status')
        .eq('tenant_id', tenantId)
        .eq('division_id', divisionId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return { divisionId, status: data?.status as EngagementStatus | undefined }
    })
  )

  const latest = new Map<string, EngagementStatus>()
  for (const r of results) {
    if (r.status) latest.set(r.divisionId, r.status)
  }
  return latest
}

/**
 * 直近 sinceMinutesAgo 分以内に既に通知送信済み（status='sent'）の部署IDを取得する。
 * 二重クリック等による同時実行で同一遷移に対する重複通知が発生するのを防ぐための簡易ガード
 * （turnover-risk/notification-queries.ts の getRecentlyNotifiedEmployeeIds と同型）。
 */
export async function getRecentlyNotifiedDivisionIds(
  tenantId: string,
  divisionIds: string[],
  sinceMinutesAgo = 15
): Promise<Set<string>> {
  if (divisionIds.length === 0) return new Set()

  const supabase = await createClient()
  const since = new Date(Date.now() - sinceMinutesAgo * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('engagement_department_alerts')
    .select('division_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'sent')
    .in('division_id', divisionIds)
    .gte('notified_at', since)

  if (error || !data) return new Set()
  return new Set(data.map(row => row.division_id))
}
