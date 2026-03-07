import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { CandidatePulse } from './types'

// 候補者画面用：ログイン不要・RLS徐外のため Admin Client を使用
export const getPulseByToken = async (id: string): Promise<CandidatePulse | null> => {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('candidate_pulses')
    .select('*, pulse_templates(*)')
    .eq('id', id)
    .single()

  if (error) {
    console.error('getPulseByToken error:', JSON.stringify(error, null, 2))
    return null
  }
  return data as unknown as CandidatePulse
}

// 人事ダッシュボード用：通常の認証済み Client を使用 (RLSで自テナントのみ取得)
export const getTenantPulses = async (): Promise<CandidatePulse[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('candidate_pulses')
    .select('*, pulse_templates(*)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getTenantPulses error:', JSON.stringify(error, null, 2))
    return []
  }
  return data as unknown as CandidatePulse[]
}
