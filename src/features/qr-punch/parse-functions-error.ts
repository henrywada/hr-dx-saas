import { FunctionsHttpError } from '@supabase/supabase-js'

/** Edge Function の JSON ボディからユーザー向け文言（特定コードのときは detail より優先） */
export function userMessageFromEdgeJsonBody(j: Record<string, unknown>): string | null {
  const code = j.error
  if (code === 'server_misconfigured') {
    return typeof j.detail === 'string' && j.detail.length > 0
      ? j.detail
      : 'サーバー設定（QR 署名用シークレット）が不正です。管理者に連絡してください。'
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

/** Edge Function が非 2xx を返したとき、レスポンス JSON からメッセージを取り出す */
export async function messageFromFunctionsInvokeError(error: unknown): Promise<string> {
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
