export type GlobalJobCategory = {
  id: string
  name: string
  sort_order: number
  created_at: string
}

/** 職種に紐づくスキルレベルセット（評価軸ラダー） */
export type GlobalSkillLevelSet = {
  id: string
  job_role_id: string
  name: string
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
  skill_level_set?: Pick<GlobalSkillLevelSet, 'id' | 'name'> | null
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
