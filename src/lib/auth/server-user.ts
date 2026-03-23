import { createClient } from "@/lib/supabase/server";
import { AppUser, PlanType } from "@/types/auth";

export async function getServerUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  let name = user.user_metadata?.name || "Guest User";
  const role = user.user_metadata?.role || "member";
  let tenant_id = user.user_metadata?.tenant_id;
  let tenant_name = undefined;
  let appRole = undefined;
  let appRoleName = undefined;
  let planType: PlanType | undefined = undefined;
  let maxEmployees: number | undefined = undefined;

  // fetch employee details, app_role, and tenant_name from db if available
  // employees + app_role + tenants (プラン情報含む) を一括取得
  const { data: employee } = await supabase
    .from('employees')
    .select(`
      id,
      name,
      tenant_id,
      division_id,
      employee_no,
      app_role_id,
      app_role:app_role_id(app_role, name),
      tenants:tenant_id(name, plan_type, max_employees)
    `)
    .eq('user_id', user.id)
    .maybeSingle();

  let employee_id: string | undefined;
  let division_id: string | null | undefined = undefined;
  let employee_no: string | null | undefined = undefined;
  if (employee) {
    employee_id = (employee as { id?: string }).id;
    employee_no = (employee as { employee_no?: string | null }).employee_no ?? null;
    if (employee.name) name = employee.name;
    if (employee.tenant_id) tenant_id = employee.tenant_id;
    
    const distinctRole = employee.app_role as { app_role?: string; name?: string } | null | undefined;
    if (distinctRole?.app_role) {
      appRole = distinctRole.app_role;
    }
    if (distinctRole?.name) {
      appRoleName = distinctRole.name;
    }

    // JOIN が空でも app_role_id があれば app_role テーブルから補完（勤怠ダッシュ等の権限判定ずれ防止）
    const roleId = (employee as { app_role_id?: string | null }).app_role_id;
    if (!appRole && roleId) {
      const { data: arRow } = await supabase
        .from('app_role')
        .select('app_role, name')
        .eq('id', roleId)
        .maybeSingle();
      if (arRow) {
        const row = arRow as { app_role?: string; name?: string };
        if (row.app_role) appRole = row.app_role;
        if (row.name) appRoleName = row.name;
      }
    }

    const tenantInfo = employee.tenants as { name?: string; plan_type?: string; max_employees?: number } | null | undefined;
    if (tenantInfo?.name) {
      tenant_name = tenantInfo.name;
    }
    if (tenantInfo?.plan_type) {
      planType = tenantInfo.plan_type as PlanType;
    }
    if (tenantInfo?.max_employees !== undefined) {
      maxEmployees = tenantInfo.max_employees;
    }
    division_id = (employee as { division_id?: string | null }).division_id;
  }

  // If we couldn't get tenant_name via employee, try fetching directly if tenant_id exists
  // employee 経由で取得できなかった場合のフォールバック
  if (tenant_id && !tenant_name) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, plan_type, max_employees')
      .eq('id', tenant_id)
      .single();
    if (tenant) {
      tenant_name = tenant.name;
      const t = tenant as { name?: string; plan_type?: string; max_employees?: number };
      if (t.plan_type) planType = t.plan_type as PlanType;
      if (t.max_employees !== undefined) maxEmployees = t.max_employees;
    }
  }

  return {
    id: user.id,
    email: user.email,
    name,
    role,
    appRole,
    appRoleName,
    tenant_id,
    tenant_name,
    planType,
    maxEmployees,
    employee_id,
    division_id,
    employee_no,
  };
}
