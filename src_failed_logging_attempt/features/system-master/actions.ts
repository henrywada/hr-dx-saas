'use server';

import { createAdminClient } from '@/lib/supabase/admin'; // ✅ adminクライアントを使用
import { revalidatePath } from 'next/cache';

/**
 * 共通の更新処理 (Admin権限)
 */
async function performUpdate(table: string, id: string, updates: any) {
  const supabase = createAdminClient(); // ✅ RLSをバイパス
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select();
  if (error) {
    console.error(`Update Error [${table}]:`, error);
    return { success: false, error: error.message };
  }
  revalidatePath('/system-master');
  return { success: true, data };
}

/**
 * 共通の作成処理 (Admin権限)
 */
async function performCreate(table: string, item: any) {
  const supabase = createAdminClient(); // ✅ RLSをバイパス
  const { data, error } = await supabase.from(table).insert(item).select();
  if (error) {
    console.error(`Create Error [${table}]:`, error);
    return { success: false, error: error.message };
  }
  revalidatePath('/system-master');
  return { success: true, data };
}

/**
 * 共通の削除処理 (Admin権限)
 */
async function performDelete(table: string, id: string) {
  const supabase = createAdminClient(); // ✅ RLSをバイパス
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) {
    console.error(`Delete Error [${table}]:`, error);
    return { success: false, error: error.message };
  }
  revalidatePath('/system-master');
  return { success: true };
}

// --- Service Category ---
export async function createServiceCategory(item: any) { return performCreate('service_category', item); }
export async function updateServiceCategory(id: string, updates: any) { return performUpdate('service_category', id, updates); }
export async function deleteServiceCategory(id: string) { return performDelete('service_category', id); }

// --- Service ---
export async function createService(item: any) { return performCreate('service', item); }
export async function updateService(id: string, updates: any) { return performUpdate('service', id, updates); }
export async function deleteService(id: string) { return performDelete('service', id); }

// --- App Role ---
export async function createAppRole(item: any) { return performCreate('app_role', item); }
export async function updateAppRole(id: string, updates: any) { return performUpdate('app_role', id, updates); }
export async function deleteAppRole(id: string) { return performDelete('app_role', id); }

// --- App Role Service (Matrix) ---
export async function toggleAppRoleService(roleId: string, serviceId: string, isEnabled: boolean) {
  const supabase = createAdminClient();
  if (isEnabled) {
    // ✅ role_id ではなく app_role_id に修正
    const { error } = await supabase.from('app_role_service').insert({ 
      app_role_id: roleId, 
      service_id: serviceId 
    });
    if (error) return { success: false, error: error.message };
  } else {
    // ✅ role_id ではなく app_role_id に修正
    const { error } = await supabase.from('app_role_service').delete().match({ 
      app_role_id: roleId, 
      service_id: serviceId 
    });
    if (error) return { success: false, error: error.message };
  }
  revalidatePath('/system-master');
  return { success: true };
}

export async function getAppRoleServices() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('app_role_service').select('*');
  if (error) throw error;
  return data;
}