import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import type { HighStressListItem, StressInterviewRecord, ScheduledInterviewItem, DoctorAvailabilitySlot } from './types';
import { generateAnonymousId, getAnonymousDivisionLabel } from './utils';

export interface ListFilters {
  /** 匿名部署ラベル（部署A, 部署B...）でフィルタ */
  divisionAnonymousLabel?: string;
  dateFrom?: string;
  dateTo?: string;
  uncompletedOnly?: boolean;
}

/**
 * 産業医・保健師用：匿名表示の高ストレス者一覧
 */
export async function getHighStressListForDoctor(
  periodId: string,
  filters?: ListFilters
): Promise<HighStressListItem[]> {
  const supabase = await createClient();

  const { data: results, error: resError } = await supabase
    .from('stress_check_results')
    .select(`
      id,
      employee_id,
      calculated_at,
      high_stress_reason,
      interview_requested,
      employees (
        division_id
      )
    `)
    .eq('period_id', periodId)
    .eq('is_high_stress', true);

  if (resError || !results) {
    console.error('getHighStressListForDoctor error:', resError?.message);
    return [];
  }

  const empIds = results.map((r) => r.employee_id);
  const { data: submissions } = await supabase
    .from('stress_check_submissions')
    .select('employee_id')
    .eq('period_id', periodId)
    .in('employee_id', empIds)
    .eq('consent_to_employer', true);

  const consentedSet = new Set((submissions ?? []).map((s) => s.employee_id));
  const consentedResults = results.filter((r) => consentedSet.has(r.employee_id));

  const resultIds = consentedResults.map((r) => r.id);
  const { data: records } = await supabase
    .from('stress_interview_records')
    .select('id, stress_result_id, status, measure_type')
    .in('stress_result_id', resultIds)
    .order('interview_date', { ascending: false });

  const recordsByResult = new Map<string, { status: string; measureType: string | null }[]>();
  for (const r of records ?? []) {
    const list = recordsByResult.get(r.stress_result_id) ?? [];
    list.push({ status: r.status, measureType: r.measure_type });
    recordsByResult.set(r.stress_result_id, list);
  }

  const divisionIds = [
    ...new Set(
      consentedResults
        .map((r) => (r.employees as { division_id?: string } | null)?.division_id)
        .filter(Boolean)
    ),
  ] as string[];
  const divisionIndexMap = new Map<string, number>();
  divisionIds.forEach((id, i) => divisionIndexMap.set(id, i));

  let items: HighStressListItem[] = consentedResults.map((r, index) => {
    const recs = recordsByResult.get(r.id) ?? [];
    const latest = recs[0];
    const hasMeasureDecided = recs.some(
      (x) => x.status === 'completed' && x.measureType != null && x.measureType !== ''
    );
    const emp = r.employees as { division_id?: string } | null;
    const divIndex = emp?.division_id ? divisionIndexMap.get(emp.division_id) ?? 0 : 0;

    return {
      stressResultId: r.id,
      employeeId: r.employee_id,
      anonymousId: generateAnonymousId(r.id, index),
      divisionAnonymousLabel: getAnonymousDivisionLabel(divIndex),
      calculatedAt: r.calculated_at ?? '',
      highStressReason: r.high_stress_reason ?? null,
      interviewRequested: r.interview_requested ?? false,
      latestStatus: (latest?.status as HighStressListItem['latestStatus']) ?? 'pending',
      hasMeasureDecided,
    };
  });

  if (filters?.divisionAnonymousLabel) {
    items = items.filter((i) => i.divisionAnonymousLabel === filters.divisionAnonymousLabel);
  }
  if (filters?.dateFrom) {
    items = items.filter((i) => i.calculatedAt >= filters.dateFrom!);
  }
  if (filters?.dateTo) {
    items = items.filter((i) => i.calculatedAt <= filters.dateTo!);
  }
  if (filters?.uncompletedOnly) {
    items = items.filter((i) => i.latestStatus !== 'completed' && !i.hasMeasureDecided);
  }

  return items;
}

/**
 * 個別詳細用：stressResultId で1件取得（匿名ID A-XXX でも検索可能）
 */
export async function getHighStressItemForDoctor(
  periodId: string,
  id: string
): Promise<HighStressListItem | null> {
  const items = await getHighStressListForDoctor(periodId);
  const byResultId = items.find((i) => i.stressResultId === id);
  if (byResultId) return byResultId;
  const byAnonymousId = items.find(
    (i) => i.anonymousId.toLowerCase() === id.toLowerCase()
  );
  return byAnonymousId ?? null;
}

/**
 * 対象者の面接・措置履歴を取得
 */
