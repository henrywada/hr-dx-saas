import type { SupabaseClient } from '@supabase/supabase-js'

type RpcResult = Promise<{ data: unknown; error: unknown }>

/**
 * types.ts 未再生成の RPC 用の緩い呼び出しヘルパー。
 * （types.ts を再生成したら本ファイルは不要）
 */
export function callRpc(
  supabase: SupabaseClient<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  fn: string,
  args: Record<string, unknown>,
): RpcResult {
  return (supabase.rpc as unknown as (f: string, a: Record<string, unknown>) => RpcResult).call(
    supabase,
    fn,
    args,
  )
}
