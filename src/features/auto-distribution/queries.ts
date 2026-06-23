import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type { AutoDistributionRule, AutoDistributionLog } from './types'

/** 配信ルール一覧取得 */
export async function getAutoDistributionRules(): Promise<AutoDistributionRule[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('auto_distribution_rules')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getAutoDistributionRules error:', error)
    return []
  }
  return (data ?? []) as AutoDistributionRule[]
}

/** 配信ルール詳細取得 */
export async function getAutoDistributionRuleById(
  id: string
): Promise<AutoDistributionRule | null> {
  const user = await getServerUser()
  if (!user?.tenant_id) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('auto_distribution_rules')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (error) {
    console.error('getAutoDistributionRuleById error:', error)
    return null
  }
  return data as AutoDistributionRule
}

/** ルールごとの実行履歴取得（最新順） */
export async function getAutoDistributionLogs(ruleId: string): Promise<AutoDistributionLog[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('auto_distribution_logs')
    .select('*')
    .eq('rule_id', ruleId)
    .eq('tenant_id', user.tenant_id)
    .order('executed_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('getAutoDistributionLogs error:', error)
    return []
  }
  return (data ?? []) as unknown as AutoDistributionLog[]
}
