import { createAdminClient } from '@/lib/supabase/admin'
import type { BatchStep } from '@/features/grant-notifier/types'
import {
  recordBatchFailure,
  recordBatchStart,
  recordBatchSuccess,
} from '@/features/grant-notifier/batch/job-log'
import {
  collectJGrants,
  defaultJGrantsClient,
} from '@/features/grant-notifier/batch/collect/collect-jgrants'
import { matchTenants } from '@/features/grant-notifier/batch/match/match-tenants'
import { deliverTenants } from '@/features/grant-notifier/batch/deliver/deliver-tenants'

/**
 * 助成金情報配信バッチのオーケストレーション（collect → match → deliver）。
 *
 * GitHub Actions cron から /api/grant-notifier/run-batch 経由で、
 * また /saas_adm/grant-notifier の手動再実行から呼ばれる。
 * 全テナント横断で動くため service_role クライアント（RLS バイパス）を使う。
 * これはバッチ限定の用法で、エンドユーザー向け actions.ts では使わない。
 */

export const ALL_STEPS: BatchStep[] = ['collect', 'match', 'deliver']

export interface StepResult {
  step: BatchStep
  status: 'success' | 'failed' | 'skipped'
  processedCount: number
  metadata: Record<string, unknown>
  errorMessage?: string
}

export interface BatchRunSummary {
  steps: StepResult[]
  hasFailure: boolean
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`環境変数が未設定です: ${name}`)
  }
  return value
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * 1ステップを実行し、grant_batch_runs に開始・終了を記録する。
 * 例外はここで握り、後続ステップの実行可否は呼び出し側が決める。
 */
async function runStep(
  serviceClient: ReturnType<typeof createAdminClient>,
  step: BatchStep,
  body: () => Promise<{ processedCount: number; metadata: Record<string, unknown> }>
): Promise<StepResult> {
  const runId = await recordBatchStart(serviceClient, step)

  try {
    const { processedCount, metadata } = await body()
    await recordBatchSuccess(serviceClient, runId, { processedCount, metadata })
    console.log(`[grant-notifier] ${step} 完了:`, { processedCount, ...metadata })
    return { step, status: 'success', processedCount, metadata }
  } catch (error) {
    const errorMessage = toMessage(error)
    await recordBatchFailure(serviceClient, runId, errorMessage)
    console.error(`[grant-notifier] ${step} 失敗:`, errorMessage)
    return { step, status: 'failed', processedCount: 0, metadata: {}, errorMessage }
  }
}

/**
 * 指定ステップを順に実行する。
 * あるステップが失敗しても後続は実行する（collect が落ちても既存データで
 * match / deliver は成立し、次回起動で collect がやり直されるため）。
 */
export async function runGrantNotifierBatch(
  steps: BatchStep[] = ALL_STEPS
): Promise<BatchRunSummary> {
  const serviceClient = createAdminClient()
  const results: StepResult[] = []

  if (steps.includes('collect')) {
    results.push(
      await runStep(serviceClient, 'collect', async () => {
        const jgrantsBaseUrl = requireEnv('JGRANTS_API_BASE_URL')
        const summary = await collectJGrants({
          serviceClient,
          jgrants: defaultJGrantsClient(jgrantsBaseUrl),
          sourceUrl: jgrantsBaseUrl,
        })
        return {
          processedCount: summary.totalProcessed,
          metadata: {
            newCount: summary.newCount,
            updatedCount: summary.updatedCount,
            unchangedCount: summary.unchangedCount,
          },
        }
      })
    )
  }

  if (steps.includes('match')) {
    results.push(
      await runStep(serviceClient, 'match', async () => {
        const summary = await matchTenants({ serviceClient })
        return {
          processedCount: summary.evaluated,
          metadata: {
            tenantsProcessed: summary.tenantsProcessed,
            matched: summary.matched,
            failed: summary.failed,
          },
        }
      })
    )
  }

  if (steps.includes('deliver')) {
    results.push(
      await runStep(serviceClient, 'deliver', async () => {
        const summary = await deliverTenants({
          serviceClient,
          appBaseUrl: requireEnv('NEXT_PUBLIC_APP_URL'),
          unsubscribeSecret: requireEnv('UNSUBSCRIBE_SECRET'),
        })
        return {
          processedCount: summary.mailsSent,
          metadata: {
            tenantsDelivered: summary.tenantsDelivered,
            grantsDelivered: summary.grantsDelivered,
            skipped: summary.skipped,
            failed: summary.failed,
          },
        }
      })
    )
  }

  return { steps: results, hasFailure: results.some(r => r.status === 'failed') }
}
