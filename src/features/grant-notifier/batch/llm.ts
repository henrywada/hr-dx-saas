import type { SupabaseClient } from '@supabase/supabase-js'
import { getGeminiClient, GEMINI_FLASH_MODEL } from '@/lib/ai/gemini'
import type { BatchStep } from '@/features/grant-notifier/types'

/**
 * 助成金情報配信バッチの LLM 層。
 *
 * バッチは Gemini を直接呼ばず必ずこの層を経由する。トークン使用量とコストを
 * grant_llm_usage に一元記録し、/saas_adm のコストモニタの裏付けにする。
 * 使用量が必要なため generateGeminiContent ではなく getGeminiClient を直接使い、
 * レスポンスの usageMetadata を拾う。
 */

/** 助成金判定・要約の既定モデル（安価・高速） */
export const GRANT_NOTIFIER_MODEL = GEMINI_FLASH_MODEL

/**
 * モデル別の料金（USD / 100万トークン）。Google 公開価格に基づく目安。
 * 改定時はここを更新する。未知モデルは計測漏れを避けるため例外を投げる。
 */
const MODEL_PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.3, output: 2.5 },
  'gemini-2.5-pro': { input: 1.25, output: 10 },
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

export interface CompleteInput {
  model?: string
  system?: string
  prompt: string
  maxOutputTokens: number
  /** JSON 形式での出力を強制する */
  json?: boolean
  /**
   * 思考（thinking）に割り当てるトークン数。既定 0（無効）。
   * Gemini 2.5 系は既定で thinking が有効だが、思考が maxOutputTokens を食い潰して
   * 応答が MAX_TOKENS で途中終了する。助成金の判定・要約は定型の構造化出力であり
   * 長い思考連鎖を必要としないため、既定で無効化してコストと応答長を安定させる。
   */
  thinkingBudget?: number
}

export interface CompleteResult {
  text: string
  usage: TokenUsage
  costUsd: number
  model: string
}

/** usage からコスト(USD)を算出する */
export function calculateCostUsd(model: string, usage: TokenUsage): number {
  const pricing = MODEL_PRICING_PER_MTOK[model]
  if (!pricing) {
    throw new Error(`モデルの料金設定がありません: ${model}`)
  }

  const cost =
    (usage.inputTokens / 1_000_000) * pricing.input +
    (usage.outputTokens / 1_000_000) * pricing.output

  // DB の numeric(12,6) に合わせて 6 桁精度に丸める
  return Math.round(cost * 1_000_000) / 1_000_000
}

/** 1回のテキスト生成を実行し、本文・トークン使用量・コストを返す */
export async function complete(input: CompleteInput): Promise<CompleteResult> {
  const model = input.model ?? GRANT_NOTIFIER_MODEL
  const ai = getGeminiClient()

  const response = await ai.models.generateContent({
    model,
    contents: input.prompt,
    config: {
      ...(input.system ? { systemInstruction: input.system } : {}),
      maxOutputTokens: input.maxOutputTokens,
      ...(input.json ? { responseMimeType: 'application/json' } : {}),
      thinkingConfig: { thinkingBudget: input.thinkingBudget ?? 0 },
    },
  })

  const text = response.text
  if (!text) {
    throw new Error('AI からの応答が空でした')
  }

  // 応答が途中で切れたまま返すと不正な JSON をパースして分かりにくく失敗するため、
  // ここで明示的に失敗させる（呼び出し側は件数を記録して次の助成金へ進む）。
  const finishReason = response.candidates?.[0]?.finishReason
  if (finishReason === 'MAX_TOKENS') {
    throw new Error(
      `AI の応答が maxOutputTokens (${input.maxOutputTokens}) に達して途中で終了しました`
    )
  }

  const meta = response.usageMetadata
  const usage: TokenUsage = {
    inputTokens: meta?.promptTokenCount ?? 0,
    // 思考トークンも課金対象の出力トークンとして計上する
    outputTokens: (meta?.candidatesTokenCount ?? 0) + (meta?.thoughtsTokenCount ?? 0),
  }

  return { text: text.trim(), usage, costUsd: calculateCostUsd(model, usage), model }
}

export interface LlmUsageEntry {
  /** テナント非依存の処理（collect の要約等）では省略する */
  tenantId?: string
  step: BatchStep
  model: string
  usage: TokenUsage
  costUsd: number
}

/**
 * LLM 利用量を grant_llm_usage に記録する。service_role クライアントを渡すこと。
 * 記録失敗はバッチ本体を止めない（コスト計測はあくまで運用監視用）。
 */
export async function recordLlmUsage(
  serviceClient: SupabaseClient,
  entry: LlmUsageEntry
): Promise<void> {
  const { error } = await serviceClient.from('grant_llm_usage').insert({
    tenant_id: entry.tenantId ?? null,
    step: entry.step,
    model: entry.model,
    input_tokens: entry.usage.inputTokens,
    output_tokens: entry.usage.outputTokens,
    cost_usd: entry.costUsd,
  })

  if (error) {
    console.error('[grant-notifier] LLM 利用量の記録に失敗しました:', error.message)
  }
}
