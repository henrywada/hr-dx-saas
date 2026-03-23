'use server';

import { createClient } from '@/lib/supabase/server';
import {
  getInterviewRecordsByResultId,
  getScheduledInterviews,
  getAllInterviewRecords,
} from './queries';
import { getServerUser } from '@/lib/auth/server-user';
import { revalidatePath } from 'next/cache';
import { writeAuditLog } from '@/lib/log/actions';
import { APP_ROUTES } from '@/config/routes';

export interface CreateInterviewRecordPayload {
  stressResultId: string;
  intervieweeId: string;
  interviewDate: string;
  interviewDuration?: number | null;
  interviewNotes?: string | null;
  doctorOpinion?: string | null;
  measureType?: string | null;
  measureDetails?: string | null;
  followUpDate?: string | null;
  followUpStatus?: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
}

export interface UpdateInterviewRecordPayload {
  interviewDate?: string;
  interviewDuration?: number | null;
  interviewNotes?: string | null;
  doctorOpinion?: string | null;
  measureType?: string | null;
  measureDetails?: string | null;
  followUpDate?: string | null;
  followUpStatus?: string;
  status?: 'pending' | 'scheduled' | 'completed' | 'cancelled';
}

/**
 * 面接記録を作成
 */
export async function createInterviewRecord(payload: CreateInterviewRecordPayload) {
  const user = await getServerUser();
  if (!user?.tenant_id || !user?.employee_id) {
    throw new Error('Unauthorized');
  }
  if (user.appRole !== 'company_doctor' && user.appRole !== 'company_nurse') {
    throw new Error('産業医・保健師のみ面接記録を作成できます');
  }

  const supabase = await createClient();

  if (payload.status === 'completed' && (!payload.doctorOpinion || payload.doctorOpinion.trim() === '')) {
    throw new Error('実施済の場合は医師意見が必須です');
  }

  const { error } = await supabase.from('stress_interview_records').insert({
    tenant_id: user.tenant_id,
    stress_result_id: payload.stressResultId,
    doctor_id: user.employee_id,
    interviewee_id: payload.intervieweeId,
    interview_date: payload.interviewDate,
    interview_duration: payload.interviewDuration ?? null,
    interview_notes: payload.interviewNotes ?? null,
    doctor_opinion: payload.doctorOpinion ?? null,
    measure_type: payload.measureType ?? null,
    measure_details: payload.measureDetails ?? null,
    follow_up_date: payload.followUpDate ?? null,
    follow_up_status: payload.followUpStatus ?? '未実施',
    status: payload.status,
    created_by: user.employee_id,
  });

  if (error) {
    console.error('createInterviewRecord error:', error.message);
    throw new Error('面接記録の登録に失敗しました');
  }

  await writeAuditLog({
    action: 'EDIT_RECORD',
    path: APP_ROUTES.TENANT.ADMIN_HIGH_STRESS_FOLLOWUP,
    details: { type: 'create_interview_record', stressResultId: payload.stressResultId },
  });

  revalidatePath(APP_ROUTES.TENANT.ADMIN_HIGH_STRESS_FOLLOWUP);
}

/**
 * 面接記録を更新
 */
export async function updateInterviewRecord(
  recordId: string,
  payload: UpdateInterviewRecordPayload
) {
  const user = await getServerUser();
  if (!user?.tenant_id || !user?.employee_id) {
    throw new Error('Unauthorized');
  }
  if (user.appRole !== 'company_doctor' && user.appRole !== 'company_nurse') {
    throw new Error('産業医・保健師のみ面接記録を更新できます');
  }

  const supabase = await createClient();

  if (payload.status === 'completed' && (!payload.doctorOpinion || payload.doctorOpinion.trim() === '')) {
    throw new Error('実施済の場合は医師意見が必須です');
  }

  const updateData: Record<string, unknown> = {};
  if (payload.interviewDate != null) updateData.interview_date = payload.interviewDate;
  if (payload.interviewDuration !== undefined) updateData.interview_duration = payload.interviewDuration;
  if (payload.interviewNotes !== undefined) updateData.interview_notes = payload.interviewNotes;
  if (payload.doctorOpinion !== undefined) updateData.doctor_opinion = payload.doctorOpinion;
  if (payload.measureType !== undefined) updateData.measure_type = payload.measureType;
  if (payload.measureDetails !== undefined) updateData.measure_details = payload.measureDetails;
  if (payload.followUpDate !== undefined) updateData.follow_up_date = payload.followUpDate;
  if (payload.followUpStatus !== undefined) updateData.follow_up_status = payload.followUpStatus;
  if (payload.status !== undefined) updateData.status = payload.status;

  const { error } = await supabase
    .from('stress_interview_records')
    .update(updateData)
    .eq('id', recordId);

  if (error) {
    console.error('updateInterviewRecord error:', error.message);
    throw new Error('面接記録の更新に失敗しました');
  }

  await writeAuditLog({
    action: 'EDIT_RECORD',
    path: APP_ROUTES.TENANT.ADMIN_HIGH_STRESS_FOLLOWUP,
    details: { type: 'update_interview_record', recordId },
  });

  revalidatePath(APP_ROUTES.TENANT.ADMIN_HIGH_STRESS_FOLLOWUP);
}

/**
 * 面接・措置履歴を取得（クライアントから呼び出し用）
 */
export async function fetchInterviewRecordsByResultId(stressResultId: string) {
  return getInterviewRecordsByResultId(stressResultId);
}

/**
 * カレンダー用：指定月の予約一覧を取得（クライアントから呼び出し用）
 */
export async function fetchScheduledInterviews(periodId: string, yearMonth: string) {
  return getScheduledInterviews(periodId, yearMonth);
}

/**
 * 実施・措置履歴タブ用：全記録一覧を取得（クライアントから呼び出し用）
 */
export async function fetchAllInterviewRecords(periodId: string) {
  return getAllInterviewRecords(periodId);
}

/**
 * 面接予約を登録（createInterviewRecord の status='scheduled' 版）
 */
export async function createInterviewAppointment(
  stressResultId: string,
  intervieweeId: string,
  interviewDate: string,
  options?: { interviewNotes?: string }
) {
  return createInterviewRecord({
    stressResultId,
    intervieweeId,
    interviewDate,
    interviewNotes: options?.interviewNotes ?? null,
    status: 'scheduled',
  });
}
