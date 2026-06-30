import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'

/** 無料プランの月次 AI 利用上限（機能ごと） */
export const AI_MONTHLY_FREE_LIMIT = 10

export type AiFeatureName =
  | 'talent-draft'
  | 'job-posting-memo'
  | 'job-posting-branding-diff'
  | 'job-posting-branding-variants'

export type AiUsageContext = {
  supabase: Awaited<ReturnType<typeof createClient>>
  tenantId: string
  isUnlimited: boolean
}

/** 認証済みテナントの AI 利用コンテキストを取得 */
export async function getAiUsageContext(): Promise<
  { ok: true; data: AiUsageContext } | { ok: false; error: string }
> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { ok: false, error: 'テナント情報が見つかりません。ログインし直してください。' }
  }
  const isUnlimited = user.planType === 'pro' || user.planType === 'enterprise'
  const supabase = await createClient()
  return { ok: true, data: { supabase, tenantId: user.tenant_id, isUnlimited } }
}

/**
 * 月次利用上限を原子的に消費する（TOCTOU 対策）。
 * Pro/Enterprise は上限チェックをスキップし、ログのみ記録する。
 */
export async function tryConsumeAiUsage(
  ctx: AiUsageContext,
  featureName: AiFeatureName,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (ctx.isUnlimited) {
    await ctx.supabase.from('ai_usage_logs').insert({
      tenant_id: ctx.tenantId,
      feature_name: featureName,
    })
    return { ok: true }
  }

  const { data, error } = await (
    ctx.supabase as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: boolean | null; error: { message: string } | null }>
    }
  ).rpc('try_consume_ai_usage', {
    p_tenant_id: ctx.tenantId,
    p_feature_name: featureName,
    p_max_count: AI_MONTHLY_FREE_LIMIT,
  })

  if (error) {
    console.error('[AI usage] try_consume_ai_usage error:', error)
    return { ok: false, error: '利用回数の確認に失敗しました。' }
  }

  if (data !== true) {
    return {
      ok: false,
      error:
        '今月のAI無料利用チケット（10回）の上限に達しました。無制限でご利用いただくにはProプランへのアップグレードをご検討ください。',
    }
  }

  return { ok: true }
}

/** 今月の利用回数（表示用） */
export async function getMonthlyAiUsageCount(
  tenantId: string,
  featureName: AiFeatureName,
): Promise<number> {
  const supabase = await createClient()
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('feature_name', featureName)
    .gte('created_at', startOfMonth.toISOString())

  if (error) {
    console.error('[AI usage] count fetch error:', error)
    return 0
  }
  return count ?? 0
}
