import { createClient } from '@/lib/supabase/server';
import { getActivePeriod } from '../stress-check/queries'; // Re-use

export interface HighStressEmployee {
  result_id: string;
  employee_id: string;
  name: string;
  employee_no: string | null;
  division_name: string | null;
  score_a: number | null;
  score_b: number | null;
  score_c: number | null;
  score_d: number | null;
  scale_scores: any;
  interview_requested: boolean;
  interview_requested_at: string | null;
  interview_record: {
    id: string;
    interview_status: string;
    doctor_opinion: string | null;
    work_measures: string | null;
    measure_details: string | null;
    interview_date: string | null;
  } | null;
}

/**
 * 実施中の期間に該当する、高ストレス者でかつ企業に同意したユーザー一覧を取得
 */
export async function getHighStressEmployees(periodId: string): Promise<HighStressEmployee[]> {
  const supabase = await createClient();

  // 1. 高ストレス者を結果テーブルから取得 (RLSにより見えないものは自動で落ちる想定だが、念の為抽出)
  const { data: results, error: resError } = await supabase
    .from('stress_check_results')
    .select(`
      id,
      is_high_stress,
      interview_requested,
      interview_requested_at,
      score_a, score_b, score_c, score_d,
      scale_scores,
      employee_id,
      employees (
        id, name, employee_no,
        divisions (name)
      ),
      stress_check_interviews (
        id, interview_status, doctor_opinion, work_measures, measure_details, interview_date
      )
    `)
    .eq('period_id', periodId)
    .eq('is_high_stress', true);

  if (resError || !results) {
    console.error('getHighStressEmployees error:', resError?.message);
    return [];
  }

  if (results.length === 0) return [];

  // 2. 該当社員の同意状況を取得し、同意済み(consent_to_employer=true)の人だけに絞る
  const empIds = results.map(r => r.employee_id);
  const { data: submissions, error: subError } = await supabase
    .from('stress_check_submissions')
    .select('employee_id, consent_to_employer')
    .eq('period_id', periodId)
    .in('employee_id', empIds)
    .eq('consent_to_employer', true);

  if (subError || !submissions) {
    console.error('getHighStressEmployees submissions fetch error:', subError?.message);
    return [];
  }

  const consentedEmpIds = new Set(submissions.map(s => s.employee_id));

  // 3. マッピングして返す
  return results
    .filter(r => consentedEmpIds.has(r.employee_id))
    .map(r => {
      // @ts-ignore
      const emp = r.employees;
      // @ts-ignore
      const div = emp?.divisions;
      // @ts-ignore
      const interviewList = r.stress_check_interviews || [];
      const interview = interviewList.length > 0 ? interviewList[0] : null;

      return {
        result_id: r.id,
        employee_id: r.employee_id,
        name: emp?.name || '不明',
        employee_no: emp?.employee_no || null,
        division_name: div?.name || null,
        score_a: r.score_a,
        score_b: r.score_b,
        score_c: r.score_c,
        score_d: r.score_d,
        scale_scores: r.scale_scores,
        interview_requested: r.interview_requested,
        interview_requested_at: r.interview_requested_at,
        interview_record: interview ? {
          id: interview.id,
          interview_status: interview.interview_status,
          doctor_opinion: interview.doctor_opinion,
          work_measures: interview.work_measures,
          measure_details: interview.measure_details,
          interview_date: interview.interview_date,
        } : null
      };
    });
}
