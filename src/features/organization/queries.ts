// src/features/organization/queries.ts
import { createClient } from '@/lib/supabase/server';

/**
 * 全部署を取得（RLSで自テナントのみ）
 */
export async function getDivisions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('divisions')
    .select('*')
    .order('layer', { ascending: true });

  if (error) {
    console.error('getDivisions error:', error);
    return [];
  }
  return data || [];
}

/**
 * 全従業員を取得（division, app_role JOINあり）
 */
export async function getEmployees() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('employees')
    .select(`
      *,
      division:division_id(id, name),
      app_role:app_role_id(id, app_role, name)
    `)
    .order('employee_no', { ascending: true });

  if (error) {
    console.error('getEmployees error:', error);
    return [];
  }
  return data || [];
}

/**
 * 未所属従業員を取得（division_id が NULL）
 */
export async function getUnassignedEmployees() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, employee_no, job_title, division_id')
    .is('division_id', null)
    .order('employee_no', { ascending: true });

  if (error) {
    console.error('getUnassignedEmployees error:', error);
    return [];
  }
  return data || [];
}

/**
 * 部署ごとの従業員を取得（ツリー表示用）
 */
export async function getEmployeesByDivision() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, employee_no, job_title, division_id')
    .not('division_id', 'is', null)
    .order('employee_no', { ascending: true });

  if (error) {
    console.error('getEmployeesByDivision error:', error);
    return [];
  }
  return data || [];
}

/**
 * アプリロール一覧を取得（セレクトボックス用）
 */
export async function getAppRoles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('app_role')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('getAppRoles error:', error);
    return [];
  }
  return data || [];
}

/**
 * テナントの従業員上限と内訳を取得
 * - limit: tenants.max_employees（数値でない／NULL は未設定で null）
 * - registered_user_count: app_role <> 'company_doctor'（ロール未設定含む）
 * - company_doctor_count: app_role = 'company_doctor'
 * - remaining: limit があるとき max −（登録ユーザ数 + 産業医）、未設定時は null
 */
export async function getTenantEmployeeCapacity(tenantId: string) {
  const supabase = await createClient();

  const [{ data: tenant, error: tenantError }, { data: empRows, error: empError }] = await Promise.all([
    supabase
      .from('tenants')
      .select('max_employees')
      .eq('id', tenantId)
      .maybeSingle(),
    supabase
      .from('employees')
      .select(
        `
        app_role:app_role_id ( app_role )
      `
      )
      .eq('tenant_id', tenantId),
  ]);

  if (tenantError) {
    console.error('getTenantEmployeeCapacity tenant error:', tenantError);
  }
  if (empError) {
    console.error('getTenantEmployeeCapacity employees error:', empError);
  }

  let registered_user_count = 0;
  let company_doctor_count = 0;
  if (empRows && empRows.length > 0) {
    for (const row of empRows) {
      const ar = (row as { app_role?: { app_role?: string } | { app_role?: string }[] }).app_role;
      const slug = Array.isArray(ar) ? ar[0]?.app_role : ar?.app_role;
      if (slug === 'company_doctor') {
        company_doctor_count += 1;
      } else {
        registered_user_count += 1;
      }
    }
  }

  const rawMax = tenant?.max_employees;
  const limit =
    typeof rawMax === 'number' && Number.isFinite(rawMax) ? rawMax : null;
  const totalEmployees = registered_user_count + company_doctor_count;
  const remaining =
    limit === null ? null : Math.max(limit - totalEmployees, 0);

  return {
    limit,
    registered_user_count,
    company_doctor_count,
    remaining,
  };
}
