import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import { createAdminServiceClient } from '@/lib/supabase/adminClient'

export type RagDocumentListItem = {
  id: string
  title: string
  source_kind: string
  mime_type: string | null
  status: string
  created_at: string
  original_filename: string | null
  source_url: string | null
}

/** 同一テナントの文書一覧。service_role + tenant_id 絞り込み（管理画面・RLS ずれ対策） */
export async function listRagDocuments(): Promise<RagDocumentListItem[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []
  let supabase
  try {
    supabase = createAdminServiceClient()
  } catch (e) {
    console.error('[inquiry-chat] listRagDocuments admin client', e)
    return []
  }
  const { data, error } = await supabase
    .from('tenant_rag_documents')
    .select('id, title, source_kind, mime_type, status, created_at, original_filename, source_url')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[inquiry-chat] listRagDocuments', error)
    return []
  }
  return (data ?? []) as RagDocumentListItem[]
}

export type ChatMessageRow = {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export async function listSessionMessages(sessionId: string): Promise<ChatMessageRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_inquiry_chat_messages')
    .select('id, role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[inquiry-chat] listSessionMessages', error)
    return []
  }
  return (data ?? []) as ChatMessageRow[]
}
