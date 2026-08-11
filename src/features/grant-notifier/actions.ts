'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'
import { writeAuditLog } from '@/lib/log/actions'
import { APP_ROUTES } from '@/config/routes'
import type { BatchStep } from '@/features/grant-notifier/types'
import { ALL_STEPS, runGrantNotifierBatch } from '@/features/grant-notifier/batch/run'

/**
 * 助成金情報配信の書き込み（Server Actions）。
 * テナント向けの操作は RLS が効くサーバークライアントで行う（createAdminClient は使わない）。
 */

export interface ActionResult {
  ok: boolean
  error?: string
}

const conditionsSchema = z.object({
  industries: z.array(z.string()),
  employeeCount: z.number().int().min(0).max(10_000_000).nullable(),
  capital: z.number().int().min(0).nullable(),
  prefectures: z.array(z.string()),
  categories: z.array(z.string()),
  keywords: z.string().max(500),
  notifyEmails: z.array(z.email('メールアドレスの形式が正しくありません')).max(20),
  deliveryFrequency: z.enum(['weekly', 'monthly']),
})

export type SaveConditionsInput = z.infer<typeof conditionsSchema>

/**
 * 配信条件を保存する。
 * 編集はテナント管理者のみ（RLS でも強制されるが、分かりやすいエラーのため UI 側でも弾く）。
 */
export async function saveGrantConditions(input: SaveConditionsInput): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { ok: false, error: 'ログインが必要です' }
  if (user.appRole === 'employee') {
    return { ok: false, error: '配信条件を編集する権限がありません' }
  }

  const parsed = conditionsSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '入力内容を確認してください' }
  }
  const c = parsed.data

  const supabase = await createClient()
  const { error } = await supabase.from('grant_tenant_conditions').upsert(
    {
      tenant_id: user.tenant_id,
      industries: c.industries,
      employee_count: c.employeeCount,
      capital: c.capital,
      prefectures: c.prefectures,
      categories: c.categories,
      keywords: c.keywords.trim() === '' ? null : c.keywords.trim(),
      notify_emails: c.notifyEmails,
      delivery_frequency: c.deliveryFrequency,
    },
    { onConflict: 'tenant_id' }
  )

  if (error) {
    console.error('[grant-notifier] 配信条件の保存に失敗しました:', error.message)
    return { ok: false, error: '保存に失敗しました' }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_GRANT_NOTIFIER_CONDITIONS)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_GRANT_NOTIFIER)
  return { ok: true }
}

export interface TriggerBatchResult extends ActionResult {
  steps?: { step: string; status: string; processedCount: number; errorMessage?: string }[]
}

/**
 * 助成金情報配信バッチを手動実行する（/saas_adm/grant-notifier）。
 * SaaS 管理者専用の状態変更操作のため、成否に関わらず監査ログを残す。
 */
export async function triggerGrantBatch(
  steps: BatchStep[] = ALL_STEPS
): Promise<TriggerBatchResult> {
  const user = await getServerUser()
  if (!user || (user.role !== 'supaUser' && user.appRole !== 'developer')) {
    return { ok: false, error: '権限がありません' }
  }

  const requested = steps.filter(s => ALL_STEPS.includes(s))
  if (requested.length === 0) {
    return { ok: false, error: '実行するステップを指定してください' }
  }

  await writeAuditLog({
    action: 'grant_notifier.batch.rerun',
    path: APP_ROUTES.SAAS.GRANT_NOTIFIER,
    details: { steps: requested },
  })

  const summary = await runGrantNotifierBatch(requested)
  revalidatePath(APP_ROUTES.SAAS.GRANT_NOTIFIER)

  return {
    ok: !summary.hasFailure,
    error: summary.hasFailure ? '一部のステップが失敗しました' : undefined,
    steps: summary.steps.map(s => ({
      step: s.step,
      status: s.status,
      processedCount: s.processedCount,
      errorMessage: s.errorMessage,
    })),
  }
}

/**
 * バッチ実行履歴を1件削除する（/saas_adm/grant-notifier）。
 * 設定ミス等で失敗した古いログを片付けるための運用操作。
 *
 * grant_batch_runs は SELECT ポリシーしか持たない（書込はバッチの service_role のみ）ため、
 * SaaS管理者の削除には createAdminClient を使う。エンドユーザー向けではない
 * SaaS運営専用の操作であり、saas-law-knowledge/actions.ts と同じ扱い。
 * 権限確認と監査ログを必ず先に行う。
 */
export async function deleteGrantBatchRun(runId: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user || (user.role !== 'supaUser' && user.appRole !== 'developer')) {
    return { ok: false, error: '権限がありません' }
  }

  if (!z.uuid().safeParse(runId).success) {
    return { ok: false, error: '対象の指定が正しくありません' }
  }

  await writeAuditLog({
    action: 'grant_notifier.batch_run.delete',
    path: APP_ROUTES.SAAS.GRANT_NOTIFIER,
    details: { runId },
  })

  const supabase = createAdminClient()
  // 実行中のログは消さない（進行中のバッチの記録を失わないため）
  const { error } = await supabase
    .from('grant_batch_runs')
    .delete()
    .eq('id', runId)
    .neq('status', 'running')

  if (error) {
    console.error('[grant-notifier] バッチ実行履歴の削除に失敗しました:', error.message)
    return { ok: false, error: '削除に失敗しました' }
  }

  revalidatePath(APP_ROUTES.SAAS.GRANT_NOTIFIER)
  return { ok: true }
}
