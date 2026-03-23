/**
 * QR トークン署名用シークレット。
 * 本番・ステージング（Supabase クラウド等）では必ず QR_SIGNING_SECRET を 16 文字以上で設定すること。
 * ローカル（127.0.0.1 / localhost）のみ、未設定時に開発用フォールバックを使う。
 */
export function resolveQrSigningSecret(): string | null {
  const raw = Deno.env.get("QR_SIGNING_SECRET")?.trim()
  if (raw) {
    if (raw.length >= 16) return raw
    return null
  }

  const url = Deno.env.get("SUPABASE_URL") ?? ""
  const isLikelyLocal =
    url.includes("127.0.0.1") ||
    url.includes("localhost") ||
    url.includes("192.168.") ||
    url.includes("10.0.2.")

  if (isLikelyLocal) {
    return "local-dev-only-qr-signing-secret-min16!"
  }

  return null
}
