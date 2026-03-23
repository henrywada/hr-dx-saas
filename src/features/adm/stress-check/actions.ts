'use server';

import { getServerUser } from '@/lib/auth/server-user';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendMail } from '@/lib/mail/send';
import { getNotSubmittedEmployees, getNotSubmittedEmployeesForReminder } from './queries';
import type { NotSubmittedEmployee } from './types';

export async function fetchNotSubmittedEmployees(
  periodId: string
): Promise<{ success: true; data: NotSubmittedEmployee[] } | { success: false; error: string }> {
  const user = await getServerUser();
  if (!user?.tenant_id) {
    return { success: false, error: '認証エラー：ログインしてください。' };
  }

  try {
    const data = await getNotSubmittedEmployees(user.tenant_id, periodId);
    return { success: true, data };
  } catch (err) {
    console.error('fetchNotSubmittedEmployees error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : '未受検者の取得に失敗しました。',
    };
  }
}

export type SendReminderResult =
  | { success: true; sentCount: number; skippedCount: number }
  | { success: false; error: string };

/**
 * 未受検者へリマインドメールを一括送信
 * user_id が紐づきメールアドレスが取得できる従業員のみ送信
 */
export async function sendStressCheckReminders(
  periodId: string,
  subject: string,
  message: string
): Promise<SendReminderResult> {
  const user = await getServerUser();
  if (!user?.tenant_id) {
    return { success: false, error: '認証エラー：ログインしてください。' };
  }

  if (!subject.trim()) {
    return { success: false, error: '件名を入力してください。' };
  }
  if (!message.trim()) {
    return { success: false, error: 'メッセージを入力してください。' };
  }

  try {
    const employees = await getNotSubmittedEmployeesForReminder(user.tenant_id, periodId);
    const admin = createAdminClient();

    let sentCount = 0;
    let skippedCount = 0;

    for (const emp of employees) {
      if (!emp.user_id) {
        skippedCount++;
        continue;
      }

      const { data: email, error: emailError } = await admin.rpc('get_auth_user_email', {
        p_user_id: emp.user_id,
      });

      if (emailError || !email) {
        skippedCount++;
        continue;
      }

      try {
        await sendMail({
          to: email,
          subject: subject.trim(),
          text: message.trim().replace(/\{\{name\}\}/g, emp.name || ''),
        });
        sentCount++;
      } catch (mailErr) {
        console.error(`Reminder mail failed for ${emp.name} (${email}):`, mailErr);
        skippedCount++;
      }
    }

    return { success: true, sentCount, skippedCount };
  } catch (err) {
    console.error('sendStressCheckReminders error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'メール送信に失敗しました。',
    };
  }
}
