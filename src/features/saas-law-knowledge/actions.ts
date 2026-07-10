'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import type { RefreshActionResult } from './types'

async function getSaasAdminUser() {
  const user = await getServerUser()
  if (!user || (user.role !== 'supaUser' && user.appRole !== 'developer')) return null
  return user
}

/** 文書を無効化/再公開する（status のトグル） */
export async function toggleHrLawDocumentStatus(
  documentId: string,
  nextStatus: 'published' | 'disabled'
): Promise<{ ok: boolean; error?: string }> {
  const user = await getSaasAdminUser()
  if (!user) return { ok: false, error: '権限がありません' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('hr_law_documents')
    .update({ status: nextStatus })
    .eq('id', documentId)

  if (error) {
    console.error('[saas-law-knowledge] toggleHrLawDocumentStatus', error)
    return { ok: false, error: '更新に失敗しました' }
  }

  revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
  return { ok: true }
}

/** 指定トピックの法令ナレッジ収集を手動実行する（Edge Function を直接呼び出す） */
export async function triggerHrLawRefresh(sourceId: string): Promise<RefreshActionResult> {
  const user = await getSaasAdminUser()
  if (!user) return { ok: false, error: '権限がありません' }

  const supabaseUrl = (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    ''
  ).trim()
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, error: 'Supabase の接続情報が未設定です' }
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/hr-law-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ sourceId }),
    })

    const data = await res.json()
    if (!res.ok || data.error) {
      return { ok: false, error: data.error ?? `実行に失敗しました (${res.status})` }
    }

    revalidatePath(APP_ROUTES.SAAS.HR_LAW_KNOWLEDGE)
    return {
      ok: true,
      documentsCreated: data.documentsCreated ?? 0,
      documentsSkipped: data.documentsSkipped ?? 0,
      errors: data.errors ?? [],
      queued: data.queued ?? 0,
    }
  } catch (e) {
    console.error('[saas-law-knowledge] triggerHrLawRefresh', e)
    return { ok: false, error: '実行リクエストに失敗しました' }
  }
}
