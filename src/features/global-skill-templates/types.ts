/** スキル項目・技能要件の区分（skill_requirements / レベルセット共通） */
export const SKILL_ITEM_CATEGORIES = ['スキル', '能力', '資格', '研修', 'その他'] as const

/** グローバルスキルテンプレート系 Server Actions の共通戻り値 */
export type GlobalSkillTemplateActionResult = { success: true } | { success: false; error: string }

/** クライアント側で ActionResult を扱いやすくする */
export function globalTemplateActionError(r: GlobalSkillTemplateActionResult): string | undefined {
  if ('error' in r) return r.error
  return undefined
}

/** スキルレベルセット（評価軸ラダー）。SaaS テンプレート全体のマスタ */
export type GlobalSkillLevelSet = {
  id: string
  name: string
  category: string | null
  sort_order: number
  created_at: string
}

export type GlobalSkillLevel = {
  id: string
  skill_level_set_id: string
  name: string
  criteria: string | null
  color_hex: string
  sort_order: number
  created_at: string
}

export type GlobalSkillLevelSetWithLevels = GlobalSkillLevelSet & {
  levels: GlobalSkillLevel[]
}
