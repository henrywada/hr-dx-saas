import { getServerUser } from '@/lib/auth/server-user';
import { redirect } from 'next/navigation';
import { APP_ROUTES } from '@/config/routes';
import { getPeriods, getGovReportSummary } from '@/features/adm/gov-report/queries';
import GovReportClient from './GovReportClient';
import { FileBarChart2 } from 'lucide-react';

export default async function GovReportPage(
  // @ts-ignore
  props: { searchParams: Promise<{ periodId?: string }> }
) {
  const user = await getServerUser();
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN);
  }

  // searchParams から periodId を取得（Next.js の直近仕様に合わせて Promise で受ける）
  const params = await props.searchParams;
  const targetPeriodId = params.periodId;

  // 全期間のリストを取得
  const periods = await getPeriods(user.tenant_id);

  if (!periods || periods.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <PageHeader />
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <FileBarChart2 className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg font-semibold text-gray-600">ストレスチェックの実施履歴がありません</p>
          <p className="text-sm text-gray-400 mt-2">集計対象となるデータが存在しません。</p>
        </div>
      </div>
    );
  }

  // パラメータがなければ一番新しい期間をデフォルトにする
  const selectedPeriodId = targetPeriodId || periods[0].id;
  
  // 選択された期間のサマリーデータを取得
  const summary = await getGovReportSummary(selectedPeriodId);

  if (!summary) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <PageHeader />
        <p className="text-center py-10 text-gray-500">データの取得に失敗しました。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
      {/* ページヘッダー */}
      <PageHeader />

      <GovReportClient 
        periods={periods} 
        selectedPeriodId={selectedPeriodId} 
        summary={summary} 
      />
    </div>
  );
}

/** ページヘッダー */
function PageHeader() {
  return (
    <div className="relative pl-5">
      <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-gradient-to-b from-indigo-500 to-blue-600 rounded-full" />
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
        <FileBarChart2 className="w-8 h-8 text-indigo-600" />
        労基署報告用データ集計
      </h1>
      <p className="text-sm text-gray-500 mt-1 font-medium pl-11">
        心理的な負担の程度を把握するための検査結果等報告書（CSV出力対応）
      </p>
    </div>
  );
}
