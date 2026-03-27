/**
 * NEXT_PUBLIC_* が未設定のとき（例: Vercel にまだ登録していない初回デプロイ）に
 * @supabase/ssr が投げる「URL and API key are required」を避けるためのプレースホルダー。
 * この状態では API は動かないため、本番では必ず実値を Vercel Environment Variables に設定すること。
 */
const PLACEHOLDER_URL = 'https://__set_next_public_supabase_url__.supabase.co'
/** 形式だけ整えたダミー（署名は無効。接続は失敗する） */
const PLACEHOLDER_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.build-placeholder-invalid-signature'

export type SupabasePublicConfig = {
  url: string
  anonKey: string
  /** true のときはダミー。本番デプロイ後も true なら環境変数が届いていない */
  usesPlaceholder: boolean
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''
  if (url && anonKey) {
    return { url, anonKey, usesPlaceholder: false }
  }
  return { url: PLACEHOLDER_URL, anonKey: PLACEHOLDER_ANON_KEY, usesPlaceholder: true }
}

export function warnIfSupabasePlaceholder(context: string): void {
  const { usesPlaceholder } = getSupabasePublicConfig()
  if (!usesPlaceholder) return
  console.warn(
    `[Supabase:${context}] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。ビルドは続行しますが、認証・DB は動きません。Vercel の Environment Variables を設定してください。`,
  )
}
