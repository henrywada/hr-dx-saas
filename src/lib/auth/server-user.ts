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
      name,
      tenant_id,
      app_role:app_role_id(app_role, name),
      tenants:tenant_id(name, plan_type, max_employees)
    `)
    .eq('user_id', user.id)
    .single();

  if (employee) {
    if (employee.name) name = employee.name;
    if (employee.tenant_id) tenant_id = employee.tenant_id;
    
    const distinctRole = employee.app_role as { app_role?: string; name?: string } | null | undefined;
    if (distinctRole?.app_role) {
      appRole = distinctRole.app_role;
    }
    if (distinctRole?.name) {
      appRoleName = distinctRole.name;
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
  };
}
