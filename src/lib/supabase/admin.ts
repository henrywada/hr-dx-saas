import { createClient } from '@supabase/supabase-js'

function cleanEnv(value?: string) {
  return (value ?? '').trim().replace(/^['"]|['"]$/g, '')
}

function isUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function isLikelySupabaseServerKey(value: string) {
  if (!value) return false

  // 新形式
  if (value.startsWith('sb_secret_')) return true

  // 旧形式JWT
  if (value.startsWith('eyJ')) return true

  return false
}

export function createAdminClient() {
  const supabaseUrl = cleanEnv(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

  console.log('[DEBUG] Supabase Admin Init')
  console.log('URL:', supabaseUrl)
  console.log('Raw Length:', (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').length)
  console.log('Cleaned Length:', serviceRoleKey.length)

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL または NEXT_PUBLIC_SUPABASE_URL が未設定です')
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY が未設定です')
  }

  if (isUrl(serviceRoleKey)) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY にURLが入っています。.env.local を確認してください')
  }

  if (!isLikelySupabaseServerKey(serviceRoleKey)) {
    console.warn('[WARN] SUPABASE_SERVICE_ROLE_KEY の形式が想定外です。値を確認してください')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}