export async function getInterviewRecordsByResultId(
  stressResultId: string
): Promise<StressInterviewRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('stress_interview_records')
    .select('*')
    .eq('stress_result_id', stressResultId)
    .order('interview_date', { ascending: false });

  if (error) {
    console.error('getInterviewRecordsByResultId error:', error.message);
    return [];
  }

  const doctorIds = [...new Set((data ?? []).map((r) => r.doctor_id))];
  const { data: doctors } = await supabase
    .from('employees')
    .select('id, name')
    .in('id', doctorIds);
  const doctorMap = new Map((doctors ?? []).map((d) => [d.id, d.name]));

  return (data ?? []).map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    stressResultId: r.stress_result_id,
    doctorId: r.doctor_id,
    intervieweeId: r.interviewee_id,
    interviewDate: r.interview_date,
    interviewDuration: r.interview_duration,
    interviewNotes: r.interview_notes,
    doctorOpinion: r.doctor_opinion,
    measureType: r.measure_type,
    measureDetails: r.measure_details,
    followUpDate: r.follow_up_date,
    followUpStatus: r.follow_up_status,
    status: r.status as StressInterviewRecord['status'],
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    doctorName: doctorMap.get(r.doctor_id),
  }));
}

/**
 * カレンダー用：指定月の予約・実施一覧
 */
export async function getScheduledInterviews(
  periodId: string,
  yearMonth: string
): Promise<ScheduledInterviewItem[]> {
  const supabase = await createClient();
  const [y, m] = yearMonth.split('-').map(Number);
  const start = new Date(y, m - 1, 1).toISOString();
  const end = new Date(y, m, 0, 23, 59, 59).toISOString();

  const { data: results } = await supabase
    .from('stress_check_results')
    .select('id, employee_id')
    .eq('period_id', periodId)
    .eq('is_high_stress', true);

  if (!results || results.length === 0) return [];

  const resultIds = results.map((r) => r.id);
  const { data: records } = await supabase
    .from('stress_interview_records')
    .select('id, stress_result_id, interviewee_id, interview_date, status, doctor_id')
    .in('stress_result_id', resultIds)
    .gte('interview_date', start)
    .lte('interview_date', end)
    .order('interview_date', { ascending: true });

  const doctorIds = [...new Set((records ?? []).map((r) => r.doctor_id))];
  const { data: doctors } = await supabase
    .from('employees')
    .select('id, name')
    .in('id', doctorIds);
  const doctorMap = new Map((doctors ?? []).map((d) => [d.id, d.name]));

  const resultIndexMap = new Map<string, number>();
  results.forEach((r, i) => resultIndexMap.set(r.id, i));

  return (records ?? []).map((r) => {
    const idx = resultIndexMap.get(r.stress_result_id) ?? 0;
    return {
      id: r.id,
      stressResultId: r.stress_result_id,
      intervieweeId: r.interviewee_id,
      anonymousId: generateAnonymousId(r.stress_result_id, idx),
      interviewDate: r.interview_date,
      doctorName: doctorMap.get(r.doctor_id) ?? '産業医',
      status: r.status,
    };
  });
}

/**
 * 実施・措置履歴タブ用：全記録一覧
 */
export async function getAllInterviewRecords(
  periodId: string
): Promise<(StressInterviewRecord & { anonymousId: string })[]> {
  const supabase = await createClient();

  const { data: results } = await supabase
    .from('stress_check_results')
    .select('id')
    .eq('period_id', periodId)
    .eq('is_high_stress', true);

  if (!results || results.length === 0) return [];

  const resultIds = results.map((r) => r.id);
  const resultIndexMap = new Map<string, number>();
  results.forEach((r, i) => resultIndexMap.set(r.id, i));

  const { data: records, error } = await supabase
    .from('stress_interview_records')
    .select('*')
    .in('stress_result_id', resultIds)
    .order('interview_date', { ascending: false });

  if (error) {
    console.error('getAllInterviewRecords error:', error.message);
    return [];
  }

  const doctorIds = [...new Set((records ?? []).map((r) => r.doctor_id))];
  const { data: doctors } = await supabase
    .from('employees')
    .select('id, name')
    .in('id', doctorIds);
  const doctorMap = new Map((doctors ?? []).map((d) => [d.id, d.name]));

  return (records ?? []).map((r) => {
    const idx = resultIndexMap.get(r.stress_result_id) ?? 0;
    return {
      id: r.id,
      tenantId: r.tenant_id,
      stressResultId: r.stress_result_id,
      doctorId: r.doctor_id,
      intervieweeId: r.interviewee_id,
      interviewDate: r.interview_date,
      interviewDuration: r.interview_duration,
      interviewNotes: r.interview_notes,
      doctorOpinion: r.doctor_opinion,
      measureType: r.measure_type,
      measureDetails: r.measure_details,
      followUpDate: r.follow_up_date,
      followUpStatus: r.follow_up_status,
      status: r.status as StressInterviewRecord['status'],
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      doctorName: doctorMap.get(r.doctor_id),
      anonymousId: generateAnonymousId(r.stress_result_id, idx),
    };
  });
}

