/**
 * サーバー専用: service_role で Supabase に接続する（Edge Functions 外のバッチ等向け）。
 * ブラウザや Client Component から import しないこと。
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

function cleanEnv(value?: string) {
  return (value ?? '').trim().replace(/^['"]|['"]$/g, '')
}

export function createAdminServiceClient() {
  const supabaseUrl = cleanEnv(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceRoleKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL または NEXT_PUBLIC_SUPABASE_URL が未設定です')
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY が未設定です')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}
