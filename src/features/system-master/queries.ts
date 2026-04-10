import { createAdminClient } from '@/lib/supabase/admin';

export async function getServiceCategories() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('service_category')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('getServiceCategories error:', error);
    return [];
  }
  return data || [];
}

export async function getServices() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('service').select(`
      *,
      service_category (
        sort_order
      )
    `);

  if (error) {
    console.error('getServices error:', error);
    return [];
  }

  const rows = data || [];
  // 表示順: service_category.sort_order → service.sort_order（カテゴリ未設定は末尾）
  rows.sort((a, b) => {
    const ca = a.service_category?.sort_order ?? Number.MAX_SAFE_INTEGER;
    const cb = b.service_category?.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (ca !== cb) return ca - cb;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  return rows.map(({ service_category: _c, ...rest }) => rest);
}

export async function getAppRoles() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('app_role').select('*');

  if (error) {
    console.error('getAppRoles error:', error);
    return [];
  }
  const rows = data || [];
  // マトリクス等の表示順: app_role コード順（null は末尾）
  rows.sort((a, b) =>
    String(a.app_role ?? '\uffff').localeCompare(String(b.app_role ?? '\uffff'), 'ja')
  );
  return rows;
}

export async function getTenants() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('getTenants error:', error);
    return [];
  }
  return data || [];
}
