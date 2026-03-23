import type { FunctionInvokeOptions } from '@supabase/functions-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase JS の functions.invoke は、セッション未復元時に Authorization に anon key を載せることがある。
 * GoTrue はそれをユーザ JWT として検証できず Invalid JWT になる。
 *
 * 対策:
 * 1. qr-punch と同様に先に auth.getUser() でセッションをサーバと整合（期限切れなら更新されやすい）
 * 2. 続けて getSession() で access_token を取り、invoke に Authorization: Bearer を明示する
 */
export class EdgeInvokeNoSessionError extends Error {
  constructor() {
    super('ログインセッションを確認できません。少し待ってから再読み込みするか、再度ログインしてください。')
    this.name = 'EdgeInvokeNoSessionError'
  }
}

export async function invokeEdgeWithSession<T = unknown>(
  supabase: SupabaseClient,
  functionName: string,
  options?: FunctionInvokeOptions,
) {
  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return { data: null as T | null, error: new EdgeInvokeNoSessionError() }
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) {
    return { data: null as T | null, error: new EdgeInvokeNoSessionError() }
  }

  return supabase.functions.invoke<T>(functionName, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}
