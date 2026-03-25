'use server'

import { createAdminServiceClient } from '@/lib/supabase/adminClient'
import { createClient } from '@/lib/supabase/server'
import { FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  mapQrScanApiError,
  messageFromFunctionsInvokeError,
  userMessageFromEdgeJsonBody,
} from './parse-functions-error'

export type QrPunchPurpose = 'punch_in' | 'punch_out'
type QrTokenPayload = {
  sessionId: string
  exp: number
  tenantId: string
  nonce: string
  purpose: string
}
type QrSigningSecretDebug = {
  // 値そのものは出さない（推測/漏洩防止）
  hasEnvVar: boolean
  envLength: number | null
  envValid: boolean
  usedLocalFallback: boolean
  // ローカルフォールバック判定に使用した URL のホストだけ出す
  supabaseUrlHostForFallbackCheck: string | null
}

type QrTokenVerificationDebug = {
  tokenRejectedReason?: string
  // secret の出所のみ（値は出さない）
  secretSource: 'env' | 'local_fallback'
}

type QrDebugInfo = {
  qrSigningSecret?: QrSigningSecretDebug
  tokenVerification?: QrTokenVerificationDebug
  // Edge invoke のフォールバック等が発生したか
  fallbackUsed?: boolean
}

type SessionCreateResult =
  | { ok: true; sessionId: string; expiresAt: string; token: string }
  | { ok: false; message: string; debug?: QrDebugInfo }
type ScanInvokeResult =
  | { ok: true; scanId: string; result: string }
  | { ok: false; message: string; debug?: QrDebugInfo }
const PURPOSES = new Set<QrPunchPurpose>(['punch_in', 'punch_out'])

function bytesToBase64Url(bytes: Buffer): string {
  return bytes.toString('base64url')
}

function base64UrlToBytes(value: string): Buffer {
  return Buffer.from(value, 'base64url')
}

function encodeTokenMessage(p: QrTokenPayload): string {
  return `${p.sessionId}|${p.exp}|${p.tenantId}|${p.nonce}|${p.purpose}`
}

function decodeTokenMessage(msg: string): QrTokenPayload | null {
  const parts = msg.split('|')
  if (parts.length !== 5) return null
  const [sessionId, expStr, tenantId, nonce, purpose] = parts
  const exp = Number(expStr)
  if (!sessionId || !Number.isFinite(exp) || !tenantId || !nonce || !purpose) return null
  return { sessionId, exp, tenantId, nonce, purpose }
}

function signQrToken(secret: string, payload: QrTokenPayload): string {
  const message = encodeTokenMessage(payload)
  const sig = createHmac('sha256', secret).update(message).digest()
  const msgB64 = bytesToBase64Url(Buffer.from(message, 'utf8'))
  const sigB64 = bytesToBase64Url(sig)
  return `${msgB64}.${sigB64}`
}

function verifyQrToken(
  secret: string,
  token: string,
): { ok: true; payload: QrTokenPayload } | { ok: false; reason: string } {
  const dot = token.indexOf('.')
  if (dot < 0) return { ok: false, reason: 'malformed_token' }
  const msgB64 = token.slice(0, dot)
  const sigB64 = token.slice(dot + 1)
  let message: string
  try {
    message = base64UrlToBytes(msgB64).toString('utf8')
  } catch {
    return { ok: false, reason: 'invalid_encoding' }
  }
  const payload = decodeTokenMessage(message)
  if (!payload) return { ok: false, reason: 'invalid_payload' }
  let sig: Buffer
  try {
    sig = base64UrlToBytes(sigB64)
  } catch {
    return { ok: false, reason: 'invalid_signature_encoding' }
  }
  const expected = createHmac('sha256', secret).update(message).digest()
  if (expected.length !== sig.length || !timingSafeEqual(expected, sig)) {
    return { ok: false, reason: 'bad_signature' }
  }
  const nowSec = Math.floor(Date.now() / 1000)
  if (payload.exp < nowSec) return { ok: false, reason: 'expired' }
  return { ok: true, payload }
}

function haversineDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toR = (d: number) => (d * Math.PI) / 180
  const dLat = toR(lat2 - lat1)
  const dLng = toR(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

function isLikelyLocalSupabaseUrl(url: string): boolean {
  const u = url.trim()
  if (!u) return false
  if (u.includes('127.0.0.1') || u.includes('localhost') || u.includes('192.168.') || u.includes('10.0.2.')) {
    return true
  }
  try {
    const h = new URL(u).hostname.toLowerCase()
    if (h === 'kong' || h === 'host.docker.internal' || h === '[::1]' || h === '::1') return true
    if (h.endsWith('.local')) return true
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(h)) return true
  } catch {
    /* ignore */
  }
  return false
}

