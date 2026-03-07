'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ========================================
// 認証チェック（全アクションで使用）
// ========================================
async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('認証が必要です')
  }
  return user
}

// ========================================
// ServiceCategory Actions
// ========================================
export async function getServiceCategories() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('service_category')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) throw new Error(`取得エラー: ${error.message}`)
  return data
}

export async function createServiceCategory(formData: FormData) {
  await requireAuth()
  const admin = createAdminClient()

  const name = formData.get('name') as string
  const description = formData.get('description') as string | null
  const displayOrder = Number(formData.get('display_order') ?? 0)

  const { error } = await admin.from('service_category').insert({
    name,
    description: description || null,
    display_order: displayOrder,
  })

  if (error) throw new Error(`作成エラー: ${error.message}`)
  revalidatePath('/system-master')
}

export async function updateServiceCategory(id: string, formData: FormData) {
  await requireAuth()
  const admin = createAdminClient()

  const name = formData.get('name') as string
  const description = formData.get('description') as string | null
  const displayOrder = Number(formData.get('display_order') ?? 0)

  const { error } = await admin
    .from('service_category')
    .update({
      name,
      description: description || null,
      display_order: displayOrder,
    })
    .eq('id', id)

  if (error) throw new Error(`更新エラー: ${error.message}`)
  revalidatePath('/system-master')
}

export async function deleteServiceCategory(id: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { error } = await admin
    .from('service_category')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`削除エラー: ${error.message}`)
  revalidatePath('/system-master')
}

// ========================================
// Service Actions
// ========================================
export async function getServices() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('service')
    .select('*, service_category(id, name)')
    .order('display_order', { ascending: true })

  if (error) throw new Error(`取得エラー: ${error.message}`)
  return data
}

export async function createService(formData: FormData) {
  await requireAuth()
  const admin = createAdminClient()

  const name = formData.get('name') as string
  const description = formData.get('description') as string | null
  const categoryId = formData.get('category_id') as string
  const displayOrder = Number(formData.get('display_order') ?? 0)

  const { error } = await admin.from('service').insert({
    name,
    description: description || null,
    category_id: categoryId,
    display_order: displayOrder,
  })

  if (error) throw new Error(`作成エラー: ${error.message}`)
  revalidatePath('/system-master')
}

export async function updateService(id: string, formData: FormData) {
  await requireAuth()
  const admin = createAdminClient()

  const name = formData.get('name') as string
  const description = formData.get('description') as string | null
  const categoryId = formData.get('category_id') as string
  const displayOrder = Number(formData.get('display_order') ?? 0)

  const { error } = await admin
    .from('service')
    .update({
      name,
      description: description || null,
      category_id: categoryId,
      display_order: displayOrder,
    })
    .eq('id', id)

  if (error) throw new Error(`更新エラー: ${error.message}`)
  revalidatePath('/system-master')
}

export async function deleteService(id: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { error } = await admin
    .from('service')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`削除エラー: ${error.message}`)
  revalidatePath('/system-master')
}

// ========================================
// AppRole Actions
// ========================================
export async function getAppRoles() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('app_role')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) throw new Error(`取得エラー: ${error.message}`)
  return data
}

export async function createAppRole(formData: FormData) {
  await requireAuth()
  const admin = createAdminClient()

  const name = formData.get('name') as string
  const description = formData.get('description') as string | null
  const displayOrder = Number(formData.get('display_order') ?? 0)

  const { error } = await admin.from('app_role').insert({
    name,
    description: description || null,
    display_order: displayOrder,
  })

  if (error) throw new Error(`作成エラー: ${error.message}`)
  revalidatePath('/system-master')
}

export async function updateAppRole(id: string, formData: FormData) {
  await requireAuth()
  const admin = createAdminClient()

  const name = formData.get('name') as string
  const description = formData.get('description') as string | null
  const displayOrder = Number(formData.get('display_order') ?? 0)

  const { error } = await admin
    .from('app_role')
    .update({
      name,
      description: description || null,
      display_order: displayOrder,
    })
    .eq('id', id)

  if (error) throw new Error(`更新エラー: ${error.message}`)
  revalidatePath('/system-master')
}

export async function deleteAppRole(id: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { error } = await admin
    .from('app_role')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`削除エラー: ${error.message}`)
  revalidatePath('/system-master')
}

// ========================================
// AppRoleService Actions（マトリクス管理）
// ========================================
export async function getAppRoleServices() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('app_role_service')
    .select('*')

  if (error) throw new Error(`取得エラー: ${error.message}`)
  return data
}

export async function toggleAppRoleService(roleId: string, serviceId: string) {
  await requireAuth()
  const admin = createAdminClient()

  // 既存レコードを確認
  const { data: existing } = await admin
    .from('app_role_service')
    .select('id')
    .eq('role_id', roleId)
    .eq('service_id', serviceId)
    .maybeSingle()

  if (existing) {
    // 存在する → 削除（トグルOFF）
    const { error } = await admin
      .from('app_role_service')
      .delete()
      .eq('id', existing.id)

    if (error) throw new Error(`削除エラー: ${error.message}`)
  } else {
    // 存在しない → 追加（トグルON）
    const { error } = await admin
      .from('app_role_service')
      .insert({ role_id: roleId, service_id: serviceId })

    if (error) throw new Error(`作成エラー: ${error.message}`)
  }

  revalidatePath('/system-master')
}

// 一括更新（ロール単位でサービスを設定）
export async function bulkUpdateAppRoleServices(
  roleId: string,
  serviceIds: string[]
) {
  await requireAuth()
  const admin = createAdminClient()

  // 既存を全削除
  const { error: deleteError } = await admin
    .from('app_role_service')
    .delete()
    .eq('role_id', roleId)

  if (deleteError) throw new Error(`削除エラー: ${deleteError.message}`)

  // 新規一括挿入
  if (serviceIds.length > 0) {
    const rows = serviceIds.map((serviceId) => ({
      role_id: roleId,
      service_id: serviceId,
    }))

    const { error: insertError } = await admin
      .from('app_role_service')
      .insert(rows)

    if (insertError) throw new Error(`作成エラー: ${insertError.message}`)
  }

  revalidatePath('/system-master')
}