/**
 * 指定日の予約済み時間を取得
 */
export async function getOccupiedTimesForDoctor(
  doctorId: string,
  date: string
): Promise<string[]> {
  const supabase = await createClient();
  const start = `${date}T00:00:00Z`;
  const end = `${date}T23:59:59Z`;

  const { data, error } = await supabase
    .from('stress_interview_records')
    .select('interview_date')
    .eq('doctor_id', doctorId)
    .gte('interview_date', start)
    .lte('interview_date', end)
    .neq('status', 'cancelled');

  if (error) {
    console.error('getOccupiedTimesForDoctor error:', error.message);
    return [];
  }

  // JSTでの09:00形式の文字列リストを返す
  return (data ?? []).map((r) => format(new Date(r.interview_date), 'HH:mm'));
}

/**
 * 産業医の予約可能日時スロットを全件取得
 */
export async function getDoctorAvailabilitySlots(
  doctorId: string
): Promise<DoctorAvailabilitySlot[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('doctor_availability_slots')
    .select('*')
    .eq('doctor_id', doctorId);

  if (error) {
    console.error('getDoctorAvailabilitySlots error:', error.message);
    return [];
  }

  return (data ?? []).map((s) => ({
    id: s.id,
    tenantId: s.tenant_id,
    doctorId: s.doctor_id,
    dayOfWeek: s.day_of_week,
    specificDate: s.specific_date,
    startTime: s.start_time,
    endTime: s.end_time,
    isActive: s.is_active,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));
}

/**
 * 特定の日付において有効な予約可能スロットを取得
 * (特定日設定がある場合はそれを優先し、なければ曜日設定を返す)
 */
export async function getAvailableSlotsForDate(
  doctorId: string,
  date: string // 'YYYY-MM-DD'
): Promise<{ startTime: string; endTime: string; id: string }[]> {
  const slots = await getDoctorAvailabilitySlots(doctorId);
  const activeSlots = slots.filter((s) => s.isActive);

  // 1. 特定日の設定があるか確認
  const specificSlots = activeSlots.filter((s) => s.specificDate === date);
  if (specificSlots.length > 0) {
    return specificSlots.map((s) => ({
      startTime: s.startTime,
      endTime: s.endTime,
      id: s.id,
    }));
  }

  // 2. 曜日設定を確認
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const weeklySlots = activeSlots.filter(
    (s) => s.dayOfWeek === dayOfWeek && s.specificDate === null
  );

  return weeklySlots.map((s) => ({
    startTime: s.startTime,
    endTime: s.endTime,
    id: s.id,
  }));
}

/**
 * スロット情報と予約状況を組み合わせて、本当に空いているスロットを返す
 */
export async function getActuallyAvailableSlotsForDate(
  doctorId: string,
  date: string
): Promise<{ startTime: string; endTime: string; id: string; isBooked: boolean }[]> {
  const [slots, occupiedTimes] = await Promise.all([
    getAvailableSlotsForDate(doctorId, date),
    getOccupiedTimesForDoctor(doctorId, date),
  ]);

  return slots.map((s) => {
    const start = s.startTime.slice(0, 5);
    // スロットの開始位置、またはスロット時間内に予約があるかチェック
    // 1スロット1予約の制約に従い、開始時刻が一致する予約があればBookedとする
    const isBooked = occupiedTimes.includes(start);
    return {
      ...s,
      isBooked,
    };
  });
}

/**
 * テナント内の医師一覧を取得
 */
export async function getTenantDoctors(tenantId: string): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  
  // ロール情報を取得するために結合する
  // app_role_id を介した結合を明示的に指定
  const { data, error } = await supabase
    .from('employees')
    .select(`
      id,
      name,
      active_status,
      app_role:app_role_id (
        app_role
      )
    `)
    .eq('tenant_id', tenantId);

  if (error || !data) {
    console.error('getTenantDoctors error:', error?.message);
    return [];
  }

  // フィルタリング (会社医師のみ)
  return (data as any[])
    .filter((emp) => {
      const ar = emp.app_role;
      const roleSlug = Array.isArray(ar) ? ar[0]?.app_role : ar?.app_role;
      return roleSlug === 'company_doctor';
    })
    .map((emp) => ({
      id: emp.id,
      name: emp.name || '名前なし',
    }));
}




/**
 * 特定の従業員の最新ストレスチェック結果を取得
 */
export async function getLatestStressResult(employeeId: string): Promise<{ id: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('stress_check_results')
    .select('id')
    .eq('employee_id', employeeId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('getLatestStressResult error:', error.message);
    return null;
  }
  return data;
}

/**
 * テナントの最新ストレスチェック実施期間IDを取得
 */
export async function getLatestActivePeriod(tenantId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('stress_check_periods')
    .select('id')
    .eq('tenant_id', tenantId)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.error('getLatestActivePeriod error:', error?.message);
    return null;
  }
  return data.id;
}
