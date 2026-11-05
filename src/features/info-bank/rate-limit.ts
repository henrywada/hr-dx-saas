import { INFO_BANK_ASK_LIMIT_PER_MINUTE, INFO_BANK_ASK_WINDOW_SECONDS } from './constants'

/** supabase.rpc の最小形（テストで差し替え可能にするため） */
export type QuotaRpc = (
  fn: 'try_consume_info_bank_ask',
  args: { p_limit: number; p_window_seconds: number }
) => PromiseLike<{ data: boolean | null; error: { message: string } | null }>

/**
 * 質問 1 回分の枠を消費する。ユーザーごとに直近 1 分で INFO_BANK_ASK_LIMIT_PER_MINUTE 回まで。
 * 確認自体に失敗したときは許可せず（安全側）、内部のエラー文は利用者に見せない。
 */
export async function consumeAskQuota(
  rpc: QuotaRpc
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await rpc('try_consume_info_bank_ask', {
    p_limit: INFO_BANK_ASK_LIMIT_PER_MINUTE,
    p_window_seconds: INFO_BANK_ASK_WINDOW_SECONDS,
  })
  if (error) {
    console.error('[info-bank] try_consume_info_bank_ask', error.message)
    return { ok: false, error: '利用状況の確認に失敗しました。時間をおいてもう一度お試しください' }
  }
  if (data !== true) {
    return {
      ok: false,
      error: '短時間に質問が集中しています。1分ほど待ってからもう一度お試しください',
    }
  }
  return { ok: true }
}
