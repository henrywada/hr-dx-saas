import type { SupabaseClient } from '@supabase/supabase-js'
import type { CollectedGrant } from '@/features/grant-notifier/types'
import { complete, recordLlmUsage } from '@/features/grant-notifier/batch/llm'
import {
  insertGrantVersion,
  upsertGrant,
  type UpsertResult,
} from '@/features/grant-notifier/batch/collect/grants-repository'
import {
  createJGrantsClient,
  KEYWORDS,
  toCollectedGrant,
  type JGrantsClient,
} from '@/features/grant-notifier/batch/collect/jgrants-client'
import {
  ensureSource,
  markSourceFetched,
} from '@/features/grant-notifier/batch/collect/sources-repository'

/**
 * 収集オーケストレーション:
 *   J-グランツ検索 → 詳細取得 → grants upsert → 更新時は変更点要約(AI) → grant_versions
 * 依存は引数で注入し、単体テスト可能にする。
 */

const SOURCE_NAME = 'J-グランツAPI'
const SUMMARY_MAX_TOKENS = 512

export interface CollectDeps {
  serviceClient: SupabaseClient
  jgrants: JGrantsClient
  /** grant_sources.url に使う J-グランツ API ベースURL */
  sourceUrl: string
  keywords?: readonly string[]
}

export interface CollectSummary {
  totalProcessed: number
  newCount: number
  updatedCount: number
  unchangedCount: number
}

/** 変更点要約のプロンプト。中小企業の人事担当者向けに簡潔にまとめる */
export function buildSummaryPrompt(previousText: string, newText: string): string {
  return [
    '次の助成金情報が更新されました。旧→新の変更点を、中小企業の人事担当者向けに日本語で簡潔に箇条書き（最大3点）で要約してください。',
    '締切・要件・金額などの実務的に重要な変更を優先してください。本文に無い情報は推測しないでください。',
    '',
    '【更新前】',
    previousText,
    '',
    '【更新後】',
    newText,
  ].join('\n')
}

/**
 * 更新された助成金の変更点要約を生成し、AI 利用量を記録する。
 * 要約失敗（AI 障害等）は収集全体を止めず null を返す（要約なしで履歴を残す）。
 */
async function summarizeChange(
  deps: CollectDeps,
  previousText: string,
  newText: string
): Promise<string | null> {
  try {
    const result = await complete({
      prompt: buildSummaryPrompt(previousText, newText),
      maxOutputTokens: SUMMARY_MAX_TOKENS,
    })

    await recordLlmUsage(deps.serviceClient, {
      step: 'collect',
      model: result.model,
      usage: result.usage,
      costUsd: result.costUsd,
    })

    return result.text === '' ? null : result.text
  } catch (error) {
    console.error('[grant-notifier] 変更点要約の生成に失敗しました:', error)
    return null
  }
}

/** 1件の更新を処理する: 変更点要約（前テキストがある場合のみ）→ grant_versions 追加 */
async function handleUpdated(
  deps: CollectDeps,
  grant: CollectedGrant,
  result: UpsertResult
): Promise<void> {
  const changeSummary =
    result.previousDetailText && result.previousDetailText !== grant.detailText
      ? await summarizeChange(deps, result.previousDetailText, grant.detailText)
      : null

  await insertGrantVersion(deps.serviceClient, {
    grantId: result.grantId,
    bodyHash: grant.bodyHash,
    changeSummary,
  })
}

/**
 * J-グランツから募集中の助成金を収集し、grants マスタを upsert する。
 * 戻り値は処理件数の内訳（grant_batch_runs／ログ用）。
 */
export async function collectJGrants(deps: CollectDeps): Promise<CollectSummary> {
  const keywords = deps.keywords ?? KEYWORDS

  const sourceId = await ensureSource(deps.serviceClient, {
    name: SOURCE_NAME,
    sourceType: 'jgrants_api',
    url: deps.sourceUrl,
  })

  // キーワード横断で id を重複排除する
  const ids = new Set<string>()
  for (const keyword of keywords) {
    const items = await deps.jgrants.searchSubsidies(keyword)
    for (const item of items) {
      ids.add(item.id)
    }
  }

  let newCount = 0
  let updatedCount = 0
  let unchangedCount = 0

  for (const id of ids) {
    const detail = await deps.jgrants.getSubsidyDetail(id)
    if (!detail) continue

    const grant = toCollectedGrant(detail, sourceId)
    const result = await upsertGrant(deps.serviceClient, grant)

    if (result.isNew) {
      newCount += 1
    } else if (result.isUpdated) {
      updatedCount += 1
      await handleUpdated(deps, grant, result)
    } else {
      unchangedCount += 1
    }
  }

  await markSourceFetched(deps.serviceClient, sourceId)

  return {
    totalProcessed: newCount + updatedCount + unchangedCount,
    newCount,
    updatedCount,
    unchangedCount,
  }
}

/** バッチ実行用の既定クライアント（リクエスト間隔とリトライを設定済み） */
export { defaultJGrantsClient } from '@/features/grant-notifier/batch/collect/jgrants-client'
export { createJGrantsClient }
