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
    const managerMap = new Map<string, { name: string; email: string | null }>();

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
        // 責任者の user_id からメールアドレスを取得
        let emailMap: Record<string, string> = {};
        try {
          const { data: usersData } = await supabase.auth.admin.listUsers();
          if (usersData?.users) {
            emailMap = {};
            for (const u of usersData.users) {
              if (u.email) {
                emailMap[u.id] = u.email;
              }
            }
          }
        } catch (authErr) {
          console.error('auth.admin.listUsers error:', authErr);
        }

        for (const mgr of managers) {
          const email = mgr.user_id ? (emailMap[mgr.user_id] || null) : null;
          managerMap.set(mgr.tenant_id, { name: mgr.name, email });
        }
      }
    } catch (mgrErr) {
      console.error('責任者情報取得で予期せぬエラー (テナント一覧は表示を続行):', mgrErr);
    }

    // ===== Step 3: テナントデータを整形して返す =====
    return tenants.map((t) => ({
      id: String(t.id ?? ''),
      name: String(t.name ?? ''),
      contact_date: t.contact_date ? String(t.contact_date) : null,
      paid_amount: typeof t.paid_amount === 'number' ? t.paid_amount : null,
      employee_count: typeof t.employee_count === 'number' ? t.employee_count : null,
      paied_date: t.paied_date ? String(t.paied_date) : null,
      plan_type: t.plan_type ? String(t.plan_type) : null,
      created_at: String(t.created_at ?? ''),
      manager_name: managerMap.get(String(t.id))?.name || null,
      manager_email: managerMap.get(String(t.id))?.email || null,
    }));
  } catch (err) {
    console.error('getAllTenants 予期せぬエラー:', err);
    return [];
  }
}
