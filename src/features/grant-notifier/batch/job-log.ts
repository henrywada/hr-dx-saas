import type { SupabaseClient } from '@supabase/supabase-js'
import type { BatchStep } from '@/features/grant-notifier/types'

/**
 * バッチ実行履歴（grant_batch_runs）の記録。
 * /saas_adm の「システム稼働状況」「バッチ実行履歴」の裏付けデータになる。
 * 書込は service_role クライアント（RLS バイパス、バッチ限定）で行う。
 */

export interface BatchSuccessInput {
  processedCount: number
  metadata?: Record<string, unknown>
}

/**
 * running 行を INSERT し、生成された id を返す。
 * 記録に失敗した場合は null を返し、バッチ本体は継続する
 * （実行履歴は運用監視用であり、これで処理を止める理由にはならない）。
 */
export async function recordBatchStart(
  serviceClient: SupabaseClient,
  step: BatchStep
): Promise<string | null> {
  const { data, error } = await serviceClient
    .from('grant_batch_runs')
    .insert({ step, status: 'running' })
    .select('id')
    .single()

  if (error) {
    console.error('[grant-notifier] バッチ開始の記録に失敗しました:', error.message)
    return null
  }
  return data.id
}

/** 実行履歴を success で確定する */
export async function recordBatchSuccess(
  serviceClient: SupabaseClient,
  id: string | null,
  input: BatchSuccessInput
): Promise<void> {
  if (!id) return

  const { error } = await serviceClient
    .from('grant_batch_runs')
    .update({
      status: 'success',
      finished_at: new Date().toISOString(),
      processed_count: input.processedCount,
      metadata: input.metadata ?? {},
    })
    .eq('id', id)

  if (error) {
    console.error('[grant-notifier] バッチ成功の記録に失敗しました:', error.message)
  }
}

/** 実行履歴を failed で確定する */
export async function recordBatchFailure(
  serviceClient: SupabaseClient,
  id: string | null,
  errorMessage: string
): Promise<void> {
  if (!id) return

  const { error } = await serviceClient
    .from('grant_batch_runs')
    .update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      // error_message は text だが、想定外に長いスタックで行が肥大化しないよう切り詰める
      error_message: errorMessage.slice(0, 2000),
    })
    .eq('id', id)

  if (error) {
    console.error('[grant-notifier] バッチ失敗の記録に失敗しました:', error.message)
  }
}
