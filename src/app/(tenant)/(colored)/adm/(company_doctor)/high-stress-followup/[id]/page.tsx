import { getServerUser } from '@/lib/auth/server-user';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { APP_ROUTES } from '@/config/routes';
import { getActivePeriod } from '@/features/stress-check/queries';
import { getHighStressItemForDoctor } from '@/features/adm/high-stress-followup/queries';
import { ArrowLeft } from 'lucide-react';
import { DetailPaneClient } from '../components/DetailPaneClient';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * 個別詳細画面（任意）
 * /adm/high-stress-followup/[id] で対象者ID（stressResultId または A-XXX）を指定
 */
export default async function HighStressDetailPage({ params }: Props) {
  const user = await getServerUser();
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN);
  }

  const { id } = await params;
  const period = await getActivePeriod();

  if (!period) {
    redirect(APP_ROUTES.TENANT.ADMIN_HIGH_STRESS_FOLLOWUP);
  }

  const item = await getHighStressItemForDoctor(period.id, id);

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
      <div className="flex items-center gap-4">
        <Link
          href={APP_ROUTES.TENANT.ADMIN_HIGH_STRESS_FOLLOWUP}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          一覧に戻る
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <DetailPaneClient
          item={item}
          periodId={period.id}
        />
      </div>
    </div>
  );
}
