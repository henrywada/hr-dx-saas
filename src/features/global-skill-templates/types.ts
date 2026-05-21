/** スキル項目・技能要件の区分（global_skill_items / skill_requirements / レベルセット共通） */
export const SKILL_ITEM_CATEGORIES = ['スキル', '能力', '資格', '研修', 'その他'] as const

/** グローバルスキルテンプレート系 Server Actions の共通戻り値 */
export type GlobalSkillTemplateActionResult = { success: true } | { success: false; error: string }

/** クライアント側で ActionResult を扱いやすくする */
export function globalTemplateActionError(r: GlobalSkillTemplateActionResult): string | undefined {
  if ('error' in r) return r.error
  return undefined
}

export type GlobalJobCategory = {
  id: string
  name: string
  sort_order: number
  created_at: string
}

/** スキルレベルセット（評価軸ラダー）。職種とは独立したテンプレート全体のマスタ */
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

export type GlobalSkillItem = {
  id: string
  job_role_id: string
  name: string
  category: string | null
  /** このスキルが参照するスキルレベルセット */
  skill_level_set_id: string
  sort_order: number
  created_at: string
  /** 一覧表示用に levels を同梱する場合あり */
  skill_level_set?:
    | (Pick<GlobalSkillLevelSet, 'id' | 'name'> & { levels?: GlobalSkillLevel[] })
    | null
}

export type GlobalJobRole = {
  id: string
  category_id: string
  category_name?: string
  name: string
  description: string | null
  color_hex: string
  sort_order: number
  created_at: string
  /** 一覧用: 当該職種に紐づくスキル項目 */
  skill_items?: GlobalSkillItem[]
}

export type GlobalJobRoleDetail = GlobalJobRole & {
  skillItems: GlobalSkillItem[]
  /** スキルレベルはセット単位でグループ化 */
  skillLevelSets: GlobalSkillLevelSetWithLevels[]
}
