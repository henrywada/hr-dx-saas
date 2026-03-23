import { AuthSession } from '@/types/auth';
import { APP_ROUTES } from '@/config/routes';

/**
 * ロールに応じたリダイレクト先を取得（純粋な関数）
 * app_role='company_doctor' の場合は /adm へ遷移
 */
export function getRedirectPath(session: AuthSession): string {
  if (!session.user.tenant_id) {
    return APP_ROUTES.AUTH.LOGIN;
  }
  if (session.user.appRole === 'company_doctor') {
    return APP_ROUTES.TENANT.ADMIN;
  }
  return APP_ROUTES.TENANT.PORTAL;
}