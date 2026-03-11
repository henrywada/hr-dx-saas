import { getServerUser } from '@/lib/auth/server-user';
import { redirect } from 'next/navigation';
import { APP_ROUTES } from '@/config/routes';
import { getCrossAnalysisData } from '@/features/adm/pulse-stress/queries';
import PulseStressClient from './PulseStressClient';
import { Activity } from 'lucide-react';

export default async function PulseStressPage() {
  const user = await getServerUser();
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN);
  }



  // ストレスチェック × パルスサーベイ(Echo) の結合データを取得
  const data = await getCrossAnalysisData(user.tenant_id);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
      {/* ページヘッダー */}
      <PageHeader />

      <PulseStressClient 
        employees={data.employees}
        departments={data.departments}
        chartData={data.chartData}
        periods={data.periods}
      />
    </div>
  );
}

/** ページヘッダー */
function PageHeader() {
  return (
    <div className="relative pl-5">
      <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-gradient-to-b from-blue-500 to-emerald-400 rounded-full" />
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
        <Activity className="w-8 h-8 text-blue-600" />
        ストレスチェック × Echo クロス分析
      </h1>
      <p className="text-sm text-gray-500 mt-1 font-medium pl-11">
        年1回の健康リスク調査と毎月の組織エンゲージメントによる離職リスク予測
      </p>
    </div>
  );
}
