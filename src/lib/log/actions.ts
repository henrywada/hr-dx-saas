'use server';

import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth/server-user';
import { headers } from 'next/headers';

interface LogPayload {
  action: string;
  path?: string;
  details?: Record<string, unknown>;
}

/**
 * カスタムのアクセスログ（アクションログ）を記録する Server Action
 * 例: ログイン成功、データのダウンロード、重要な設定変更など
 */
export async function writeAuditLog({ action, path, details }: LogPayload) {
  const supabase = await createClient();
  const user = await getServerUser();

  // Next.jsのheadersから現在のコンテキスト情報を取得
  const headersList = await headers();
  const ip_address = headersList.get('x-forwarded-for') || null;
  const user_agent = headersList.get('user-agent') || null;
  // middlewareと違い、直接refererなどからパスを取ることも可能ですが、明示的にpathを受け取る設計にしています
  const currentPath = path || headersList.get('referer') || '/unknown';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('access_logs' as any).insert({
    action,
    path: currentPath,
    method: 'ACTION',
    ip_address,
    user_agent,
    tenant_id: user?.tenant_id || null,
    user_id: user?.id || null,
    details: details || {},
  });

  if (error) {
    console.error('[Audit Log Error]', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
