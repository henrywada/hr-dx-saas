import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js'

/** Edge Function の JSON ボディからユーザー向け文言（特定コードのときは detail より優先） */
export function userMessageFromEdgeJsonBody(j: Record<string, unknown>): string | null {
  const code = j.error
  if (code === 'server_misconfigured') {
    return typeof j.detail === 'string' && j.detail.length > 0
      ? j.detail
      : 'サーバー設定（QR 署名用シークレット）が不正です。管理者に連絡してください。'
  }
  if (code === 'missing_supervisor_location') {
    return '監督者端末の位置情報が取得できませんでした。位置情報を許可してから QR を再生成してください。'
  }
  return null
}

/** 非 2xx 時のレスポンス JSON（あれば） */
export async function jsonFromFunctionsHttpError(
  error: unknown,
): Promise<Record<string, unknown> | null> {
  if (error instanceof FunctionsHttpError && error.context instanceof Response) {
    try {
      const ct = error.context.headers.get('Content-Type') ?? ''
      if (ct.includes('application/json')) {
        return (await error.context.clone().json()) as Record<string, unknown>
      }
    } catch {
      return null
    }
  }
  return null
}

/** qr-scan の JSON エラーをユーザー向け文言に */
export function mapQrScanApiError(body: {
  error?: string
  reason?: string
  detail?: string
}): string {
  const code = body.error ?? ''
  const reason = body.reason ?? ''
  if (code === 'token_rejected') {
    if (reason === 'expired') return 'QRの有効期限が切れています。上司に新しいQRの表示を依頼してください。'
    if (reason === 'bad_signature' || reason === 'invalid_payload')
      return 'QRが改ざんされているか無効です。'
    return 'QRが無効です。もう一度スキャンしてください。'
  }
  if (code === 'session_expired') return 'セッションの有効期限が切れています。'
  if (code === 'session_exhausted' || code === 'session_already_used') return 'このQRはすでに使用されています。'
  if (code === 'tenant_mismatch') return '別の会社のQRです。正しいQRをスキャンしてください。'
  if (code === 'session_not_found') return 'セッションが見つかりません。QRを再表示してもらってください。'
  if (code === 'session_token_mismatch') return 'QRとサーバー情報が一致しません。再スキャンしてください。'
  if (code === 'unauthorized') return 'ログインの有効期限が切れています。再ログインしてください。'
  if (code === 'employee_not_found') return '従業員情報が見つかりません。管理者に連絡してください。'
  if (code === 'invalid_location') return '位置情報の形式が不正です。'
  if (code === 'duplicate_punch') return '本日の同じ種別の打刻はすでに記録されています。'
  if (code === 'geo_fence_violation')
    return '現場から離れすぎているため打刻できません。監督者の近くで再度お試しください。'
  if (code === 'location_accuracy_too_low')
    return '位置情報の精度が不足しています。GPS をオンにし、屋外または窓際で再度お試しください。'
  if (code === 'geofence_not_configured')
    return 'QR の現場位置が設定されていません。監督者に QR の再表示を依頼してください。'
  if (code === 'work_time_record_failed') return '勤怠データの保存に失敗しました。管理者に連絡してください。'
  if (code === 'invalid_purpose') return '打刻種別が不正です。'
  return body.detail ?? (code || '打刻に失敗しました。')
}

function underlyingFetchMessage(context: unknown): string {
  if (context instanceof Error && context.message) return context.message
  if (typeof context === 'object' && context !== null && 'message' in context) {
    const m = (context as { message?: unknown }).message
    if (typeof m === 'string' && m.length > 0) return m
  }
  return ''
}

/** Edge Function が非 2xx を返したとき、レスポンス JSON からメッセージを取り出す */
export async function messageFromFunctionsInvokeError(error: unknown): Promise<string> {
  if (error instanceof FunctionsFetchError) {
    const hint = underlyingFetchMessage(error.context)
    const base = 'Edge Function への接続に失敗しました'
    if (hint && !/^failed to fetch$/i.test(hint)) {
      return `${base}（${hint}）`
    }
    return `${base}。ブラウザの広告ブロック・拡張機能をオフにする、別ブラウザで試す、VPN を切るなどを確認してください。改善しない場合は管理者へ連絡してください。`
  }
  if (error instanceof FunctionsHttpError) {
    const res = error.context
    if (res instanceof Response) {
      try {
        const ct = res.headers.get('Content-Type') ?? ''
        if (ct.includes('application/json')) {
          const j = (await res.clone().json()) as Record<string, unknown>
          const mapped = userMessageFromEdgeJsonBody(j)
          if (mapped) return mapped
          if (typeof j.msg === 'string') return j.msg
          if (typeof j.message === 'string') return j.message
          if (typeof j.detail === 'string') return j.detail
          if (typeof j.error === 'string') return j.error
        }
      } catch {
        /* ignore */
      }
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'Edge Function の呼び出しに失敗しました'
}
