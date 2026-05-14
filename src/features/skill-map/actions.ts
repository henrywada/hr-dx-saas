// src/features/skill-map/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import type { EmployeeSkillAssignment } from './types'

type ActionResult = { success: true } | { success: false; error: string }

const SKILL_MAP_PATH = APP_ROUTES.TENANT.ADMIN_SKILL_MAP
const REQUIREMENTS_PATH = APP_ROUTES.TENANT.ADMIN_SKILL_MAP_REQUIREMENTS

const HEX_RE = /^#[0-9a-fA-F]{6}$/
function isValidHex(hex: string | undefined): boolean {
  return !hex || HEX_RE.test(hex)
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
    .from('tenant_skills').update(updates)
    .eq('id', input.id).eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_MAP_PATH)
  return { success: true }
}

export async function deleteTenantSkill(id: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('tenant_skills').delete()
    .eq('id', id).eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_MAP_PATH)
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
  revalidatePath(REQUIREMENTS_PATH)
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
    .from('skill_levels').update(updates)
    .eq('id', input.id).eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(REQUIREMENTS_PATH)
  return { success: true }
}

export async function deleteSkillLevel(id: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('skill_levels').delete()
    .eq('id', id).eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(REQUIREMENTS_PATH)
  return { success: true }
}

// ---- 従業員技能割り当て (employee_skill_assignments) ----

export async function assignSkill(input: {
  employeeId: string
  skillId: string
  startedAt: string   // 'YYYY-MM-DD'
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
    .from('employee_skill_assignments').delete()
    .eq('id', id).eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(SKILL_MAP_PATH)
  return { success: true }
}

export async function getEmployeeSkillHistory(employeeId: string): Promise<EmployeeSkillAssignment[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('employee_skill_assignments')
    .select('*, skill:tenant_skills(*)')
    .eq('employee_id', employeeId)
    .eq('tenant_id', user.tenant_id)
    .order('started_at', { ascending: false })
  if (error) return []
  return data ?? []
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
  revalidatePath(REQUIREMENTS_PATH)
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
    .from('skill_requirements').update(updates)
    .eq('id', input.id).eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(REQUIREMENTS_PATH)
  return { success: true }
}

export async function deleteSkillRequirement(id: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('skill_requirements').delete()
    .eq('id', id).eq('tenant_id', user.tenant_id)
  if (error) return { success: false, error: error.message }
  revalidatePath(REQUIREMENTS_PATH)
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
      .eq('id', input.draftId).eq('tenant_id', user.tenant_id)
    if (error) return { success: false, error: error.message }
    revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP_SIMULATION)
    return { success: true, draftId: input.draftId }
  }
  const { data, error } = await (supabase as any)
    .from('skill_map_drafts')
    .insert({ tenant_id: user.tenant_id, name: input.name, snapshot: input.snapshot, created_by: user.employee_id ?? null })
    .select('id')
    .single()
  if (error) return { success: false, error: error.message }
  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP_SIMULATION)
  return { success: true, draftId: data.id }
}

export async function confirmSkillMapDraft(draftId: string): Promise<ActionResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }
  const supabase = await createClient()
  const { data: draft, error: draftError } = await (supabase as any)
    .from('skill_map_drafts').select('snapshot')
    .eq('id', draftId).eq('tenant_id', user.tenant_id).single()
  if (draftError) return { success: false, error: draftError.message }
  const snapshot: Record<string, string> = draft.snapshot ?? {}
  for (const [employeeId, divisionId] of Object.entries(snapshot)) {
    const { error } = await (supabase as any).from('employees').update({ division_id: divisionId }).eq('id', employeeId)
    if (error) return { success: false, error: error.message }
  }
  const { error: confirmError } = await (supabase as any)
    .from('skill_map_drafts').update({ status: 'confirmed' })
    .eq('id', draftId).eq('tenant_id', user.tenant_id)
  if (confirmError) return { success: false, error: confirmError.message }
  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP_SIMULATION)
  return { success: true }
}
