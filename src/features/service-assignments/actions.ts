'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import { getServerUser } from '@/lib/auth/server-user'

const ADM_PATH = APP_ROUTES.TENANT.ADMIN

// service_assignments 等は型定義に含まれない場合があるため any でラップ
async function getSupabase() {
  return (await createClient()) as any
}
const SERVICE_ASSIGNMENTS_PATH = `${ADM_PATH}/service-assignments`

// ========== service_assignments ==========

export async function createServiceAssignment(serviceType: string) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: '認証が必要です' }
  }

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('service_assignments')
    .insert({
      tenant_id: user.tenant_id,
      service_type: serviceType,
    })
    .select()
    .single()

  if (error) {
    console.error('createServiceAssignment error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(SERVICE_ASSIGNMENTS_PATH)
  return { success: true, data }
}

export async function updateServiceAssignment(id: string, serviceType: string) {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('service_assignments')
    .update({ service_type: serviceType })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('updateServiceAssignment error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(SERVICE_ASSIGNMENTS_PATH)
  revalidatePath(`${SERVICE_ASSIGNMENTS_PATH}/${id}`)
  return { success: true, data }
}

export async function deleteServiceAssignment(id: string) {
  const supabase = await getSupabase()
  const { error } = await supabase.from('service_assignments').delete().eq('id', id)

  if (error) {
    console.error('deleteServiceAssignment error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(SERVICE_ASSIGNMENTS_PATH)
  return { success: true }
}

// ========== 対象ユーザー同期 ==========

export async function syncServiceAssignmentUsers(serviceAssignmentId: string) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { success: false, error: '認証が必要です' }
  }

  const supabase = await getSupabase()
  const { data, error } = await supabase.rpc('sync_service_assignment_users', {
    p_service_assignment_id: serviceAssignmentId,
  })

  if (error) {
    console.error('syncServiceAssignmentUsers error:', error)
    return { success: false, error: error.message }
  }

  const insertedCount = (data?.[0] as { inserted_count?: number })?.inserted_count ?? 0
  revalidatePath(SERVICE_ASSIGNMENTS_PATH)
  revalidatePath(`${SERVICE_ASSIGNMENTS_PATH}/${serviceAssignmentId}`)
  return { success: true, insertedCount }
}

// ========== service_assignments_users ==========

export async function updateServiceAssignmentUserAvailability(
  id: string,
  isAvailable: boolean,
  serviceAssignmentId?: string
) {
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('service_assignments_users')
    .update({ is_available: isAvailable })
    .eq('id', id)

  if (error) {
    console.error('updateServiceAssignmentUserAvailability error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(SERVICE_ASSIGNMENTS_PATH)
  if (serviceAssignmentId) {
    revalidatePath(`${SERVICE_ASSIGNMENTS_PATH}/${serviceAssignmentId}`)
  }
  return { success: true }
}

export async function deleteServiceAssignmentUser(
  id: string,
  serviceAssignmentId?: string
) {
  const supabase = await getSupabase()
  const { error } = await supabase.from('service_assignments_users').delete().eq('id', id)

  if (error) {
    console.error('deleteServiceAssignmentUser error:', error)
    return { success: false, error: error.message }
  }
  revalidatePath(SERVICE_ASSIGNMENTS_PATH)
  if (serviceAssignmentId) {
    revalidatePath(`${SERVICE_ASSIGNMENTS_PATH}/${serviceAssignmentId}`)
  }
  return { success: true }
}
