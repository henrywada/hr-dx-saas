import { createClient } from '@/lib/supabase/server'

export type RagDocumentListItem = {
  id: string
  title: string
  source_kind: string
  status: string
  created_at: string
  original_filename: string | null
  source_url: string | null
}

/** 同一テナントの文書一覧（RLS）。管理画面用 */
export async function listRagDocuments(): Promise<RagDocumentListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_rag_documents')
    .select('id, title, source_kind, status, created_at, original_filename, source_url')
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
