import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type {
  HrAssistantSession,
  HrAssistantMessage,
  QuestionTemplate,
  HrUpdateDocument,
} from './types'

/** テナント管理者のセッション一覧（新しい順 20 件） */
export async function listHrAssistantSessions(): Promise<HrAssistantSession[]> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_hr_assistant_sessions')
    .select('id, title, mode, created_at, updated_at')
    .eq('tenant_id', user.tenant_id)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[hr-assistant] listSessions', error)
    return []
  }
  return (data ?? []) as HrAssistantSession[]
}

/** セッションのメッセージ一覧（昇順） */
export async function listHrAssistantMessages(sessionId: string): Promise<HrAssistantMessage[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_hr_assistant_messages')
    .select('id, role, content, mode, cited_chunk_ids, metadata, created_at')
    .eq('session_id', sessionId)
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[hr-assistant] listMessages', error)
    return []
  }
  return (data ?? []) as HrAssistantMessage[]
}

/** 質問テンプレート一覧（共通 seed + 自テナント mined。スコープは RLS が担保） */
export async function listQuestionTemplates(): Promise<QuestionTemplate[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_hr_assistant_templates')
    .select('id, tenant_id, mode, question_text, source, usage_count, status, created_at')
    .eq('status', 'active')
    .order('usage_count', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[hr-assistant] listQuestionTemplates', error)
    return []
  }
  return (data ?? []) as QuestionTemplate[]
}

/** 人事アップデート一覧（全テナント共有・published/expired） */
export async function listHrUpdateDocuments(): Promise<HrUpdateDocument[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hr_law_documents')
    .select(
      'id, title, summary, detail, source_url, theme, published_at, fetched_at, expires_at, status'
    )
    .in('status', ['published', 'expired'])
    .order('fetched_at', { ascending: false })
    .limit(300)

  if (error) {
    console.error('[hr-assistant] listHrUpdateDocuments', error)
    return []
  }
  return (data ?? []) as HrUpdateDocument[]
}

/** 直近1ヶ月のニュース用 */
export async function listRecentHrUpdates(): Promise<HrUpdateDocument[]> {
  const all = await listHrUpdateDocuments()
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  return all.filter(d => new Date(d.fetched_at).getTime() >= cutoff)
}
