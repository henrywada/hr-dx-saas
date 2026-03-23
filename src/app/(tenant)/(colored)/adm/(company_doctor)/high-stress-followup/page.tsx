import { getServerUser } from '@/lib/auth/server-user';
import { redirect } from 'next/navigation';
import { APP_ROUTES } from '@/config/routes';
import { getActivePeriod } from '@/features/stress-check/queries';
import { getHighStressListForDoctor } from '@/features/adm/high-stress-followup/queries';
import { HeartHandshake } from 'lucide-react';
import { HighStressFollowupClient } from './components/HighStressFollowupClient';

export default async function HighStressFollowupPage() {
  const user = await getServerUser();
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN);
  }

  const period = await getActivePeriod();

  if (!period) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <PageHeader />
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <HeartHandshake className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg font-semibold text-gray-600">
            実施中のストレスチェックがありません
          </p>
          <p className="text-sm text-gray-400 mt-2">
            ストレスチェック期間を登録し、実施する必要があります。
          </p>
        </div>
      </div>
    );
  }

  const listItems = await getHighStressListForDoctor(period.id);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
      <PageHeader />
      <HighStressFollowupClient
        periodId={period.id}
        periodTitle={period.title}
        initialList={listItems}
      />
    </div>
  );
}

function PageHeader() {
  return (
    <div className="relative pl-5">
      <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full" />
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
        <HeartHandshake className="w-8 h-8 text-blue-600" />
        高ストレス者フォロー管理
      </h1>
      <p className="text-sm text-gray-500 mt-1 font-medium pl-11">
        第7章準拠｜面接指導・就業措置記録
      </p>
    </div>
  );
}
