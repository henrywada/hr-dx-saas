'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export async function verifyToken(email: string, token: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('verify_recovery_token', {
    p_email: email,
    p_token: token,
    p_expiry_hours: 336, // 2週間（テナント管理は1週間だが、従業員管理は2週間なので大きい方に合わせる）
  });
  if (error) {
    console.error('トークン検証エラー:', error);
    return { valid: false, error: error.message, userId: null };
  }
  return { valid: true, error: null, userId: data };
}

export async function resetPassword(userId: string, newPassword: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc('update_user_password', {
    p_user_id: userId,
    p_new_password: newPassword,
  });
  if (error) {
    console.error('パスワード更新エラー:', error);
    return { success: false, error: error.message };
  }
  return { success: true, error: null };
}
