// src/features/skill-map/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { getTenantSkillsWithRequirements, getSkillLevels, getEmployeeSkillRequirementSelections } from './queries'
import type { TenantSkillDetail } from './types'

type ActionResult = { success: true } | { success: false; error: string }

const SKILL_MAP_PATH = APP_ROUTES.TENANT.ADMIN_SKILL_MAP
const SKILL_TEMP_COPY_PATH = APP_ROUTES.TENANT.ADMIN_SKILL_TEMP_COPY

const HEX_RE = /^#[0-9a-fA-F]{6}$/
function isValidHex(hex: string | undefined): boolean {
  return !hex || HEX_RE.test(hex)
}

/** skill-tempCopy 詳細モーダル用: 1職種の要件＋レベルマスタを返す */
export async function loadTenantSkillDetailAction(
  skillId: string
): Promise<TenantSkillDetail | null> {
  const user = await getServerUser()
  if (!user?.tenant_id) return null
  const supabase = await createClient()

  const [allSkills, levels] = await Promise.all([
    getTenantSkillsWithRequirements(supabase),
    getSkillLevels(supabase),
  ])
  const skill = allSkills.find(s => s.id === skillId)
  if (!skill) return null
  return { ...skill, levels }
}

// ---- 技能マスタ (tenant_skills) ----

