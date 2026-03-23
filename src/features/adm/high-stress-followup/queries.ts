import { createClient } from '@/lib/supabase/server';
import type { HighStressListItem, StressInterviewRecord, ScheduledInterviewItem } from './types';
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
