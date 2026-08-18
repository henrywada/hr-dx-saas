import type { ResearchResult } from '../types'

/**
 * 外部サイト呼び出しのタイムアウト。
 * 実測の最遅は JAISH 検索・裁決事例検索の約 1.4 秒（2026-08-18 計測）。
 * 外部サイトの一時的な遅延を許容しつつ、ユーザーを待たせすぎない値として 12 秒。
 */
export const EXTERNAL_TIMEOUT_MS = 12000

/** タイムアウト検出用の内部エラー */
class ExternalTimeoutError extends Error {}

/**
 * 外部サイト（e-Gov / 厚労省 / JAISH / 国税庁 / 国税不服審判所）への呼び出しを包む。
 *
 * - 例外を外へ投げず、必ず ResearchResult を返す
 * - 失敗は必ずサーバー側ログに残す（無言で握り潰さない）
 * - 失敗時も sourceUrl を返し、UI から出典サイトへ直接飛べるようにする
 */
export async function callExternal<T>(
  label: string,
  fn: () => Promise<T>,
  opts: { timeoutMs?: number; sourceUrl?: string } = {}
): Promise<ResearchResult<T>> {
  const timeoutMs = opts.timeoutMs ?? EXTERNAL_TIMEOUT_MS
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    const data = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ExternalTimeoutError()), timeoutMs)
      }),
    ])
    return { ok: true, data }
  } catch (e) {
    if (e instanceof ExternalTimeoutError) {
      console.error(`[law-research] timeout: ${label} (${timeoutMs}ms)`)
      return {
        ok: false,
        error: {
          kind: 'timeout',
          message: `${label}を時間内に取得できませんでした。時間をおいて再度お試しください。`,
          sourceUrl: opts.sourceUrl,
        },
      }
    }

    console.error(`[law-research] upstream error: ${label}`, e)
    return {
      ok: false,
      error: {
        kind: 'upstream',
        message: `${label}を取得できませんでした。出典サイトが一時的に利用できないか、ページ構成が変更された可能性があります。`,
        sourceUrl: opts.sourceUrl,
      },
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}
