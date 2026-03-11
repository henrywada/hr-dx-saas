// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

export const createAdminClient = () => {
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const rawServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  // 1. 全ての空白、引用符、制御文字、不可視文字を排除
  // Base64 文字列に不可欠な「+」や「/」を消さないように修正しました。
  const serviceRoleKey = rawServiceRoleKey.replace(/[^a-zA-Z0-9._/+-=]/g, '');

  console.log('[DEBUG] Supabase Admin Init');
  console.log('URL:', supabaseUrl);
  console.log(`Raw Length: ${rawServiceRoleKey.length}`);
  console.log(`Cleaned Length: ${serviceRoleKey.length}`);
  
  if (serviceRoleKey.length < 150) {
      console.error('CRITICAL: Service Role Key is suspiciously short!');
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};



