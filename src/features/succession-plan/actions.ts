'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import type { PositionFormInput, CandidateFormInput, ActionResult } from './types'

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

async function authorizeHr() {
  const user = await getServerUser()
  if (!user?.tenant_id) throw new Error('Unauthorized')
  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) throw new Error('Forbidden')
  return user
}

/** ポジションを新規作成する */
export async function createPosition(input: PositionFormInput): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()

    const { error } = await supabase.from('succession_positions').insert({
      tenant_id: user.tenant_id,
      title: input.title.trim(),
      division_id: input.division_id || null,
      current_holder_id: input.current_holder_id || null,
      risk_level: input.risk_level,
      notes: input.notes.trim() || null,
    })

    if (error) return { success: false, error: error.message }

    revalidatePath('/adm/succession')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** ポジションを更新する */
export async function updatePosition(
  id: string,
  input: PositionFormInput
): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()

    const { error } = await supabase
      .from('succession_positions')
      .update({
        title: input.title.trim(),
        division_id: input.division_id || null,
        current_holder_id: input.current_holder_id || null,
        risk_level: input.risk_level,
        notes: input.notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/adm/succession')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** ポジションを非アクティブ化する（論理削除） */
export async function deactivatePosition(id: string): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()

    const { error } = await supabase
      .from('succession_positions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/adm/succession')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** 後継候補を登録または更新する（position_id + employee_id でユニーク） */
export async function upsertCandidate(input: CandidateFormInput): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()

    const { error } = await supabase.from('succession_candidates').upsert(
      {
        tenant_id: user.tenant_id,
        position_id: input.position_id,
        employee_id: input.employee_id,
        readiness: input.readiness,
        performance_score: input.performance_score,
        potential_score: input.potential_score,
        development_actions: input.development_actions.trim() || null,
        notes: input.notes.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'position_id,employee_id', ignoreDuplicates: false }
    )

    if (error) return { success: false, error: error.message }

    revalidatePath('/adm/succession')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}

/** 後継候補を削除する */
export async function deleteCandidate(id: string): Promise<ActionResult> {
  try {
    const user = await authorizeHr()
    const supabase = await createClient()

    const { error } = await supabase
      .from('succession_candidates')
      .delete()
      .eq('id', id)
      .eq('tenant_id', user.tenant_id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/adm/succession')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '予期せぬエラー' }
  }
}
