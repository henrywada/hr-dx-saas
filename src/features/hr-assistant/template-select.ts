import type { AssistantMode, QuestionTemplate } from './types'

/** チップとして一度に表示するテンプレート数 */
const DEFAULT_DISPLAY_LIMIT = 6

/**
 * 表示するテンプレートを選定する。
 * 計画どおり: 利用履歴由来（mined）のみ表示。無い場合は空（seed は出さない）。
 * 各グループ内は usage_count 降順。question_text の重複は先勝ちで排除。
 */
export function selectTemplatesForDisplay(
  templates: QuestionTemplate[],
  mode: AssistantMode,
  limit: number = DEFAULT_DISPLAY_LIMIT
): QuestionTemplate[] {
  const candidates = templates.filter(
    t => t.mode === mode && t.status === 'active' && t.source === 'mined'
  )

  const byUsageDesc = (a: QuestionTemplate, b: QuestionTemplate) =>
    b.usage_count - a.usage_count || a.created_at.localeCompare(b.created_at)
  const mined = [...candidates].sort(byUsageDesc)

  const seen = new Set<string>()
  const result: QuestionTemplate[] = []
  for (const t of mined) {
    if (seen.has(t.question_text)) continue
    seen.add(t.question_text)
    result.push(t)
    if (result.length >= limit) break
  }
  return result
}
