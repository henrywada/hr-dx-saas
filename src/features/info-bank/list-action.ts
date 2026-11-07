'use server'

import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'

/** 質問画面の「登録資料リスト」に出す 1 行 */
export interface PublishedDocumentRow {
  id: string
  title: string
  category: string
  tags: string[]
  filename: string | null
  updatedAt: string
}

export type ListPublishedResult =
  | { ok: true; documents: PublishedDocumentRow[] }
  | { ok: false; error: string }

/**
 * 質問の対象になっている（公開済みの）資料の一覧を返す。
 * 呼び出しユーザーの RLS で自テナントに限定する。管理者は取り込み中も見えるため、
 * 従業員画面と同じ見え方になるよう published_at を明示的に絞る。
 */
export async function listPublishedDocumentsAction(): Promise<ListPublishedResult> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { ok: false, error: 'ログイン情報が無効です' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('info_bank_documents')
    .select('id, title, category, tags, original_filename, updated_at')
    .eq('tenant_id', user.tenant_id)
    .not('published_at', 'is', null)
    .order('category', { ascending: true })
    .order('title', { ascending: true })
  if (error) {
    console.error('[info-bank] listPublishedDocumentsAction', error)
    return { ok: false, error: '資料一覧の取得に失敗しました' }
  }
  return {
    ok: true,
    documents: data.map(d => ({
      id: d.id,
      title: d.title,
      category: d.category,
      tags: d.tags ?? [],
      filename: d.original_filename,
      updatedAt: d.updated_at,
    })),
  }
}
