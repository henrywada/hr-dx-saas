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
    let errorMessage = error.message;
    if (errorMessage === 'Invalid login credentials') {
      errorMessage = 'メールアドレスまたはパスワードが正しくありません。';
    }
    return { success: false, error: errorMessage };
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

/**
 * パスワードリセット要求処理（Server Action）
 */
export async function resetPasswordAction(email: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}