export async function createTenantSkill(input: {
  name: string
  colorHex?: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  if (!isValidHex(input.colorHex)) return { success: false, error: '無効なカラーコードです' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('tenant_skills').insert({
    tenant_id: user.tenant_id,
    name: input.name,
    color_hex: input.colorHex ?? '#3b82f6',
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_MAP_PATH)
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

export async function updateTenantSkill(input: {
  id: string
  name?: string
  colorHex?: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  if (!isValidHex(input.colorHex)) return { success: false, error: '無効なカラーコードです' }
  const supabase = await createClient()
  const updates: Record<string, string> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.colorHex !== undefined) updates.color_hex = input.colorHex
  const { error } = await (supabase as any)
    .from('tenant_skills')
    .update(updates)
    .eq('id', input.id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_MAP_PATH)
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

export async function deleteTenantSkill(id: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('tenant_skills')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_MAP_PATH)
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

// ---- スキルレベルマスタ (skill_levels) ----

export async function createSkillLevel(input: {
  name: string
  colorHex?: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  if (!isValidHex(input.colorHex)) return { success: false, error: '無効なカラーコードです' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('skill_levels').insert({
    tenant_id: user.tenant_id,
    name: input.name,
    color_hex: input.colorHex ?? '#6b7280',
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_MAP_PATH)
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

export async function updateSkillLevel(input: {
  id: string
  name?: string
  colorHex?: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  if (!isValidHex(input.colorHex)) return { success: false, error: '無効なカラーコードです' }
  const supabase = await createClient()
  const updates: Record<string, string> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.colorHex !== undefined) updates.color_hex = input.colorHex
  const { error } = await (supabase as any)
    .from('skill_levels')
    .update(updates)
    .eq('id', input.id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_MAP_PATH)
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

export async function deleteSkillLevel(id: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('skill_levels')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_MAP_PATH)
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

// ---- 従業員技能割り当て (employee_skill_assignments) ----

export async function assignSkill(input: {
  employeeId: string
  skillId: string
  startedAt: string // 'YYYY-MM-DD'
  reason?: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('employee_skill_assignments').insert({
    tenant_id: user.tenant_id,
    employee_id: input.employeeId,
    skill_id: input.skillId,
    started_at: input.startedAt,
    reason: input.reason ?? null,
    assigned_by: user.employee_id ?? null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_MAP_PATH)
  return { success: true }
}

export async function removeSkillAssignment(id: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('employee_skill_assignments')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_MAP_PATH)
  return { success: true }
}

// ---- 従業員×技能要件の On/Off（employee_skill_requirement_selections） ----

/** モーダル初期表示用：選択済み requirement_id 一覧 */
export async function loadEmployeeSkillRequirementSelectionsAction(
  employeeId: string
): Promise<string[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []
  const supabase = await createClient()
  try {
    const set = await getEmployeeSkillRequirementSelections(supabase, employeeId)
    return Array.from(set)
  } catch {
    return []
  }
}

export async function setEmployeeSkillRequirementSelection(input: {
  employeeId: string
  requirementId: string
  selected: boolean
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const { data: req, error: reqErr } = await (supabase as any)
    .from('skill_requirements')
    .select('id, skill_id, tenant_id')
    .eq('id', input.requirementId)
    .maybeSingle()
  if (reqErr || !req) return { success: false, error: '要件が見つかりません' }
  if (req.tenant_id !== user.tenant_id) return { success: false, error: '要件が見つかりません' }

  const { data: assign } = await (supabase as any)
    .from('employee_skill_assignments')
    .select('id')
    .eq('employee_id', input.employeeId)
    .eq('skill_id', req.skill_id)
    .limit(1)
    .maybeSingle()
  if (!assign) return { success: false, error: 'この職種は未割り当てです' }

  if (input.selected) {
    const { error } = await (supabase as any).from('employee_skill_requirement_selections').insert({
      tenant_id: user.tenant_id,
      employee_id: input.employeeId,
      requirement_id: input.requirementId,
    })
    if (error) {
      if (String(error.code) === '23505') return { success: true }
      return { success: false, error: error.message }
    }
  } else {
    const { error } = await (supabase as any)
      .from('employee_skill_requirement_selections')
      .delete()
      .eq('tenant_id', user.tenant_id)
      .eq('employee_id', input.employeeId)
      .eq('requirement_id', input.requirementId)
    if (error) return { success: false, error: error.message }
  }
  revalidatePath(SKILL_MAP_PATH)
  return { success: true }
}

// ---- 技能別要件 (skill_requirements) ----

export async function createSkillRequirement(input: {
  skillId: string
  name: string
  category?: string
  levelId?: string
  criteria?: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('skill_requirements').insert({
    tenant_id: user.tenant_id,
    skill_id: input.skillId,
    name: input.name,
    category: input.category ?? null,
    level_id: input.levelId ?? null,
    criteria: input.criteria ?? null,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_MAP_PATH)
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

export async function updateSkillRequirement(input: {
  id: string
  name?: string
  category?: string | null
  levelId?: string | null
  criteria?: string | null
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()
  const updates: Record<string, any> = {}
  if (input.name !== undefined) updates.name = input.name
  if ('category' in input) updates.category = input.category
  if ('levelId' in input) updates.level_id = input.levelId
  if ('criteria' in input) updates.criteria = input.criteria
  const { error } = await (supabase as any)
    .from('skill_requirements')
    .update(updates)
    .eq('id', input.id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_MAP_PATH)
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

export async function deleteSkillRequirement(id: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('skill_requirements')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_MAP_PATH)
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

// ---- 配置シミュレーション（維持） ----

export async function saveSkillMapDraft(input: {
  draftId?: string
  name: string
  snapshot: Record<string, string>
}): Promise<{ success: boolean; draftId?: string; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()
  if (input.draftId) {
    const { error } = await (supabase as any)
      .from('skill_map_drafts')
      .update({ name: input.name, snapshot: input.snapshot, updated_at: new Date().toISOString() })
      .eq('id', input.draftId)
      .eq('tenant_id', user.tenant_id)
    if (error) return { success: false, error: error.message }
    revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP_SIMULATION)
    return { success: true, draftId: input.draftId }
  }
  const { data, error } = await (supabase as any)
    .from('skill_map_drafts')
    .insert({
      tenant_id: user.tenant_id,
      name: input.name,
      snapshot: input.snapshot,
      created_by: user.employee_id ?? null,
    })
    .select('id')
    .single()
  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP_SIMULATION)
  return { success: true, draftId: data.id }
}

// ---- グローバルテンプレートから取り込み ----

export async function importFromGlobalTemplate(jobRoleId: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()

  const [roleRes, itemsRes] = await Promise.all([
    (supabase as any)
      .from('global_job_roles')
      .select('name, color_hex')
      .eq('id', jobRoleId)
      .single(),
    (supabase as any)
      .from('global_skill_items')
      .select('*')
      .eq('job_role_id', jobRoleId)
      .order('sort_order'),
  ])

  if (roleRes.error || !roleRes.data)
    return { success: false, error: 'テンプレートが見つかりません' }
  if (itemsRes.error) return { success: false, error: itemsRes.error.message }

  const setIds = [
    ...new Set(
      (itemsRes.data ?? [])
        .map((it: { skill_level_set_id?: string }) => it.skill_level_set_id)
        .filter(Boolean)
    ),
  ] as string[]

  let levelsRes: { data: any[] | null; error?: any } = { data: [] }
  if (setIds.length > 0) {
    levelsRes = await (supabase as any)
      .from('global_skill_levels')
      .select('id, name, color_hex, skill_level_set_id, sort_order')
      .in('skill_level_set_id', setIds)
      .order('sort_order')
    if (levelsRes.error) return { success: false, error: levelsRes.error.message }
  }

  const { data: skillData, error: skillError } = await (supabase as any)
    .from('tenant_skills')
    .insert({
      tenant_id: user.tenant_id,
      name: roleRes.data.name,
      color_hex: roleRes.data.color_hex,
    })
    .select('id')
    .single()
  if (skillError) return { success: false, error: skillError.message }

  const tenantSkillId = skillData.id

  if (levelsRes.data && levelsRes.data.length > 0) {
    const { data: existingLevels } = await (supabase as any)
      .from('skill_levels')
      .select('name')
      .eq('tenant_id', user.tenant_id)
    const existingNames = new Set((existingLevels ?? []).map((l: any) => l.name))
    const newLevels = levelsRes.data.filter((l: any) => !existingNames.has(l.name))
    if (newLevels.length > 0) {
      const levelsRows = newLevels.map((level: any) => ({
        tenant_id: user.tenant_id,
        name: level.name,
        color_hex: level.color_hex,
      }))
      const { error: levelError } = await (supabase as any).from('skill_levels').insert(levelsRows)
      if (levelError) return { success: false, error: levelError.message }
    }
  }

  const { data: tenantLevelsForMap } = await (supabase as any)
    .from('skill_levels')
    .select('id, name')
    .eq('tenant_id', user.tenant_id)

  const tenantLevelIdByName = new Map<string, string>()
  for (const row of tenantLevelsForMap ?? []) {
    if (!tenantLevelIdByName.has(row.name)) tenantLevelIdByName.set(row.name, row.id)
  }

  /** setId → sort_order 昇順のレベル名配列 */
  const levelsBySetId = new Map<string, Array<{ name: string; sort_order: number }>>()
  for (const lv of levelsRes.data ?? []) {
    const row = lv as {
      skill_level_set_id: string
      name: string
      sort_order: number
    }
    const list = levelsBySetId.get(row.skill_level_set_id) ?? []
    list.push({ name: row.name, sort_order: row.sort_order })
    levelsBySetId.set(row.skill_level_set_id, list)
  }

  /** セット内の全レベルを sort_order 昇順で返す */
  function levelsInSet(setId: string): Array<{ name: string; sort_order: number }> {
    const list = levelsBySetId.get(setId) ?? []
    return [...list].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ja'))
  }

  if (itemsRes.data && itemsRes.data.length > 0) {
    /**
     * skill_item × セット内レベル数 の直積で skill_requirements を作成する。
     * レベルセットが空／未設定の場合は level_id = null で 1 行だけ作成する。
     */
    const requirementsRows: Array<{
      tenant_id: string
      skill_id: string
      name: string
      category: string | null
      level_id: string | null
      sort_order: number
    }> = []

    let sortOrder = 0
    for (const item of itemsRes.data as any[]) {
      const levels = item.skill_level_set_id
        ? levelsInSet(item.skill_level_set_id as string)
        : []

      if (levels.length === 0) {
        requirementsRows.push({
          tenant_id: user.tenant_id,
          skill_id: tenantSkillId,
          name: item.name,
          category: item.category ?? null,
          level_id: null,
          sort_order: sortOrder++,
        })
      } else {
        for (const lv of levels) {
          const level_id = tenantLevelIdByName.get(lv.name) ?? null
          requirementsRows.push({
            tenant_id: user.tenant_id,
            skill_id: tenantSkillId,
            name: item.name,
            category: item.category ?? null,
            level_id,
            sort_order: sortOrder++,
          })
        }
      }
    }

    const { error: reqError } = await (supabase as any)
      .from('skill_requirements')
      .insert(requirementsRows)
    if (reqError) return { success: false, error: reqError.message }
  }

  revalidatePath(SKILL_MAP_PATH)
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

export async function confirmSkillMapDraft(draftId: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()
  const { data: draft, error: draftError } = await (supabase as any)
    .from('skill_map_drafts')
    .select('snapshot')
    .eq('id', draftId)
    .eq('tenant_id', user.tenant_id)
    .single()
  if (draftError) return { success: false, error: draftError.message }
  const snapshot: Record<string, string> = draft.snapshot ?? {}
  for (const [employeeId, divisionId] of Object.entries(snapshot)) {
    const { error } = await (supabase as any)
      .from('employees')
      .update({ division_id: divisionId })
      .eq('id', employeeId)
    if (error) return { success: false, error: error.message }
  }
  const { error: confirmError } = await (supabase as any)
    .from('skill_map_drafts')
    .update({ status: 'confirmed' })
    .eq('id', draftId)
    .eq('tenant_id', user.tenant_id)
  if (confirmError) return { success: false, error: confirmError.message }
  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP_SIMULATION)
  return { success: true }
}