function getQrSigningSecretServerDebug(): QrSigningSecretDebug {
  const hasEnvVar = typeof process.env.QR_SIGNING_SECRET !== 'undefined'
  const raw = (process.env.QR_SIGNING_SECRET ?? '').trim()
  const envLength = hasEnvVar ? raw.length : null
  const envValid = raw.length >= 16

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const usedLocalFallback = isLikelyLocalSupabaseUrl(supabaseUrl)
  let supabaseUrlHostForFallbackCheck: string | null = null
  try {
    supabaseUrlHostForFallbackCheck = new URL(supabaseUrl).hostname
  } catch {
    supabaseUrlHostForFallbackCheck = null
  }

  return {
    hasEnvVar,
    envLength,
    envValid,
    usedLocalFallback,
    supabaseUrlHostForFallbackCheck,
  }
}

function resolveQrSigningSecretServer(): string | null {
  const raw = (process.env.QR_SIGNING_SECRET ?? '').trim()
  if (raw) {
    if (raw.length >= 16) return raw
    return null
  }
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (isLikelyLocalSupabaseUrl(supabaseUrl)) {
    return 'local-dev-only-qr-signing-secret-min16!'
  }
  return null
}

async function shouldFallbackToServerImpl(error: unknown): Promise<boolean> {
  if (error instanceof FunctionsRelayError || error instanceof FunctionsHttpError) {
    const msg = await messageFromFunctionsInvokeError(error)
    if (/Requested function was not found/i.test(msg)) return true
  }
  return false
}

async function createQrSessionFallback(purpose: QrPunchPurpose, userId: string): Promise<SessionCreateResult> {
  if (!PURPOSES.has(purpose)) return { ok: false, message: 'invalid_purpose' }
  const secret = resolveQrSigningSecretServer()
  if (!secret) {
    return {
      ok: false,
      message:
        'QR_SIGNING_SECRET が未設定か短すぎます（16文字以上）。本番では supabase secrets set で設定してください。',
      debug: {
        qrSigningSecret: getQrSigningSecretServerDebug(),
        fallbackUsed: true,
      },
    }
  }
  const userClient = await createClient()
  const { data: emp, error: empErr } = await userClient.from('employees').select('tenant_id').eq('user_id', userId).maybeSingle()
  if (empErr || !emp?.tenant_id) return { ok: false, message: 'employee_not_found' }

  try {
    const admin = createAdminServiceClient()
    const nonce = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 60_000).toISOString()
    const { data: row, error: insErr } = await admin
      .from('qr_sessions')
      .insert({
        tenant_id: emp.tenant_id,
        supervisor_user_id: userId,
        purpose,
        expires_at: expiresAt,
        nonce,
        max_uses: 1,
        uses: 0,
        is_active: true,
        metadata: {},
      })
      .select('id, expires_at')
      .single()
    if (insErr || !row) return { ok: false, message: insErr?.message ?? 'insert_failed' }

    const expUnix = Math.floor(new Date(row.expires_at).getTime() / 1000)
    const token = signQrToken(secret, {
      sessionId: row.id,
      exp: expUnix,
      tenantId: emp.tenant_id,
      nonce,
      purpose,
    })
    return { ok: true, sessionId: row.id, expiresAt: row.expires_at, token }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'QR セッションの作成に失敗しました。' }
  }
}

function evaluateAutoAccept(metadata: unknown, loc: QrScanLocationInput): boolean {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return false
  const m = metadata as Record<string, unknown>
  const slat = m.supervisor_lat
  const slng = m.supervisor_lng
  if (typeof slat !== 'number' || typeof slng !== 'number') return false
  const radiusM = typeof m.radius_m === 'number' ? m.radius_m : 100
  const acc = typeof loc.accuracy === 'number' ? loc.accuracy : 9999
  if (acc > 150) return false
  const d = haversineDistanceM(slat, slng, loc.lat, loc.lng)
  return d <= radiusM + acc
}

