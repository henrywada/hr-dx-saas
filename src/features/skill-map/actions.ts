// src/features/skill-map/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import {
  getTenantSkillsWithRequirements,
  getSkillLevels,
  getEmployeeSkillRequirementSelections,
  getTenantSkillLevelSetsWithLevels,
  getAvailableCoursesForLevelMapping,
  searchMatchingEmployees,
  getSkillBottleneckAnalysis,
} from './queries'
import type { TenantSkillDetail, SkillLevel, TenantSkillLevelSetWithLevels } from './types'

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

export async function loadSkillLevelsAction(): Promise<SkillLevel[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []
  const supabase = await createClient()
  return getSkillLevels(supabase)
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

/** 同名スキル（および属するレベル要件）をまとめて削除 */
export async function deleteSkillRequirementsByName(input: {
  skillId: string
  name: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('skill_requirements')
    .delete()
    .eq('tenant_id', user.tenant_id)
    .eq('skill_id', input.skillId)
    .eq('name', input.name)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_MAP_PATH)
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
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

  // グローバルセット名 + レベルを取得
  let globalSetsData: Array<{ id: string; name: string }> = []
  let levelsRes: { data: any[] | null; error?: any } = { data: [] }
  if (setIds.length > 0) {
    const [setsResult, lvResult] = await Promise.all([
      (supabase as any).from('global_skill_level_sets').select('id, name').in('id', setIds),
      (supabase as any)
        .from('global_skill_levels')
        .select('id, name, color_hex, skill_level_set_id, sort_order')
        .in('skill_level_set_id', setIds)
        .order('sort_order'),
    ])
    if (lvResult.error) return { success: false, error: lvResult.error.message }
    globalSetsData = setsResult.data ?? []
    levelsRes = lvResult
  }

  // グローバルセット → テナントセットのマッピングを作成（同名セットは再利用）
  const tenantSetIdByGlobalSetId = new Map<string, string>()
  for (const gs of globalSetsData) {
    const { data: existing } = await (supabase as any)
      .from('tenant_skill_level_sets')
      .select('id')
      .eq('tenant_id', user.tenant_id)
      .eq('name', gs.name)
      .maybeSingle()
    if (existing) {
      tenantSetIdByGlobalSetId.set(gs.id, existing.id)
    } else {
      const { data: created, error: setErr } = await (supabase as any)
        .from('tenant_skill_level_sets')
        .insert({ tenant_id: user.tenant_id, name: gs.name, sort_order: 0 })
        .select('id')
        .single()
      if (setErr) return { success: false, error: setErr.message }
      tenantSetIdByGlobalSetId.set(gs.id, created.id)
    }
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

  // グローバルレベルID → テナントレベルIDのマッピングを作成（セット単位で重複チェック）
  const tenantLevelIdByGlobalLevelId = new Map<string, string>()
  for (const gl of levelsRes.data ?? []) {
    const tenantSetId = tenantSetIdByGlobalSetId.get(gl.skill_level_set_id)
    if (!tenantSetId) continue
    const { data: existing } = await (supabase as any)
      .from('skill_levels')
      .select('id')
      .eq('tenant_id', user.tenant_id)
      .eq('skill_level_set_id', tenantSetId)
      .eq('name', gl.name)
      .maybeSingle()
    if (existing) {
      tenantLevelIdByGlobalLevelId.set(gl.id, existing.id)
    } else {
      const { data: created, error: lvErr } = await (supabase as any)
        .from('skill_levels')
        .insert({
          tenant_id: user.tenant_id,
          name: gl.name,
          color_hex: gl.color_hex,
          skill_level_set_id: tenantSetId,
          sort_order: gl.sort_order,
        })
        .select('id')
        .single()
      if (lvErr) return { success: false, error: lvErr.message }
      tenantLevelIdByGlobalLevelId.set(gl.id, created.id)
    }
  }

  /** setId → sort_order 昇順のレベル情報配列 */
  const levelsBySetId = new Map<string, Array<{ id: string; name: string; sort_order: number }>>()
  for (const lv of levelsRes.data ?? []) {
    const list = levelsBySetId.get(lv.skill_level_set_id) ?? []
    list.push({ id: lv.id, name: lv.name, sort_order: lv.sort_order })
    levelsBySetId.set(lv.skill_level_set_id, list)
  }

  /** セット内の全レベルを sort_order 昇順で返す */
  function levelsInSet(setId: string): Array<{ id: string; name: string; sort_order: number }> {
    const list = levelsBySetId.get(setId) ?? []
    return [...list].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'ja')
    )
  }

  if (itemsRes.data && itemsRes.data.length > 0) {
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
      const levels = item.skill_level_set_id ? levelsInSet(item.skill_level_set_id as string) : []

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
          const level_id = tenantLevelIdByGlobalLevelId.get(lv.id) ?? null
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

// ---- テナント固有スキルレベルセット ----

/** スキルレベルセット一覧（タブ用） */
export async function loadTenantSkillLevelSetsAction(): Promise<
  TenantSkillLevelSetWithLevels[] | null
> {
  const user = await getServerUser()
  if (!user?.tenant_id) return null
  const supabase = await createClient()
  return getTenantSkillLevelSetsWithLevels(supabase)
}

export async function createTenantSkillLevelSet(input: {
  name: string
}): Promise<ActionResult & { id?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('tenant_skill_level_sets')
    .insert({ tenant_id: user.tenant_id, name: input.name.trim(), sort_order: 0 })
    .select('id')
    .single()
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true, id: data.id }
}

export async function updateTenantSkillLevelSet(input: {
  id: string
  name: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('tenant_skill_level_sets')
    .update({ name: input.name.trim() })
    .eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

export async function deleteTenantSkillLevelSet(input: { id: string }): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('tenant_skill_level_sets')
    .delete()
    .eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

export async function createTenantSkillLevelInSet(input: {
  skillLevelSetId: string
  name: string
  colorHex?: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  if (input.colorHex && !/^#[0-9a-fA-F]{6}$/.test(input.colorHex))
    return { success: false, error: '無効なカラーコードです' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('skill_levels').insert({
    tenant_id: user.tenant_id,
    skill_level_set_id: input.skillLevelSetId,
    name: input.name,
    color_hex: input.colorHex ?? '#6b7280',
    sort_order: 0,
  })
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

export async function updateTenantSkillLevelInSet(input: {
  id: string
  name?: string
  colorHex?: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  if (input.colorHex && !/^#[0-9a-fA-F]{6}$/.test(input.colorHex))
    return { success: false, error: '無効なカラーコードです' }
  const supabase = await createClient()
  const updates: Record<string, any> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.colorHex !== undefined) updates.color_hex = input.colorHex
  if (Object.keys(updates).length === 0) return { success: true }
  const { error } = await (supabase as any).from('skill_levels').update(updates).eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

export async function deleteTenantSkillLevelFromSet(input: { id: string }): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('skill_levels').delete().eq('id', input.id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

// ---- eラーニングコース × スキルレベルマッピング ----

export async function addCourseSkillLevelMapping(input: {
  courseId: string
  skillLevelId: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any).from('el_course_skill_level_mappings').insert({
    tenant_id: user.tenant_id,
    course_id: input.courseId,
    skill_level_id: input.skillLevelId,
  })
  if (error) {
    if (String(error.code) === '23505') return { success: false, error: 'すでに登録済みです' }
    return { success: false, error: error.message }
  }
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

export async function removeCourseSkillLevelMapping(input: {
  mappingId: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('el_course_skill_level_mappings')
    .delete()
    .eq('id', input.mappingId)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_TEMP_COPY_PATH)
  return { success: true }
}

export async function loadAvailableCoursesForMappingAction(): Promise<
  Array<{ id: string; title: string }>
> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []
  const supabase = await createClient()
  return getAvailableCoursesForLevelMapping(supabase)
}

// ============================================================
// ---- 要員アサイン・シミュレータ Server Actions ----
// ============================================================

export async function createProjectSimulation(input: {
  name: string
  description?: string
}): Promise<ActionResult & { id?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('project_simulations')
    .insert({
      tenant_id: user.tenant_id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: 'draft',
      created_by: user.employee_id || null
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/skill-map')
  return { success: true, id: data.id }
}

export async function updateProjectSimulation(input: {
  id: string
  name?: string
  description?: string
  status?: 'draft' | 'approved' | 'archived'
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.description !== undefined) updates.description = input.description.trim() || null
  if (input.status !== undefined) updates.status = input.status

  const { error } = await (supabase as any)
    .from('project_simulations')
    .update(updates)
    .eq('id', input.id)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/skill-map')
  return { success: true }
}

export async function deleteProjectSimulation(id: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('project_simulations')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/skill-map')
  return { success: true }
}

export async function createSimulationPosition(input: {
  simulationId: string
  name: string
}): Promise<ActionResult & { id?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  const { data, error } = await (supabase as any)
    .from('simulation_positions')
    .insert({
      tenant_id: user.tenant_id,
      simulation_id: input.simulationId,
      name: input.name.trim(),
      sort_order: 0
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath(`/skill-map`)
  return { success: true, id: data.id }
}

export async function deleteSimulationPosition(id: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('simulation_positions')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }
  revalidatePath(`/skill-map`)
  return { success: true }
}

export async function addPositionRequirement(input: {
  positionId: string
  requirementId: string
  isEssential: boolean
  weight: number
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('simulation_position_requirements')
    .insert({
      tenant_id: user.tenant_id,
      position_id: input.positionId,
      requirement_id: input.requirementId,
      is_essential: input.isEssential,
      weight: input.weight
    })

  if (error) return { success: false, error: error.message }
  revalidatePath(`/skill-map`)
  return { success: true }
}

export async function deletePositionRequirement(id: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('simulation_position_requirements')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }
  revalidatePath(`/skill-map`)
  return { success: true }
}

export async function assignMemberToPosition(input: {
  simulationId: string
  positionId: string
  employeeId: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  // UNIQUE制約のため既存の割り当てがあれば削除、または upsert
  const { error } = await (supabase as any)
    .from('simulation_assigned_members')
    .upsert({
      tenant_id: user.tenant_id,
      simulation_id: input.simulationId,
      position_id: input.positionId,
      employee_id: input.employeeId
    }, { onConflict: 'simulation_id,position_id' })

  if (error) return { success: false, error: error.message }
  revalidatePath(`/skill-map`)
  return { success: true }
}

export async function removeMemberFromPosition(input: {
  simulationId: string
  positionId: string
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('simulation_assigned_members')
    .delete()
    .eq('simulation_id', input.simulationId)
    .eq('position_id', input.positionId)

  if (error) return { success: false, error: error.message }
  revalidatePath(`/skill-map`)
  return { success: true }
}

export async function saveEmployeeCareerGoal(input: {
  employeeId: string
  targetSkillId: string
  targetDate: string | null
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('employee_career_goals')
    .upsert({
      tenant_id: user.tenant_id,
      employee_id: input.employeeId,
      target_skill_id: input.targetSkillId,
      target_date: input.targetDate,
      updated_at: new Date().toISOString()
    }, { onConflict: 'employee_id,target_skill_id' })

  if (error) return { success: false, error: error.message }
  revalidatePath(`/skill-map`)
  return { success: true }
}

/**
 * 従業員の現在のスキル充足率を履歴スナップショットとして記録する
 */
export async function recordEmployeeSkillHistorySnapshot(input: {
  employeeId: string
  skillId: string
  totalRequirements: number
  completedRequirements: number
  completionRate: number
}): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('employee_skill_requirement_history')
    .insert({
      tenant_id: user.tenant_id,
      employee_id: input.employeeId,
      recorded_at: new Date().toISOString().split('T')[0],
      skill_id: input.skillId,
      total_requirements: input.totalRequirements,
      completed_requirements: input.completedRequirements,
      completion_rate: input.completionRate
    })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * 要件適合候補者検索Server Action (非同期リクエスト用)
 */
export async function searchMatchingEmployeesAction(input: {
  requirements: Array<{ requirement_id: string; is_essential: boolean; weight: number }>
  targetDivisionId?: string
}): Promise<{ success: true; candidates: any[] } | { success: false; error: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  try {
    const candidates = await searchMatchingEmployees(supabase, input)
    return { success: true, candidates }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * スキルボトルネック分析データを取得するServer Action
 */
export async function getSkillBottleneckAnalysisAction(input: {
  divisionId?: string
  skillId: string
}): Promise<{ success: true; bottleneckData: any[] } | { success: false; error: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '権限がありません' }
  const supabase = await createClient()

  try {
    const bottleneckData = await getSkillBottleneckAnalysis(supabase, input)
    return { success: true, bottleneckData }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

