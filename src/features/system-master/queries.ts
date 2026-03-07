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
  const { data, error } = await supabase
    .from('service')
    .select('*')
    .order('target_audience', { ascending: true })
    .order('service_category_id', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('getServices error:', error);
    return [];
  }
  return data || [];
}

export async function getAppRoles() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('app_role')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('getAppRoles error:', error);
    return [];
  }
  return data || [];
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
