'use server'

import { createClient } from '@/lib/supabase/server'

type SessionRow = {
  supervisor_user_id: string
}

type ScanRow = {
  id: string
  session_id: string
  qr_sessions: SessionRow | null
}

/** 監督者本人のセッションに紐づくスキャンのみ result を更新 */
export async function confirmScanResult(
  scanId: string,
  result: 'accepted' | 'rejected',
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'ログインが必要です' }

  const { data: row, error: selErr } = await supabase
    .from('qr_session_scans')
    .select('id, session_id, qr_sessions!inner ( supervisor_user_id )')
    .eq('id', scanId)
    .maybeSingle()

  if (selErr || !row) {
    return { ok: false, message: 'スキャンが見つかりません' }
  }

  const scan = row as unknown as ScanRow
  const supId = scan.qr_sessions?.supervisor_user_id
  if (supId !== user.id) {
    return { ok: false, message: 'このセッションの監督者のみ承認できます' }
  }

  const { error: upErr } = await supabase
    .from('qr_session_scans')
    .update({
      result,
      supervisor_confirmed: true,
      confirm_method: 'supervisor_tap',
    })
    .eq('id', scanId)
    .eq('result', 'pending')

  if (upErr) return { ok: false, message: upErr.message }
  return { ok: true }
}

export async function bulkConfirmPendingScans(
  scanIds: string[],
  result: 'accepted' | 'rejected',
): Promise<{ ok: true; updated: number } | { ok: false; message: string }> {
  if (scanIds.length === 0) return { ok: true, updated: 0 }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'ログインが必要です' }

  const { data: rows, error: selErr } = await supabase
    .from('qr_session_scans')
    .select('id, session_id, qr_sessions!inner ( supervisor_user_id )')
    .in('id', scanIds)
    .eq('result', 'pending')

  if (selErr || !rows?.length) {
    return { ok: false, message: '対象の保留スキャンが見つかりません' }
  }

  for (const r of rows as unknown as ScanRow[]) {
    if (r.qr_sessions?.supervisor_user_id !== user.id) {
      return { ok: false, message: '権限のないスキャンが含まれています' }
    }
  }

  const ids = rows.map((r) => (r as unknown as ScanRow).id)
  const { data: updatedRows, error: upErr } = await supabase
    .from('qr_session_scans')
    .update({
      result,
      supervisor_confirmed: true,
      confirm_method: 'supervisor_tap',
    })
    .in('id', ids)
    .eq('result', 'pending')
    .select('id')

  if (upErr) return { ok: false, message: upErr.message }
  return { ok: true, updated: updatedRows?.length ?? 0 }
}
