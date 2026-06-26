'use server'

import { createAdminClient } from '@/lib/supabase/admin' // ✅ adminクライアントを使用
import { revalidatePath } from 'next/cache'
import fs from 'node:fs/promises'
import { resolvePageFilePath } from '@/lib/route-resolver'
import { generateGeminiContent, GEMINI_FLASH_MODEL } from '@/lib/ai/gemini'
import { truncateAiAdvice, MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH } from './ai-advice-helpers'

/**
 * 共通の更新処理 (Admin権限)
 */
async function performUpdate(table: string, id: string, updates: any) {
  const supabase = createAdminClient() // ✅ RLSをバイパス
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select()
  if (error) {
    console.error(`Update Error [${table}]:`, error)
    return { success: false, error: error.message }
  }
  revalidatePath('/saas_adm/system-master')
  return { success: true, data }
}

/**
 * 共通の作成処理 (Admin権限)
 */
async function performCreate(table: string, item: any) {
  const supabase = createAdminClient() // ✅ RLSをバイパス
  const { data, error } = await supabase.from(table).insert(item).select()
  if (error) {
    console.error(`Create Error [${table}]:`, error)
    return { success: false, error: error.message }
  }
  revalidatePath('/saas_adm/system-master')
  return { success: true, data }
}

/**
 * 共通の削除処理 (Admin権限)
 */
async function performDelete(table: string, id: string) {
  const supabase = createAdminClient() // ✅ RLSをバイパス
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) {
    console.error(`Delete Error [${table}]:`, error)
    return { success: false, error: error.message }
  }
  revalidatePath('/saas_adm/system-master')
  return { success: true }
}

// --- Service Class ---
export async function createServiceClass(item: any) {
  return performCreate('service_class', item)
}
export async function updateServiceClass(id: string, updates: any) {
  return performUpdate('service_class', id, updates)
}
export async function deleteServiceClass(id: string) {
  return performDelete('service_class', id)
}

// --- Service Class Index（サービスカテゴリ ⇔ クラス の紐付け）---
export async function setServiceCategoryClass(categoryId: string, classId: string | null) {
  const supabase = createAdminClient()

  const { error: delError } = await supabase
    .from('service_class_index')
    .delete()
    .eq('service_category_id', categoryId)
  if (delError) {
    console.error('setServiceCategoryClass delete error:', delError)
    return { success: false, error: delError.message }
  }

  if (classId) {
    const { error: insError } = await supabase
      .from('service_class_index')
      .insert({ service_category_id: categoryId, service_class_id: classId })
    if (insError) {
      console.error('setServiceCategoryClass insert error:', insError)
      return { success: false, error: insError.message }
    }
  }

  revalidatePath('/saas_adm/system-master')
  return { success: true }
}

// --- Service Category ---
export async function createServiceCategory(item: any) {
  return performCreate('service_category', item)
}
export async function updateServiceCategory(id: string, updates: any) {
  return performUpdate('service_category', id, updates)
}
export async function deleteServiceCategory(id: string) {
  return performDelete('service_category', id)
}

// --- Service ---
export async function createService(item: any) {
  return performCreate('service', { ...item, created_at: new Date().toISOString() })
}
export async function updateService(id: string, updates: any) {
  return performUpdate('service', id, { ...updates, created_at: new Date().toISOString() })
}
export async function deleteService(id: string) {
  return performDelete('service', id)
}

// --- App Role ---
export async function createAppRole(item: any) {
  return performCreate('app_role', item)
}
export async function updateAppRole(id: string, updates: any) {
  return performUpdate('app_role', id, updates)
}
export async function deleteAppRole(id: string) {
  return performDelete('app_role', id)
}

// --- App Role Service (Matrix) ---
export async function toggleAppRoleService(roleId: string, serviceId: string, isEnabled: boolean) {
  const supabase = createAdminClient()
  if (isEnabled) {
    // ✅ role_id ではなく app_role_id に修正
    const { error } = await supabase.from('app_role_service').insert({
      app_role_id: roleId,
      service_id: serviceId,
    })
    if (error) return { success: false, error: error.message }
  } else {
    // ✅ role_id ではなく app_role_id に修正
    const { error } = await supabase.from('app_role_service').delete().match({
      app_role_id: roleId,
      service_id: serviceId,
    })
    if (error) return { success: false, error: error.message }
  }
  revalidatePath('/saas_adm/system-master')
  return { success: true }
}

