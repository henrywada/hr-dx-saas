'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import type { StressCheckPeriod } from '@/features/stress-check/types'

function revalidateStressPeriodPaths() {
  revalidatePath(APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS)
  revalidatePath('/adm/stress-check/progress')
  revalidatePath('/adm/stress-check/heat-map')
  revalidatePath('/adm/stress-check/mnt_sets')
}

/** 拠点に紐づく実施期間一覧（編集フォーム用） */
export async function fetchPeriodsForEstablishment(
  establishmentId: string,
): Promise<StressCheckPeriod[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stress_check_periods')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .eq('division_establishment_id', establishmentId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('fetchPeriodsForEstablishment', error)
    return []
  }
  return (data ?? []) as StressCheckPeriod[]
}

export async function createStressCheckPeriod(data: {
  tenant_id: string
  division_establishment_id: string
  title: string
  questionnaire_type: '57' | '23'
  status: 'draft' | 'active' | 'closed'
  start_date: string
  end_date: string
  fiscal_year: number
}) {
  const supabase = await createClient()
  const { data: result, error } = await supabase
    .from('stress_check_periods')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('createStressCheckPeriod error:', error)
    return { success: false as const, error: error.message }
  }
  revalidateStressPeriodPaths()
  return { success: true as const, data: result }
}

export async function updateStressCheckPeriod(
  id: string,
  updates: {
    title?: string
    questionnaire_type?: '57' | '23'
    status?: 'draft' | 'active' | 'closed'
    start_date?: string
    end_date?: string
    fiscal_year?: number
  },
) {
  const supabase = await createClient()
  const { data: result, error } = await supabase
    .from('stress_check_periods')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('updateStressCheckPeriod error:', error)
    return { success: false as const, error: error.message }
  }
  revalidateStressPeriodPaths()
  return { success: true as const, data: result }
}

export async function deleteStressCheckPeriod(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('stress_check_periods').delete().eq('id', id)

  if (error) {
    console.error('deleteStressCheckPeriod error:', error)
    return { success: false as const, error: error.message }
  }
  revalidateStressPeriodPaths()
  return { success: true as const }
}
