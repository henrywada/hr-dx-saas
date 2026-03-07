'use server';

// createServerClient を createClient に変更
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AuthSession } from '@/types/auth';

/**
 * ログイン処理（Server Action）
 */
export async function signInAction(email: string, password: string) {
  // ここも createClient() に変更
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.session) {
    const session: AuthSession = {
      user: {
        id: data.user.id,
        email: data.user.email,
        tenant_id: data.user.user_metadata?.tenant_id,
      },
    };


    // リダイレクト先の判定
    let redirectPath = '/login';
    let employeeId = null; // 社員ID (not Auth ID)
    let tenantId = session.user.tenant_id; // Authメタデータから初期値

    // 従業員情報を取得 (Auth user_id -> employees.id & tenant_id)
    try {
      const { data: employee } = await supabase
        .from('employees')
        .select('id, tenant_id')
        .eq('user_id', session.user.id)
        .single();
      
      if (employee) {
        employeeId = employee.id;
        // employeesテーブルのtenant_idを優先使用
        if (employee.tenant_id) {
          tenantId = employee.tenant_id;
        }
      }
    } catch (err) {
      console.error('Failed to fetch employee/tenant for logging:', err);
    }

    if (session.user.id === 'e97488f9-02be-4b0b-9dc9-ddb0c2902999') {
      // システム管理者（SupaUser）
      redirectPath = '/system-master';
    } else if (tenantId) {
      // テナントユーザー (employeeから取得したtenantIdを使用)
      redirectPath = `/${tenantId}/top`;
    }

    // ログ記録
    try {
      if (tenantId) {
        // import logActivity from '@/lib/logger'; // ※ファイル上部に追加が必要
        const { logActivity } = await import('@/lib/logger');
        await logActivity({
          tenantId: tenantId,
          employeeId: employeeId,
          action: 'LOGIN',
          entityType: 'AUTH',
          description: `User ${session.user.email} logged in.`,
        });
      } else {
        console.warn('Skipping login log: No tenantId found for user', session.user.email);
      }
    } catch (logErr) {
      console.error('Failed to write login log:', logErr);
    }

    redirect(redirectPath);
  }

  return { success: true };
}