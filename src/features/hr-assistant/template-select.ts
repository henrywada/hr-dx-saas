import type { AssistantMode, QuestionTemplate } from './types'

/** チップとして一度に表示するテンプレート数 */
const DEFAULT_DISPLAY_LIMIT = 6

/**
 * 表示するテンプレートを選定する。
 * 優先順位: mined（自テナントの学習結果）> seed（共通）、各グループ内は usage_count 降順。
 * question_text の重複は先勝ちで排除し、limit 件に切り詰める。
 */
export function selectTemplatesForDisplay(
  templates: QuestionTemplate[],
  mode: AssistantMode,
  limit: number = DEFAULT_DISPLAY_LIMIT
): QuestionTemplate[] {
  const candidates = templates.filter(t => t.mode === mode && t.status === 'active')

  // filter が返す新しい配列を sort するため、入力配列は変更されない
  const byUsageDesc = (a: QuestionTemplate, b: QuestionTemplate) =>
    b.usage_count - a.usage_count || a.created_at.localeCompare(b.created_at)
  const mined = candidates.filter(t => t.source === 'mined').sort(byUsageDesc)
  const seed = candidates.filter(t => t.source === 'seed').sort(byUsageDesc)

  const seen = new Set<string>()
  const result: QuestionTemplate[] = []
  for (const t of [...mined, ...seed]) {
    if (seen.has(t.question_text)) continue
    seen.add(t.question_text)
    result.push(t)
    if (result.length >= limit) break
  }
  return result
}
