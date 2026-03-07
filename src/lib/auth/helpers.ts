import { AuthSession } from '@/types/auth';
import { APP_ROUTES } from '@/config/routes';

/**
 * ロールに応じたリダイレクト先を取得（純粋な関数）
 */
export function getRedirectPath(session: AuthSession): string {
  if (session.user.tenant_id) {
    return APP_ROUTES.TENANT.PORTAL;
  }
  return APP_ROUTES.AUTH.LOGIN;
}