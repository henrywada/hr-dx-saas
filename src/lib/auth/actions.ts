'use server';

// createServerClient を createClient に変更
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AuthSession } from '@/types/auth';
import { getRedirectPath } from './helpers';
import { writeAuditLog } from '@/lib/log/actions';

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
        name: data.user.user_metadata?.name || '',
        role: data.user.user_metadata?.role || 'member',
        tenant_id: data.user.user_metadata?.tenant_id,
      },
    };

    // アクセスログにログイン成功を記録
    await writeAuditLog({
      action: 'LOGIN_SUCCESS',
      path: '/login',
    });

    // リダイレクト先の判定
    const redirectPath = getRedirectPath(session);
    redirect(redirectPath);
  }

  return { success: true };
}