/** マトリクス上の1ロール列について、表示中サービスとの権限を一括で ON/OFF */
export async function bulkSetAppRoleServiceColumn(
  roleId: string,
  serviceIds: string[],
  enabled: boolean
) {
  if (!roleId || serviceIds.length === 0) {
    return { success: true as const }
  }
  const supabase = createAdminClient()

  if (!enabled) {
    const { error } = await supabase
      .from('app_role_service')
      .delete()
      .eq('app_role_id', roleId)
      .in('service_id', serviceIds)
    if (error) return { success: false as const, error: error.message }
    revalidatePath('/saas_adm/system-master')
    return { success: true as const }
  }

  const { data: existing, error: selErr } = await supabase
    .from('app_role_service')
    .select('service_id')
    .eq('app_role_id', roleId)
    .in('service_id', serviceIds)
  if (selErr) return { success: false as const, error: selErr.message }

  const have = new Set((existing ?? []).map((r: { service_id: string }) => r.service_id))
  const toInsert = serviceIds.filter(id => !have.has(id))
  if (toInsert.length === 0) {
    revalidatePath('/saas_adm/system-master')
    return { success: true as const }
  }

  const rows = toInsert.map(service_id => ({ app_role_id: roleId, service_id }))
  const { error: insErr } = await supabase.from('app_role_service').insert(rows)
  if (insErr) return { success: false as const, error: insErr.message }
  revalidatePath('/saas_adm/system-master')
  return { success: true as const }
}

export async function getAppRoleServices() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('app_role_service').select('*')
  if (error) throw error
  return data
}

// --- Tenant Service (Matrix) ---
export async function toggleTenantService(tenantId: string, serviceId: string, isEnabled: boolean) {
  const supabase = createAdminClient()
  if (isEnabled) {
    const { error } = await supabase.from('tenant_service').insert({
      tenant_id: tenantId,
      service_id: serviceId,
    })
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('tenant_service').delete().match({
      tenant_id: tenantId,
      service_id: serviceId,
    })
    if (error) return { success: false, error: error.message }
  }
  revalidatePath('/saas_adm/system-master')
  return { success: true }
}

/** 一覧に表示しているサービスについて、テナントの有効/無効を一括で合わせる */
export async function bulkSetTenantServices(
  tenantId: string,
  serviceIds: string[],
  enabled: boolean
) {
  if (!tenantId || serviceIds.length === 0) {
    return { success: true as const }
  }
  const supabase = createAdminClient()

  if (!enabled) {
    const { error } = await supabase
      .from('tenant_service')
      .delete()
      .eq('tenant_id', tenantId)
      .in('service_id', serviceIds)
    if (error) return { success: false as const, error: error.message }
    revalidatePath('/saas_adm/system-master')
    return { success: true as const }
  }

  const { data: existing, error: selErr } = await supabase
    .from('tenant_service')
    .select('service_id')
    .eq('tenant_id', tenantId)
    .in('service_id', serviceIds)
  if (selErr) return { success: false as const, error: selErr.message }

  const have = new Set((existing ?? []).map((r: { service_id: string }) => r.service_id))
  const toInsert = serviceIds.filter(id => !have.has(id))
  if (toInsert.length === 0) {
    revalidatePath('/saas_adm/system-master')
    return { success: true as const }
  }

  const rows = toInsert.map(service_id => ({ tenant_id: tenantId, service_id }))
  const { error: insErr } = await supabase.from('tenant_service').insert(rows)
  if (insErr) return { success: false as const, error: insErr.message }
  revalidatePath('/saas_adm/system-master')
  return { success: true as const }
}

export async function getTenantServices() {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('tenant_service').select('*')
  if (error) throw error
  return data || []
}

// --- AI Suggestion ---

const MAX_SOURCE_CHARS = 8000

const AI_ADVICE_SYSTEM_PROMPT =
  'あなたは日本語のSaaSプロダクトのUXコピーライターです。渡されたNext.js/Reactコンポーネントのソースコードを解析し、' +
  'エンドユーザーが実際に使う機能として何を行うものかを正確に読み取った上で、管理画面のサービス一覧に表示するための、' +
  `タイトル（${MAX_TITLE_LENGTH}文字以内）とdescription（${MAX_DESCRIPTION_LENGTH}文字以内）を日本語で作成してください。` +
  '誇大な煽り文句や事実と異なる効果（具体的な削減率など）は含めないでください。'

/**
 * サービスの route_path に対応するページコンポーネントのソースコードを解析し、
 * タイトル・descriptionを Gemini で生成する。
 */
export async function generateServiceAiAdvice(
  routePath: string,
  serviceName: string,
  categoryName: string
): Promise<
  | { success: true; data: { title: string; description: string } }
  | { success: false; error: string }
> {
  const filePath = resolvePageFilePath(routePath)
  if (!filePath) {
    return { success: false, error: 'ページコンポーネントが見つかりませんでした' }
  }

  try {
    const rawSource = await fs.readFile(filePath, 'utf-8')
    const source = rawSource.slice(0, MAX_SOURCE_CHARS)

    const prompt =
      `サービス名: ${serviceName}\n` +
      `カテゴリ名: ${categoryName}\n` +
      `ページコンポーネントのソースコード:\n${source}`

    const responseText = await generateGeminiContent({
      model: GEMINI_FLASH_MODEL,
      system: AI_ADVICE_SYSTEM_PROMPT,
      prompt,
      json: true,
      responseJsonSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['title', 'description'],
      },
    })

    const parsed = JSON.parse(responseText) as { title: string; description: string }
    return { success: true, data: truncateAiAdvice(parsed) }
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー'
    return { success: false, error: `AI生成に失敗しました: ${message}` }
  }
}
