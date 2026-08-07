import type { SupabaseClient } from '@supabase/supabase-js'
import type { CandidateGrant, TenantCondition } from '@/features/grant-notifier/types'
import { complete, recordLlmUsage } from '@/features/grant-notifier/batch/llm'
import {
  applyConfidenceDowngrade,
  buildMatchPrompt,
  parseMatchResult,
} from '@/features/grant-notifier/batch/match/match-prompt'
import {
  loadCandidateGrants,
  loadEvaluatedGrantIds,
  loadTenantConditions,
  upsertMatchResult,
} from '@/features/grant-notifier/batch/match/match-repository'
import { passesRuleFilter } from '@/features/grant-notifier/batch/match/rule-filter'

/**
 * マッチングオーケストレーション。
 * テナント条件 × 募集中助成金を ルール絞込 → AI判定 → grant_match_results 保存。
 * 判定は不適合も含め全件保存し、コストは grant_llm_usage に記録する。
 * 既に判定済みの (tenant, grant) は再判定しない（AI コスト抑制）。
 */

const MATCH_MAX_TOKENS = 1024

export interface MatchDeps {
  serviceClient: SupabaseClient
  /** 判定対象を絞る現在時刻（締切フィルタ） */
  nowIso?: string
}

export interface MatchSummary {
  tenantsProcessed: number
  evaluated: number
  /** 適合 + 要確認 の件数（配信候補） */
  matched: number
  failed: number
}

/** 1テナント分の判定を行い、件数内訳を返す */
async function matchOneTenant(
  deps: MatchDeps,
  condition: TenantCondition,
  candidates: CandidateGrant[]
): Promise<{ evaluated: number; matched: number; failed: number }> {
  const evaluatedIds = await loadEvaluatedGrantIds(deps.serviceClient, condition.tenantId)
  let evaluated = 0
  let matched = 0
  let failed = 0

  for (const grant of candidates) {
    if (evaluatedIds.has(grant.id)) continue
    if (!passesRuleFilter(grant, condition)) continue

    try {
      const completion = await complete({
        prompt: buildMatchPrompt(grant, condition),
        maxOutputTokens: MATCH_MAX_TOKENS,
        json: true,
      })
      const result = applyConfidenceDowngrade(parseMatchResult(completion.text))

      await upsertMatchResult(deps.serviceClient, {
        tenantId: condition.tenantId,
        grantId: grant.id,
        result,
        model: completion.model,
      })
      await recordLlmUsage(deps.serviceClient, {
        tenantId: condition.tenantId,
        step: 'match',
        model: completion.model,
        usage: completion.usage,
        costUsd: completion.costUsd,
      })

      evaluated += 1
      if (result.verdict === '適合' || result.verdict === '要確認') matched += 1
    } catch (error) {
      // 1件の判定失敗（AI 障害・JSON 不正）は全体を止めず、件数を記録して継続する
      console.error(
        `[grant-notifier] 判定に失敗しました (tenant=${condition.tenantId} grant=${grant.id}):`,
        error
      )
      failed += 1
    }
  }

  return { evaluated, matched, failed }
}

/**
 * 条件設定済みの全テナントについてマッチングを実行する。
 * 戻り値は処理件数の内訳（grant_batch_runs／ログ用）。
 */
export async function matchTenants(deps: MatchDeps): Promise<MatchSummary> {
  const conditions = await loadTenantConditions(deps.serviceClient)

  const summary: MatchSummary = {
    tenantsProcessed: 0,
    evaluated: 0,
    matched: 0,
    failed: 0,
  }
  if (conditions.length === 0) return summary

  const candidates = await loadCandidateGrants(deps.serviceClient, deps.nowIso)

  for (const condition of conditions) {
    const tenantResult = await matchOneTenant(deps, condition, candidates)
    summary.tenantsProcessed += 1
    summary.evaluated += tenantResult.evaluated
    summary.matched += tenantResult.matched
    summary.failed += tenantResult.failed
  }

  return summary
}
