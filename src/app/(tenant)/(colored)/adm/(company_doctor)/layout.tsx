import { getServerUser } from '@/lib/auth/server-user';
import { redirect } from 'next/navigation';
import { APP_ROUTES } from '@/config/routes';
import { CompanyDoctorHeader } from './CompanyDoctorHeader';

/**
 * 産業医・保健師専用レイアウト
 * company_doctor / company_nurse 以外は /adm へリダイレクト
 */
export default async function CompanyDoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();

  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN);
  }

  const isDoctorOrNurse =
    user.appRole === 'company_doctor' || user.appRole === 'company_nurse';

  // 開発・テスト用: ENABLE_HIGH_STRESS_FOLLOWUP_PREVIEW=true で任意ロールからアクセス可能
  const allowPreview =
    process.env.ENABLE_HIGH_STRESS_FOLLOWUP_PREVIEW === 'true';

  if (!isDoctorOrNurse && !allowPreview) {
    redirect(APP_ROUTES.TENANT.ADMIN);
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <CompanyDoctorHeader />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
