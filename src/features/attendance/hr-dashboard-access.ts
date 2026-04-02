import type { AppUser } from '@/types/auth'

/**
 * 出勤・退勤データの明細一覧（テナント全員分）へのアクセス可否。
 * RLS は DB 側の current_employee_app_role 等に依存するため、アプリ側は運用上のゲートとして広めに許可する。
 */
export function canAccessHrAttendanceDashboard(user: AppUser | null): boolean {
  if (!user?.tenant_id) return false

  const ar = user.appRole
  if (ar === 'hr' || ar === 'hr_manager') return true

  // JWT のテナント管理者（employees の app_role 未同期でも /adm に入れるケース）
  if (user.role === 'admin') return true

  // 開発・検証用ロール（管理画面と同様に利用）
  if (ar === 'developer') return true

  return false
}
