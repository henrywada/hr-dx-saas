/**
 * ローカル supabase start では Edge 内の SUPABASE_URL が http://kong:8000 やプライベート IP になり、
 * "localhost" 文字列が無くフォールバックが効かないことがある。
 */
/** ローカル supabase / Docker 内 Kong 等の判定（他 Edge 共有用） */
export function isLikelyLocalSupabaseUrl(url: string): boolean {
  const u = url.trim()
  if (!u) return false
  if (
    u.includes("127.0.0.1") ||
    u.includes("localhost") ||
    u.includes("192.168.") ||
    u.includes("10.0.2.")
  ) {
    return true
  }
  try {
    const { hostname } = new URL(u)
    const h = hostname.toLowerCase()
    if (h === "kong" || h === "host.docker.internal" || h === "[::1]" || h === "::1") {
      return true
    }
    if (h.endsWith(".local")) return true
    // プライベート IPv4（Docker bridge 等）
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(h)) {
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

/**
 * QR トークン署名用シークレット。
 * 本番・ステージング（Supabase クラウド等）では必ず QR_SIGNING_SECRET を 16 文字以上で設定すること。
 * ローカル開発のみ、未設定時に開発用フォールバックを使う。
 */
export function resolveQrSigningSecret(): string | null {
  const raw = Deno.env.get("QR_SIGNING_SECRET")?.trim()
  if (raw) {
    if (raw.length >= 16) return raw
    return null
  }

  const url = Deno.env.get("SUPABASE_URL") ?? ""
  if (isLikelyLocalSupabaseUrl(url)) {
    return "local-dev-only-qr-signing-secret-min16!"
  }

  return null
}
