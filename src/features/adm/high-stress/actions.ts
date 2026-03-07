'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getServerUser } from '@/lib/auth/server-user';

export async function updateInterviewRecord(
  periodId: string,
  employeeId: string,
  resultId: string,
  payload: {
    interview_status: string;
    interview_date?: string | null;
    doctor_opinion?: string | null;
    work_measures?: string | null;
    measure_details?: string | null;
  }
) {
  const supabase = await createClient();
  const user = await getServerUser();
  if (!user?.tenant_id) {
    throw new Error('Unauthorized');
  }

  // Check if interview record already exists
  const { data: existing, error: existErr } = await supabase
    .from('stress_check_interviews')
    .select('id')
    .eq('period_id', periodId)
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (existErr) {
    console.error('Check existing interview error:', existErr.message);
    throw new Error('Failed to find interview record');
  }

  // Supabase で current_employee_id() を使う場合は、DBコンテキスト上で employee_id が必要ですが、
  // ここはサーバーサイドの admin または proxy 経由かもしれないので、素直に update します
  // ※ RLS が適用されるので、もし権限がない場合は失敗します

  if (existing) {
    const { error: updErr } = await supabase
      .from('stress_check_interviews')
      .update({
        interview_status: payload.interview_status,
        interview_date: payload.interview_date || null,
        doctor_opinion: payload.doctor_opinion || null,
        work_measures: payload.work_measures || null,
        measure_details: payload.measure_details || null,
      })
      .eq('id', existing.id);

    if (updErr) {
      console.error('Update interview error:', updErr.message);
      throw new Error('更新に失敗しました');
    }
  } else {
    // Insert new record
    const { error: insErr } = await supabase
      .from('stress_check_interviews')
      .insert({
        tenant_id: user.tenant_id,
        period_id: periodId,
        employee_id: employeeId,
        result_id: resultId,
        interview_status: payload.interview_status,
        interview_date: payload.interview_date || null,
        doctor_opinion: payload.doctor_opinion || null,
        work_measures: payload.work_measures || null,
        measure_details: payload.measure_details || null,
        // doctor_employee_id: RLS 関数がある場合 set されるか、明示的に取得してセットするか
      });

    if (insErr) {
      console.error('Insert interview error:', insErr.message);
      throw new Error('登録に失敗しました');
    }
  }

  // 再検証して画面を自動更新
  revalidatePath('/adm/high-stress');
}
