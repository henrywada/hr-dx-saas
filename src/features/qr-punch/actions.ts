'use server'

import { createClient } from '@/lib/supabase/server'
import {
  mapQrScanApiError,
  messageFromFunctionsInvokeError,
  userMessageFromEdgeJsonBody,
} from './parse-functions-error'

export type QrPunchPurpose = 'punch_in' | 'punch_out'

/** ブラウザから Edge を直接叩かず、サーバー経由で呼ぶ（広告ブロック・CORS 回避） */
export async function invokeQrCreateSession(
  purpose: QrPunchPurpose,
): Promise<
  | { ok: true; sessionId: string; expiresAt: string; token: string }
  | { ok: false; message: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, message: 'ログイン情報を確認できませんでした。再度ログインしてください。' }
  }
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) {
    return {
      ok: false,
      message: 'ログインセッションを確認できません。ページを再読み込みするか、再度ログインしてください。',
    }
  }

  const { data, error: fnErr } = await supabase.functions.invoke('qr-create-session', {
    body: { purpose },
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (fnErr) {
    return { ok: false, message: await messageFromFunctionsInvokeError(fnErr) }
  }

  const json = data as {
    sessionId?: string
    expiresAt?: string
    token?: string
    error?: string
    detail?: string
  }
  if (json?.error) {
    const mapped = userMessageFromEdgeJsonBody(json as Record<string, unknown>)
    return { ok: false, message: mapped ?? json.detail ?? json.error }
  }
  if (!json?.sessionId || !json?.expiresAt || !json?.token) {
    return { ok: false, message: '応答形式が不正です' }
  }
  return { ok: true, sessionId: json.sessionId, expiresAt: json.expiresAt, token: json.token }
}

export type QrScanLocationInput = { lat: number; lng: number; accuracy: number }

export async function invokeQrScan(input: {
  token: string
  location: QrScanLocationInput
  deviceInfo: Record<string, string>
}): Promise<{ ok: true; scanId: string; result: string } | { ok: false; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, message: 'ログイン情報を確認できませんでした。再ログインしてください。' }
  }
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) {
    return {
      ok: false,
      message: 'ログインセッションを確認できません。ページを再読み込みするか、再ログインしてください。',
    }
  }

  const { data, error: fnErr } = await supabase.functions.invoke('qr-scan', {
    body: {
      token: input.token,
      location: input.location,
      deviceInfo: input.deviceInfo,
    },
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (fnErr) {
    return { ok: false, message: await messageFromFunctionsInvokeError(fnErr) }
  }

  const json = data as {
    scanId?: string
    result?: string
    error?: string
    reason?: string
    detail?: string
  }
  if (json?.error) {
    return { ok: false, message: mapQrScanApiError(json) }
  }
  const scanId = json.scanId
  const result = json.result
  if (!scanId || !result) {
    return { ok: false, message: '応答が不正です。' }
  }
  return { ok: true, scanId, result }
}

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
