import { createClient } from '@/lib/supabase/server'
import { JobPosting } from './types'

// 人事向け。自テナントのすべての求人を取得。
export async function getTenantJobPostings(): Promise<JobPosting[]> {
  const supabase = await createClient()

  // RLS により、自動的に自テナントの求人のみが取得される
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getTenantJobPostings error:', error)
    throw new Error('求人票の取得に失敗しました。')
  }

  return data as JobPosting[]
}

// 人事向け。自テナントの特定の求人を取得。
export async function getTenantJobPostingById(id: string): Promise<JobPosting | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('getTenantJobPostingById error:', error)
    throw new Error('求人票の取得に失敗しました。')
  }

  return data as JobPosting
}

// 外部公開用。公開状態（status='published'）の特定の求人を取得。
export async function getPublishedJob(id: string): Promise<JobPosting | null> {
  const supabase = await createClient()
  
  // 一般クライアントでも status='published' なら RLS の job_postings_public_select によって取得可能。
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('id', id)
    .eq('status', 'published')
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // 見つからない場合
    console.error('getPublishedJob error:', error)
    throw new Error('求人の取得に失敗しました。')
  }

  return data as JobPosting
}
