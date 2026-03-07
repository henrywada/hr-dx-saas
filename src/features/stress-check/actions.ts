'use server';

import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth/server-user';

interface AnswerInput {
  question_id: string;
  answer: number;
}

interface SubmitResult {
  success: boolean;
  error?: string;
}

/**
 * ストレスチェックの全回答を一括保存する Server Action
 */
export async function submitStressCheckAnswers(
  periodId: string,
  answers: AnswerInput[]
): Promise<SubmitResult> {
  try {
    // 1. 認証チェック
    const user = await getServerUser();
    if (!user || !user.tenant_id) {
      return { success: false, error: '認証エラー：ログインしてください。' };
    }

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // 2. employees テーブルから employee_id を取得
    //    getServerUser().id は auth.users の UUID であり、
    //    stress_check_responses.employee_id は employees.id を参照するため
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (empError || !employee) {
      console.error('Employee not found:', empError?.message);
      return { success: false, error: '従業員情報が見つかりません。管理者にお問い合わせください。' };
    }

    const employeeId = employee.id;

    // 3. 回答済みチェック（submissions テーブル）
    const { count: existingCount } = await db
      .from('stress_check_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('period_id', periodId)
      .eq('employee_id', employeeId);

    if ((existingCount ?? 0) > 0) {
      return { success: false, error: 'すでにこの期間のストレスチェックに回答済みです。' };
    }

    // 4. 回答データを構築
    const now = new Date().toISOString();
    const responseRows = answers.map((a) => ({
      tenant_id: user.tenant_id,
      period_id: periodId,
      employee_id: employeeId,
      question_id: a.question_id,
      answer: a.answer,
      answered_at: now,
    }));

    // 5. 一括INSERT (responses)
    const { error: insertError } = await db
      .from('stress_check_responses')
      .insert(responseRows);

    if (insertError) {
      console.error('submitStressCheckAnswers insert error:', insertError);
      return { success: false, error: '回答の保存に失敗しました。もう一度お試しください。' };
    }

    // 6. 提出記録を保存 (submissions)
    const { error: subError } = await db
      .from('stress_check_submissions')
      .upsert({
        tenant_id: user.tenant_id,
        period_id: periodId,
        employee_id: employeeId,
        status: 'submitted',
        submitted_at: now,
        consent_to_employer: true,
      }, { onConflict: 'period_id, employee_id' }); // 重複防止

    if (subError) {
      console.error('submitStressCheckAnswers submission error:', subError);
      throw new Error('提出記録の保存に失敗しました');
    }

    return { success: true };
  } catch (err) {
    console.error('submitStressCheckAnswers unexpected error:', err);
    return { success: false, error: '予期しないエラーが発生しました。' };
  }
}

/**
 * 事業者への結果提供同意を更新する Server Action
 */
export async function updateConsentStatus(
  periodId: string,
  consent: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const supabase = await createClient();
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!employee) return { success: false, error: 'Employee not found' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('stress_check_submissions')
    .update({ consent_to_employer: consent })
    .eq('period_id', periodId)
    .eq('employee_id', employee.id);

  if (error) {
    console.error('Update consent error:', error);
    return { success: false, error: '更新に失敗しました' };
  }

  return { success: true };
}
