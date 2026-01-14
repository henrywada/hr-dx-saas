import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  // Service Role Keyが存在しない場合のフォールバック（開発環境用）
  // 注意: 本番環境では必ずSUPABASE_SERVICE_ROLE_KEYを設定してください
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    }
  );
}
