import { createAdminClient } from '@/lib/supabase/admin';
import type { TenantWithManager } from './types';

/**
 * 全テナント一覧を取得する（SaaS管理者用: RLSバイパス）
 * テナントの責任者（is_manager=true）情報も結合して返す
 */
export async function getAllTenants(): Promise<TenantWithManager[]> {
  const supabase = createAdminClient();

  try {
    // ===== Step 1: tenants を全件取得 =====
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getAllTenants error:', error);
      return [];
    }

    if (!tenants || tenants.length === 0) {
      console.log('getAllTenants: テナントが0件です');
      return [];
    }

    console.log(`getAllTenants: ${tenants.length}件のテナントを取得`);

    // ===== Step 2: 責任者情報を取得（エラーでもテナント表示は続行） =====
    const managerMap = new Map<string, { name: string; email: string | null; user_id: string | null }>();

    try {
      const tenantIds = tenants.map((t) => t.id);
      const { data: managers, error: mgrError } = await supabase
        .from('employees')
        .select('tenant_id, name, user_id')
        .in('tenant_id', tenantIds)
        .eq('is_manager', true);

      if (mgrError) {
        console.error('getManagers error (テナント一覧は表示を続行):', mgrError);
      } else if (managers && managers.length > 0) {
        // RPC経由でメールアドレスを個別取得（auth.admin.listUsers はJWTエラーのためバイパス）
        for (const mgr of managers) {
          let email: string | null = null;
          if (mgr.user_id) {
            try {
              const { data: userEmail } = await supabase.rpc('get_auth_user_email', { p_user_id: mgr.user_id });
              email = userEmail || null;
            } catch {
              // メール取得失敗はスキップ
            }
          }
          managerMap.set(mgr.tenant_id, { name: mgr.name, email, user_id: mgr.user_id || null });
        }
      }
    } catch (mgrErr) {
      console.error('責任者情報取得で予期せぬエラー (テナント一覧は表示を続行):', mgrErr);
    }

    // ===== Step 3: テナント別 従業員数（登録ユーザ / 産業医） =====
    const countMap = new Map<string, { registered_user_count: number; company_doctor_count: number }>();
    for (const t of tenants) {
      countMap.set(String(t.id), { registered_user_count: 0, company_doctor_count: 0 });
    }

    try {
      const tenantIds = tenants.map((t) => t.id);
      const { data: empRows, error: empError } = await supabase
        .from('employees')
        .select(
          `
          tenant_id,
          app_role:app_role_id ( app_role )
        `
        )
        .in('tenant_id', tenantIds);

      if (empError) {
        console.error('getEmployeeRoleCounts error (テナント一覧は表示を続行):', empError);
      } else if (empRows && empRows.length > 0) {
        for (const row of empRows) {
          const tid = String((row as { tenant_id?: string }).tenant_id ?? '');
          const bucket = countMap.get(tid);
          if (!bucket) continue;

          const ar = (row as { app_role?: { app_role?: string } | { app_role?: string }[] }).app_role;
          const slug = Array.isArray(ar) ? ar[0]?.app_role : ar?.app_role;

          if (slug === 'company_doctor') {
            bucket.company_doctor_count += 1;
          } else {
            bucket.registered_user_count += 1;
          }
        }
      }
    } catch (empErr) {
      console.error('従業員ロール集計で予期せぬエラー (テナント一覧は表示を続行):', empErr);
    }

    // ===== Step 4: テナントデータを整形して返す =====
    return tenants.map((t) => {
      const id = String(t.id ?? '');
      const counts = countMap.get(id) ?? { registered_user_count: 0, company_doctor_count: 0 };
      return {
        id,
        name: String(t.name ?? ''),
        contact_date: t.contact_date ? String(t.contact_date) : null,
        paid_amount: typeof t.paid_amount === 'number' ? t.paid_amount : null,
        employee_count: typeof t.employee_count === 'number' ? t.employee_count : null,
        max_employees: typeof t.max_employees === 'number' ? t.max_employees : null,
        paied_date: t.paied_date ? String(t.paied_date) : null,
        plan_type: t.plan_type ? String(t.plan_type) : null,
        contract_end_at:
          t.contract_end_at != null && t.contract_end_at !== ''
            ? String(t.contract_end_at)
            : null,
        created_at: String(t.created_at ?? ''),
        manager_name: managerMap.get(id)?.name || null,
        manager_email: managerMap.get(id)?.email || null,
        manager_user_id: managerMap.get(id)?.user_id || null,
        registered_user_count: counts.registered_user_count,
        company_doctor_count: counts.company_doctor_count,
      };
    });
  } catch (err) {
    console.error('getAllTenants 予期せぬエラー:', err);
    return [];
  }
}
