import { createClient } from '@/lib/supabase/server'
import type { RiskLevel } from './types'

/**
 * 今回のスコア再計算前の、従業員ごとの最新 risk_level を取得する（遷移検知の比較対象）。
 * 1回の再計算は全従業員分を同一 calculated_at で一括insertするため（actions.ts参照）、
 * 「直近500件」のような件数制限では大規模テナントで一部従業員が取りこぼされ、
 * 誤って「初回high検知」として再通知されてしまう。そのため最新バッチのタイムスタンプを
 * 特定し、そのバッチに属する全行を取得する。
 */
export async function getLatestRiskLevelsBeforeUpdate(
  tenantId: string
): Promise<Map<string, RiskLevel>> {
  const supabase = await createClient()

  const { data: latestBatch } = await supabase
    .from('turnover_risk_scores')
    .select('calculated_at')
    .eq('tenant_id', tenantId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestBatch) return new Map()

  const { data, error } = await supabase
    .from('turnover_risk_scores')
    .select('employee_id, risk_level')
    .eq('tenant_id', tenantId)
    .eq('calculated_at', latestBatch.calculated_at)

  if (error || !data) return new Map()

  const latest = new Map<string, RiskLevel>()
  for (const row of data) {
    latest.set(row.employee_id, row.risk_level as RiskLevel)
  }
  return latest
}

/**
 * 直近 sinceMinutesAgo 分以内に既に通知送信済み（status='sent'）の従業員IDを取得する。
 * 二重クリック等による同時実行で同一遷移に対する重複通知が発生するのを防ぐための簡易ガード。
 */
export async function getRecentlyNotifiedEmployeeIds(
  tenantId: string,
  employeeIds: string[],
  sinceMinutesAgo = 15
): Promise<Set<string>> {
  if (employeeIds.length === 0) return new Set()

  const supabase = await createClient()
  const since = new Date(Date.now() - sinceMinutesAgo * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('turnover_risk_alerts')
    .select('employee_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'sent')
    .in('employee_id', employeeIds)
    .gte('notified_at', since)

  if (error || !data) return new Set()
  return new Set(data.map(row => row.employee_id))
}

export interface EmployeeDisplayInfo {
  name: string
  division_id: string | null
  department_name: string | null
}

/** 通知対象従業員の氏名・部署情報を取得する */
export async function getEmployeeDisplayInfo(
  tenantId: string,
  employeeIds: string[]
): Promise<Map<string, EmployeeDisplayInfo>> {
  if (employeeIds.length === 0) return new Map()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .eq('tenant_id', tenantId)
    .in('id', employeeIds)

  if (error || !data) return new Map()

  const result = new Map<string, EmployeeDisplayInfo>()
  for (const emp of data) {
    const divisionData = emp.divisions as { name: string } | { name: string }[] | null
    const departmentName = Array.isArray(divisionData)
      ? (divisionData[0]?.name ?? null)
      : (divisionData?.name ?? null)
    result.set(emp.id, {
      name: emp.name ?? '',
      division_id: emp.division_id,
      department_name: departmentName,
    })
  }
  return result
}

// getDivisionManagerEmployeeIds / getHrDigestRecipientEmployeeIds は
// ドメイン非依存の汎用クエリのため @/lib/notifications/recipient-queries に移設した。
// turnover-risk / engagement 双方から同一実装を参照する。
