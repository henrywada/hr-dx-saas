/**
 * トレーサビリティQR（公開ページURL）のベースURLを決める
 *
 * MYOU の客が読み取るQRは、HR-DX の app ドメインではなく myou ドメインの公開ページを指す。
 * MYOU_SITE_URL（サーバー専用）を最優先し、未設定の環境では従来どおり
 * NEXT_PUBLIC_APP_URL → VERCEL_URL → localhost の順にフォールバックする。
 */
export function resolveTraceBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const candidates = [
    env.MYOU_SITE_URL,
    env.NEXT_PUBLIC_APP_URL,
    env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
  ]
  const base = candidates.map(v => v?.trim()).find(v => !!v) ?? 'http://localhost:3000'
  return base.replace(/\/+$/, '')
}
