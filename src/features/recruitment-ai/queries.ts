/**
 * TalentDraft AI — データ取得クエリ
 */

import { createClient } from '@/lib/supabase/server';
import type { RecruitmentJob } from './types';

/**
 * テナント内の求人一覧を取得
 */
export async function getRecruitmentJobs(): Promise<RecruitmentJob[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('recruitment_jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[TalentDraft AI] getRecruitmentJobs error:', error);
    return [];
  }

  return (data as RecruitmentJob[]) ?? [];
}

/**
 * 単一の求人を取得
 */
export async function getRecruitmentJob(id: string): Promise<RecruitmentJob | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('recruitment_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[TalentDraft AI] getRecruitmentJob error:', error);
    return null;
  }

  return data as RecruitmentJob;
}
