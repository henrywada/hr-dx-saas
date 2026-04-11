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
  revalidatePath('/saas_adm/system-master');
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
  revalidatePath('/saas_adm/system-master');
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
  revalidatePath('/saas_adm/system-master');
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
  revalidatePath('/saas_adm/system-master');
  return { success: true };
}

/** マトリクス上の1ロール列について、表示中サービスとの権限を一括で ON/OFF */
export async function bulkSetAppRoleServiceColumn(
  roleId: string,
  serviceIds: string[],
  enabled: boolean
) {
  if (!roleId || serviceIds.length === 0) {
    return { success: true as const };
  }
  const supabase = createAdminClient();

  if (!enabled) {
    const { error } = await supabase
      .from('app_role_service')
      .delete()
      .eq('app_role_id', roleId)
      .in('service_id', serviceIds);
    if (error) return { success: false as const, error: error.message };
    revalidatePath('/saas_adm/system-master');
    return { success: true as const };
  }

  const { data: existing, error: selErr } = await supabase
    .from('app_role_service')
    .select('service_id')
    .eq('app_role_id', roleId)
    .in('service_id', serviceIds);
  if (selErr) return { success: false as const, error: selErr.message };

  const have = new Set((existing ?? []).map((r: { service_id: string }) => r.service_id));
  const toInsert = serviceIds.filter((id) => !have.has(id));
  if (toInsert.length === 0) {
    revalidatePath('/saas_adm/system-master');
    return { success: true as const };
  }

  const rows = toInsert.map((service_id) => ({ app_role_id: roleId, service_id }));
  const { error: insErr } = await supabase.from('app_role_service').insert(rows);
  if (insErr) return { success: false as const, error: insErr.message };
  revalidatePath('/saas_adm/system-master');
  return { success: true as const };
}

export async function getAppRoleServices() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('app_role_service').select('*');
  if (error) throw error;
  return data;
}

// --- Tenant Service (Matrix) ---
export async function toggleTenantService(tenantId: string, serviceId: string, isEnabled: boolean) {
  const supabase = createAdminClient();
  if (isEnabled) {
    const { error } = await supabase.from('tenant_service').insert({ 
      tenant_id: tenantId, 
      service_id: serviceId 
    });
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from('tenant_service').delete().match({ 
      tenant_id: tenantId, 
      service_id: serviceId 
    });
    if (error) return { success: false, error: error.message };
  }
  revalidatePath('/saas_adm/system-master');
  return { success: true };
}

/** 一覧に表示しているサービスについて、テナントの有効/無効を一括で合わせる */
export async function bulkSetTenantServices(tenantId: string, serviceIds: string[], enabled: boolean) {
  if (!tenantId || serviceIds.length === 0) {
    return { success: true as const };
  }
  const supabase = createAdminClient();

  if (!enabled) {
    const { error } = await supabase
      .from('tenant_service')
      .delete()
      .eq('tenant_id', tenantId)
      .in('service_id', serviceIds);
    if (error) return { success: false as const, error: error.message };
    revalidatePath('/saas_adm/system-master');
    return { success: true as const };
  }

  const { data: existing, error: selErr } = await supabase
    .from('tenant_service')
    .select('service_id')
    .eq('tenant_id', tenantId)
    .in('service_id', serviceIds);
  if (selErr) return { success: false as const, error: selErr.message };

  const have = new Set((existing ?? []).map((r: { service_id: string }) => r.service_id));
  const toInsert = serviceIds.filter((id) => !have.has(id));
  if (toInsert.length === 0) {
    revalidatePath('/saas_adm/system-master');
    return { success: true as const };
  }

  const rows = toInsert.map((service_id) => ({ tenant_id: tenantId, service_id }));
  const { error: insErr } = await supabase.from('tenant_service').insert(rows);
  if (insErr) return { success: false as const, error: insErr.message };
  revalidatePath('/saas_adm/system-master');
  return { success: true as const };
}

export async function getTenantServices() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('tenant_service').select('*');
  if (error) throw error;
  return data || [];
}

// --- AI Suggestion ---
export async function generateAiAdvice(
  serviceName: string,
  categoryName: string,
  currentTitle: string,
  currentDesc: string
) {
  // 擬似的なAIレスポンスの遅延
  await new Promise(resolve => setTimeout(resolve, 800));

  // カテゴリやサービス名に基づいた、ユーザーが使いたくなるキャッチーな文言を生成
  const catchyTitle = `✨【${categoryName}】${serviceName}で業務時間を最大80%削減`;
  const catchyDesc = `面倒な「${serviceName}」を完全にデジタル化。利用ユーザーの視点で、迷わず直感的に操作できる設計にこだわりました。これ一つで、${categoryName}の悩みから解放されます。`;

  console.log('[AI Mock Generation]', { serviceName, categoryName, currentTitle, currentDesc });

  return {
    success: true,
    data: {
      title: catchyTitle,
      description: catchyDesc
    }
  };
}
