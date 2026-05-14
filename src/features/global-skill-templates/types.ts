export type GlobalJobCategory = {
  id: string
  name: string
  sort_order: number
  created_at: string
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
}

export type GlobalSkillItem = {
  id: string
  job_role_id: string
  name: string
  category: string | null
  sort_order: number
  created_at: string
}

export type GlobalSkillLevel = {
  id: string
  job_role_id: string
  name: string
  criteria: string | null
  color_hex: string
  sort_order: number
  created_at: string
}

export type GlobalJobRoleDetail = GlobalJobRole & {
  skillItems: GlobalSkillItem[]
  skillLevels: GlobalSkillLevel[]
}
