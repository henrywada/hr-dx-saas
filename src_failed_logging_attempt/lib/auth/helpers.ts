import { AuthSession } from '@/types/auth';

/**
 * ロールに応じたリダイレクト先を取得（純粋な関数）
 */
export function getRedirectPath(session: AuthSession): string {
  if (session.user.id === 'e97488f9-02be-4b0b-9dc9-ddb0c2902999') {
    return '/system-master';
  }
  if (session.user.tenant_id) {
    return `/${session.user.tenant_id}/top`;
  }
  return '/login';
}