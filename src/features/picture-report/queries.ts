import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type { PictureSendSubject, PictureSendRow, AlbumItem, AlbumScope } from './types'

const SIGNED_URL_EXPIRES_IN_SECONDS = 3600
const PICTURE_SENDS_BUCKET = 'picture-sends'

async function attachSignedUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: PictureSendRow[]
): Promise<AlbumItem[]> {
  return Promise.all(
    rows.map(async row => {
      const { data: signed } = await supabase.storage
        .from(PICTURE_SENDS_BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_EXPIRES_IN_SECONDS)
      return {
        ...row,
        thumbnailUrl: signed?.signedUrl ?? null,
      }
    })
  )
}

/** ログイン中ユーザーがマネージャーとして「部下の投稿」を閲覧できるか */
export async function canViewTeamAlbum(): Promise<boolean> {
  const user = await getServerUser()
  return Boolean(user?.is_manager)
}

/** 自部門の件名マスタ一覧（RLSにより自部門のみ返る） */
export async function getPictureSendSubjects(): Promise<PictureSendSubject[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('picture_send_subjects' as any)
    .select('id, label, created_at, updated_at')
    .order('label')

  if (error) {
    console.error('件名マスタの取得に失敗しました', error)
    return []
  }
  return (data ?? []) as unknown as PictureSendSubject[]
}

/** 送信画面の「直近の送信」表示用（自分の投稿のみ、RLSでも自動的に絞られる） */
export async function getMyRecentSends(limit: number): Promise<AlbumItem[]> {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user?.id) return []

  const { data, error } = await supabase
    .from('picture_sends' as any)
    .select('id, user_id, user_email, subject_text, body_text, priority, storage_path, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('直近の送信の取得に失敗しました', error)
    return []
  }

  return attachSignedUrls(supabase, (data ?? []) as unknown as PictureSendRow[])
}

/**
 * アルバム画面用のページング取得。
 * scope: 'own' は自分の投稿のみ、'team' はマネージャーが部下の投稿を見る場合に使う
 * （呼び出し元のServer Componentで`canViewTeamAlbum()`を確認した上で使うこと。
 * RLS自体も同時に is_manager と division_id を検証するため、二重の保護になる）。
 */
export async function getAlbumPage(params: {
  scope: AlbumScope
  offset: number
  limit: number
  subjectFilter?: string
  highOnly?: boolean
}): Promise<{ items: AlbumItem[]; hasMore: boolean }> {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user?.id) return { items: [], hasMore: false }

  let query: any = supabase
    .from('picture_sends' as any)
    .select('id, user_id, user_email, subject_text, body_text, priority, storage_path, created_at')
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1)

  if (params.scope === 'own') {
    query = query.eq('user_id', user.id)
  } else {
    // 'team': RLSが同一部門のマネージャーのみに絞り込むため、
    // ここでは明示的に自分自身を除外して「部下」のみを返す
    query = query.neq('user_id', user.id)
  }

  if (params.subjectFilter) {
    query = query.eq('subject_text', params.subjectFilter)
  }
  if (params.highOnly) {
    query = query.eq('priority', 'high')
  }

  const { data, error } = await query

  if (error) {
    console.error('アルバムの取得に失敗しました', error)
    return { items: [], hasMore: false }
  }

  const rows = (data ?? []) as PictureSendRow[]
  const items = await attachSignedUrls(supabase, rows)
  return { items, hasMore: rows.length === params.limit }
}

/** アルバムの件名フィルタ用の選択肢一覧 */
export async function getAlbumSubjectOptions(scope: AlbumScope): Promise<string[]> {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user?.id) return []

  let query: any = supabase
    .from('picture_sends' as any)
    .select('subject_text')
    .order('subject_text')
  query = scope === 'own' ? query.eq('user_id', user.id) : query.neq('user_id', user.id)

  const { data, error } = await query
  if (error) {
    console.error('件名フィルタ選択肢の取得に失敗しました', error)
    return []
  }

  const subjects = (data ?? []) as { subject_text: string }[]
  const unique = [...new Set(subjects.map(r => r.subject_text).filter(Boolean))]
  return unique.sort((a, b) => a.localeCompare(b, 'ja'))
}