async function scanQrFallback(input: {
  token: string
  location: QrScanLocationInput
  deviceInfo: Record<string, string>
  userId: string
}): Promise<ScanInvokeResult> {
  const secret = resolveQrSigningSecretServer()
  if (!secret) {
    return {
      ok: false,
      message:
        'QR_SIGNING_SECRET が未設定か短すぎます（16文字以上）。本番では supabase secrets set で設定してください。',
      debug: {
        qrSigningSecret: getQrSigningSecretServerDebug(),
        fallbackUsed: true,
      },
    }
  }
  const verified = verifyQrToken(secret, input.token)
  if (verified.ok === false) {
    return {
      ok: false,
      message: mapQrScanApiError({ error: 'token_rejected', reason: verified.reason }),
      debug: {
        tokenVerification: {
          tokenRejectedReason: verified.reason,
          secretSource: secret.startsWith('local-dev-only-') ? 'local_fallback' : 'env',
        },
      },
    }
  }
  const userClient = await createClient()
  const { data: emp, error: empErr } = await userClient
    .from('employees')
    .select('tenant_id')
    .eq('user_id', input.userId)
    .maybeSingle()
  if (empErr || !emp?.tenant_id) return { ok: false, message: mapQrScanApiError({ error: 'employee_not_found' }) }
  if (emp.tenant_id !== verified.payload.tenantId) return { ok: false, message: mapQrScanApiError({ error: 'tenant_mismatch' }) }

  try {
    const admin = createAdminServiceClient()
    const { data: session, error: sesErr } = await admin
      .from('qr_sessions')
      .select('id, tenant_id, nonce, purpose, expires_at, is_active, uses, max_uses, metadata')
      .eq('id', verified.payload.sessionId)
      .maybeSingle()
    if (sesErr || !session) return { ok: false, message: mapQrScanApiError({ error: 'session_not_found' }) }
    if (
      session.nonce !== verified.payload.nonce ||
      session.tenant_id !== verified.payload.tenantId ||
      session.purpose !== verified.payload.purpose
    ) {
      return { ok: false, message: mapQrScanApiError({ error: 'session_token_mismatch' }) }
    }
    if (!session.is_active || session.uses >= session.max_uses) {
      return { ok: false, message: mapQrScanApiError({ error: 'session_exhausted' }) }
    }
    if (new Date(session.expires_at).getTime() < Date.now()) {
      return { ok: false, message: mapQrScanApiError({ error: 'session_expired' }) }
    }

    const prevUses = session.uses
    const { data: consumed, error: upErr } = await admin
      .from('qr_sessions')
      .update({
        uses: prevUses + 1,
        is_active: prevUses + 1 >= session.max_uses ? false : session.is_active,
      })
      .eq('id', session.id)
      .eq('uses', prevUses)
      .select('id')
      .maybeSingle()
    if (upErr || !consumed) return { ok: false, message: mapQrScanApiError({ error: 'session_already_used' }) }

    const autoOk = evaluateAutoAccept(session.metadata, input.location)
    const result = autoOk ? 'accepted' : 'pending'
    const { data: scan, error: scanErr } = await admin
      .from('qr_session_scans')
      .insert({
        tenant_id: session.tenant_id,
        session_id: session.id,
        employee_user_id: input.userId,
        location: {
          lat: input.location.lat,
          lng: input.location.lng,
          accuracy: input.location.accuracy ?? null,
          provider: 'client',
        },
        device_info: input.deviceInfo ?? {},
        result,
        confirm_method: autoOk ? 'auto' : null,
        audit: {
          token_exp: verified.payload.exp,
          auto_accept_evaluated: true,
          auto_accept: autoOk,
        },
      })
      .select('id, result')
      .single()
    if (scanErr || !scan) return { ok: false, message: scanErr?.message ?? 'scan_insert_failed' }

    const { error: auditErr } = await admin.from('qr_audit_logs').insert({
      tenant_id: session.tenant_id,
      related_table: 'qr_session_scans',
      related_id: scan.id,
      action: 'scan',
      actor_user_id: input.userId,
      payload: { session_id: session.id, result: scan.result },
    })
    if (auditErr) console.error('qr_audit_logs insert', auditErr)
    return { ok: true, scanId: scan.id, result: scan.result }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'QR スキャン処理に失敗しました。' }
  }
}

/** 日本時間の当該日の [startIso, endIsoExclusive)（UTC ISO 文字列） */
function getJstDateRangeUtc(now = new Date()): { dateStr: string; startIso: string; endIsoExclusive: string } {
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const start = new Date(`${dateStr}T00:00:00+09:00`)
  const endIsoExclusive = new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString()
  return { dateStr, startIso: start.toISOString(), endIsoExclusive }
}

