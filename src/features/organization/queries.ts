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
