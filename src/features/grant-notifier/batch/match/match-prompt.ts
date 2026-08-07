import { z } from 'zod'
import type { CandidateGrant, MatchResult, TenantCondition } from '@/features/grant-notifier/types'

/**
 * 第2段: AI 適合判定のプロンプト生成と応答パース。
 * テナント条件 × 助成金の適合度を JSON で判定させる。
 * 判定は不適合も含め全件 DB 保存し、confidence が閾値未満の「適合」は「要確認」へ降格する。
 */

/** confidence の既定閾値。これ未満の「適合」は「要確認」へ降格する */
export const CONFIDENCE_THRESHOLD = 0.7

/** プロンプトに載せる本文の最大文字数（トークン量とコストの上限を決める） */
const MAX_DETAIL_CHARS = 4000

const matchVerdictSchema = z.object({
  verdict: z.enum(['適合', '要確認', '不適合']),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()).default([]),
  matched_conditions: z.array(z.string()).default([]),
  unclear_points: z.array(z.string()).default([]),
})

function formatList(values: string[]): string {
  return values.length > 0 ? values.join('、') : '（指定なし）'
}

/** AI 判定用プロンプトを組み立てる */
export function buildMatchPrompt(grant: CandidateGrant, condition: TenantCondition): string {
  const detail =
    grant.detailText.length > MAX_DETAIL_CHARS
      ? `${grant.detailText.slice(0, MAX_DETAIL_CHARS)}…`
      : grant.detailText

  return [
    'あなたは中小企業の助成金アドバイザーです。以下の企業条件に対し、助成金が申請対象として適合するか判定してください。',
    '申請でその企業が対象になり得るなら「適合」、情報不足や微妙なら「要確認」、明らかに対象外なら「不適合」とします。',
    '申請者にとっての取りこぼし（暗黙的に対象なのに見送る）を最も避けるべき失敗とみなし、迷ったら「要確認」にしてください。',
    '本文に無い情報は推測せず、不明点は unclear_points に挙げてください。',
    '',
    '【企業条件】',
    `業種: ${formatList(condition.industries)}`,
    `従業員数: ${condition.employeeCount ?? '（指定なし）'}`,
    `資本金: ${condition.capital ?? '（指定なし）'}`,
    `所在地: ${formatList(condition.prefectures)}`,
    `関心カテゴリ: ${formatList(condition.categories)}`,
    `キーワード: ${condition.keywords ?? '（指定なし）'}`,
    '',
    '【助成金】',
    `タイトル: ${grant.title}`,
    `対象地域: ${grant.targetArea ?? '（不明）'}`,
    `対象業種: ${grant.industry ?? '（不明）'}`,
    `従業員要件: ${grant.targetEmployees ?? '（不明）'}`,
    `本文: ${detail}`,
    '',
    '次の JSON のみを出力してください（前後に説明文を付けない）:',
    '{"verdict":"適合|要確認|不適合","confidence":0.0-1.0,"reasons":["..."],"matched_conditions":["..."],"unclear_points":["..."]}',
  ].join('\n')
}

/**
 * AI 出力テキストから JSON 部分を取り出し、MatchResult に変換する。
 * JSON モードでも前後に説明文が付くことがあるため、最初の { から最後の } までを切り出す。
 */
export function parseMatchResult(text: string): MatchResult {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('AI の応答に JSON オブジェクトが含まれていません')
  }

  const parsed = matchVerdictSchema.parse(JSON.parse(text.slice(start, end + 1)))

  return {
    verdict: parsed.verdict,
    confidence: parsed.confidence,
    reasons: parsed.reasons,
    matchedConditions: parsed.matched_conditions,
    unclearPoints: parsed.unclear_points,
  }
}

/**
 * confidence が閾値未満の「適合」を「要確認」へ降格する。
 * 取りこぼし（偽陰性）を偽陽性より重く見る方針のため、除外ではなく降格にとどめる。
 */
export function applyConfidenceDowngrade(
  result: MatchResult,
  threshold: number = CONFIDENCE_THRESHOLD
): MatchResult {
  if (result.verdict === '適合' && result.confidence < threshold) {
    return { ...result, verdict: '要確認' }
  }
  return result
}