/**
 * QR 消費・位置送信の前に、同日（JST）かつ同一種別（出勤/退勤）で既に打刻があるか判定する。
 * work_time_records の該当日レコード、または承認済み qr_session_scans を参照。
 */
export async function checkQrDuplicatePunch(
  token: string,
): Promise<
  | { ok: true; purpose: QrPunchPurpose; needsConfirm: boolean }
  | { ok: false; message: string; debug?: QrDebugInfo }
> {
  const trimmed = token.trim()
  if (!trimmed) {
    return { ok: false, message: 'QRからデータを読み取れませんでした。' }
  }
  const secret = resolveQrSigningSecretServer()
  if (!secret) {
    return {
      ok: false,
      message:
        'QR_SIGNING_SECRET が未設定か短すぎます（16文字以上）。本番では supabase secrets set で設定してください。',
      debug: {
        qrSigningSecret: getQrSigningSecretServerDebug(),
      },
    }
  }
  const verified = verifyQrToken(secret, trimmed)
  if (verified.ok === false) {
    return {
      ok: false,
      message: mapQrScanApiError({ error: 'token_rejected', reason: verified.reason }),
      debug: {
        tokenVerification: {
          tokenRejectedReason: verified.reason,
          secretSource: secret.startsWith('local-dev-only-') ? 'local_fallback' : 'env',
        },
      },
    }
  }
  const rawPurpose = verified.payload.purpose
  if (!PURPOSES.has(rawPurpose as QrPunchPurpose)) {
    return { ok: false, message: 'QRの打刻種別が不正です。' }
  }
  const purpose = rawPurpose as QrPunchPurpose

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, message: 'ログイン情報を確認できませんでした。再ログインしてください。' }
  }

  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('id, tenant_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (empErr || !emp?.tenant_id) {
    return { ok: false, message: mapQrScanApiError({ error: 'employee_not_found' }) }
  }
  if (emp.tenant_id !== verified.payload.tenantId) {
    return { ok: false, message: mapQrScanApiError({ error: 'tenant_mismatch' }) }
  }

  const { dateStr, startIso, endIsoExclusive } = getJstDateRangeUtc()

  /** 行が存在し、かつ時刻が実値として入っているときだけ true（null / 未設定 / 空文字は false） */
  function workTimeFieldSet(v: string | null | undefined): boolean {
    return v != null && String(v).trim() !== ''
  }

  // work_time_records は DB に存在するが Generated Database 型に未含まれる場合がある
  const { data: wtr } = await (supabase as { from: (r: string) => any })
    .from('work_time_records')
    .select('start_time, end_time')
    .eq('employee_id', emp.id)
    .eq('record_date', dateStr)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const w = wtr as { start_time: string | null; end_time: string | null } | null
  const fromWork =
    w != null &&
    (purpose === 'punch_in' ? workTimeFieldSet(w.start_time) : workTimeFieldSet(w.end_time))

  const { data: scans, error: scanErr } = await supabase
    .from('qr_session_scans')
    .select('session_id')
    .eq('employee_user_id', user.id)
    .eq('result', 'accepted')
    .gte('scanned_at', startIso)
    .lt('scanned_at', endIsoExclusive)

  let fromQr = false
  if (scanErr) {
    console.error('checkQrDuplicatePunch scans', scanErr)
  } else {
    const sessionIds = [...new Set((scans ?? []).map((r) => r.session_id))]
    if (sessionIds.length > 0) {
      const { data: sessions, error: sesErr } = await supabase.from('qr_sessions').select('id, purpose').in('id', sessionIds)
      if (sesErr) {
        console.error('checkQrDuplicatePunch sessions', sesErr)
      } else {
        fromQr = (sessions ?? []).some((s) => s.purpose === purpose)
      }
    }
  }

  return { ok: true, purpose, needsConfirm: fromWork || fromQr }
}

/** ブラウザから Edge を直接叩かず、サーバー経由で呼ぶ（広告ブロック・CORS 回避） */
export async function invokeQrCreateSession(
  purpose: QrPunchPurpose,
): Promise<SessionCreateResult> {
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
    if (await shouldFallbackToServerImpl(fnErr)) {
      return createQrSessionFallback(purpose, user.id)
    }
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
}): Promise<ScanInvokeResult> {
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
    if (await shouldFallbackToServerImpl(fnErr)) {
      return scanQrFallback({
        token: input.token,
        location: input.location,
        deviceInfo: input.deviceInfo,
        userId: user.id,
      })
    }
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
