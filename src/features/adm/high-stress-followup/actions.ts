'use server';

import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import {
  getInterviewRecordsByResultId,
  getScheduledInterviews,
  getAllInterviewRecords,
  getAvailableSlotsForDate,
  getDoctorAvailabilitySlots,
  getActuallyAvailableSlotsForDate,
  getTenantDoctors,
  getLatestStressResult,
  getLatestActivePeriod,
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
  doctor_id?: string | null;
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

  const supabase = await createClient();
  const targetDoctorId = payload.doctor_id || user.employee_id;

  if (payload.status === 'completed' && (!payload.doctorOpinion || payload.doctorOpinion.trim() === '')) {
    throw new Error('実施済の場合は医師意見が必須です');
  }

  // 予約・スケジュールの場合は稼働スロット内かチェック
  if (payload.status === 'scheduled') {
    const interviewDate = new Date(payload.interviewDate);
    // タイムゾーンを考慮したJST文字変換 (Asia/Tokyo)
    const dateStr = format(interviewDate, 'yyyy-MM-dd');
    const timeStr = format(interviewDate, 'HH:mm');

    const availableSlots = await getActuallyAvailableSlotsForDate(targetDoctorId, dateStr);
    const slot = availableSlots.find((s) => {
      const start = s.startTime.slice(0, 5);
      const end = s.endTime.slice(0, 5);
      return timeStr >= start && timeStr < end;
    });

    if (!slot) {
      throw new Error(
        `指定の日時（${dateStr} ${timeStr}）は産業医の稼働時間外です。`
      );
    }
    if (slot.isBooked) {
      throw new Error(
        `指定の日時枠（${slot.startTime.slice(0, 5)}〜）は既に予約が入っています。`
      );
    }
  }

  const { error } = await supabase.from('stress_interview_records').insert({
    tenant_id: user.tenant_id,
    stress_result_id: payload.stressResultId,
    doctor_id: targetDoctorId,
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
  options?: { doctorId?: string; interviewNotes?: string }
) {
  const user = await getServerUser();
  const doctorId = options?.doctorId || user?.employee_id;

  if (!doctorId) {
    throw new Error('産業医が指定されていないか、ログインユーザーの情報が見つかりません');
  }

  return createInterviewRecord({
    stressResultId,
    intervieweeId,
    interviewDate,
    doctor_id: doctorId,
    interviewNotes: options?.interviewNotes ?? null,
    status: 'scheduled',
  });
}


/**
 * テナント内の医師一覧を取得
 */
export async function fetchTenantDoctors() {
  const user = await getServerUser();
  if (!user?.tenant_id) return [];
  return getTenantDoctors(user.tenant_id);
}

/**
 * 最新のストレスチェック結果IDを取得
 */
export async function fetchMyLatestStressResultId() {
  const user = await getServerUser();
  if (!user?.employee_id) return null;
  const res = await getLatestStressResult(user.employee_id);
  return res?.id ?? null;
}

/**
 * 最新の実施期間IDを取得
 */
export async function fetchLatestActivePeriod() {
  const user = await getServerUser();
  if (!user?.tenant_id) return null;
  return getLatestActivePeriod(user.tenant_id);
}

/**
 * 稼働スロットを登録・更新
 */
export async function upsertAvailabilitySlot(payload: {
  id?: string;
  dayOfWeek: number | null;
  specificDate: string | null;
  startTime: string;
  endTime: string;
  isActive: boolean;
}) {
  const user = await getServerUser();
  if (!user?.tenant_id || !user?.employee_id) {
    throw new Error('Unauthorized');
  }

  const supabase = await createClient();

  const data = {
    tenant_id: user.tenant_id,
    doctor_id: user.employee_id,
    day_of_week: payload.dayOfWeek,
    specific_date: payload.specificDate,
    start_time: payload.startTime,
    end_time: payload.endTime,
    is_active: payload.isActive,
  };

  if (payload.id) {
    const { error } = await supabase
      .from('doctor_availability_slots')
      .update(data)
      .eq('id', payload.id);
    if (error) throw new Error('スロットの更新に失敗しました: ' + error.message);
  } else {
    const { error } = await supabase.from('doctor_availability_slots').insert(data);
    if (error) throw new Error('スロットの登録に失敗しました: ' + error.message);
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_HIGH_STRESS_FOLLOWUP);
}

/**
 * 稼働スロットを削除
 */
export async function deleteAvailabilitySlot(id: string) {
  const user = await getServerUser();
  if (!user?.tenant_id) throw new Error('Unauthorized');

  const supabase = await createClient();
  const { error } = await supabase.from('doctor_availability_slots').delete().eq('id', id);

  if (error) throw new Error('スロットの削除に失敗しました');

  revalidatePath(APP_ROUTES.TENANT.ADMIN_HIGH_STRESS_FOLLOWUP);
}

/**
 * 産業医の稼働スロット一覧を取得
 */
export async function fetchDoctorAvailabilitySlots(doctorId?: string) {
  const user = await getServerUser();
  const targetId = doctorId || user?.employee_id;
  if (!targetId) return [];
  return getDoctorAvailabilitySlots(targetId);
}

/**
 * 自身の稼働スロット一覧を取得 (旧互換用)
 */
export async function fetchMyAvailabilitySlots() {
  return fetchDoctorAvailabilitySlots();
}

/**
 * 指定日の空きスロット（予約状況込み）を取得
 */
export async function fetchActuallyAvailableSlotsForDate(
  date: string,
  doctorId?: string
) {
  const user = await getServerUser();
  const targetId = doctorId || user?.employee_id;
  if (!targetId) return [];
  return getActuallyAvailableSlotsForDate(targetId, date);
}
