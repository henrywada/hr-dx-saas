'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { executeRule } from './engine'
import { getAutoDistributionLogs } from './queries'
import type {
  AutoDistributionLog,
  AutoDistributionRule,
  ExecuteRuleResult,
  UpsertAutoDistributionRuleInput,
} from './types'

/** ルールごとの実行履歴取得（Client Component から呼べるよう Server Action として公開） */
export async function fetchRuleHistory(ruleId: string): Promise<AutoDistributionLog[]> {
  return getAutoDistributionLogs(ruleId)
}

/** 配信ルールを新規作成する */
export async function createAutoDistributionRule(
  input: UpsertAutoDistributionRuleInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) {
    return { success: false, error: 'テナント情報が見つかりません。ログインし直してください。' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('auto_distribution_rules')
    .insert({
      tenant_id: user.tenant_id,
      created_by: user.employee_id,
      ...input,
    })
    .select('id')
    .single()

  if (error) {
    console.error('createAutoDistributionRule error:', error)
    return { success: false, error: '配信ルールの作成に失敗しました。' }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_AUTO_DISTRIBUTION)
  return { success: true, id: data.id }
}

/** 配信ルールを更新する */
export async function updateAutoDistributionRule(
  ruleId: string,
  input: Partial<UpsertAutoDistributionRuleInput>
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'テナント情報が見つかりません。ログインし直してください。' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('auto_distribution_rules')
    .update(input)
    .eq('id', ruleId)
    .eq('tenant_id', user.tenant_id)

  if (error) {
    console.error('updateAutoDistributionRule error:', error)
    return { success: false, error: '配信ルールの更新に失敗しました。' }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_AUTO_DISTRIBUTION)
  return { success: true }
}

/** 配信ルールを削除する */
export async function deleteAutoDistributionRule(
  ruleId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'テナント情報が見つかりません。ログインし直してください。' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('auto_distribution_rules')
    .delete()
    .eq('id', ruleId)
    .eq('tenant_id', user.tenant_id)

  if (error) {
    console.error('deleteAutoDistributionRule error:', error)
    return { success: false, error: '配信ルールの削除に失敗しました。' }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_AUTO_DISTRIBUTION)
  return { success: true }
}

/**
 * 配信ルールを即時テスト実行する（cronを経由せず、テナント管理者の操作で直接実行）。
 * RLSが有効な createClient() のみを使用し、createAdminClient() は使わない。
 */
export async function runRuleNow(
  ruleId: string
): Promise<{ success: boolean; result?: ExecuteRuleResult; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: 'テナント情報が見つかりません。ログインし直してください。' }
  }

  const supabase = await createClient()
  const { data: rule, error: fetchError } = await supabase
    .from('auto_distribution_rules')
    .select('*')
    .eq('id', ruleId)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (fetchError || !rule) {
    console.error('runRuleNow fetch error:', fetchError)
    return { success: false, error: '配信ルールが見つかりません。' }
  }

  const result = await executeRule(supabase, rule as AutoDistributionRule, 'manual')

  revalidatePath(APP_ROUTES.TENANT.ADMIN_AUTO_DISTRIBUTION)
  return { success: true, result }
}
