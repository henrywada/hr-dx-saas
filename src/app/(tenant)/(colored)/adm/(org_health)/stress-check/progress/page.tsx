import { getServerUser } from '@/lib/auth/server-user';
import { redirect } from 'next/navigation';
import { APP_ROUTES } from '@/config/routes';
import { getActiveStressCheckPeriod, getProgressStats } from '@/features/adm/stress-check/queries';
import { listDivisionEstablishments } from '@/features/adm/division-establishments/queries';
import SummaryCards from '@/features/adm/stress-check/components/SummaryCards';
import DepartmentChart from '@/features/adm/stress-check/components/DepartmentChart';
import EstablishmentProgressTable from '@/features/adm/stress-check/components/EstablishmentProgressTable';
import ReminderAction from '@/features/adm/stress-check/components/ReminderAction';
import { ClipboardCheck, Building2 } from 'lucide-react';
import Link from 'next/link';
import type { DepartmentStat, EstablishmentProgressTableRow } from '@/features/adm/stress-check/types';

export default async function StressCheckProgressPage() {
  const user = await getServerUser();
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN);
  }

  // 1. アクティブ実施期間の取得
  const period = await getActiveStressCheckPeriod(user.tenant_id);

  // 期間が存在しない場合
  if (!period) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <PageHeader />
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <ClipboardCheck className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg font-semibold text-gray-600">実施中のストレスチェックがありません</p>
          <p className="text-sm text-gray-400 mt-2">ストレスチェック期間を登録してください。</p>
        </div>
      </div>
    );
  }

  // 2. 進捗統計の取得
  const stats = await getProgressStats(user.tenant_id, period.id);

  const establishments = stats.establishments ?? [];

  const { establishments: divisionEstablishmentRows } = await listDivisionEstablishments(user.tenant_id);
  const periodByEstablishmentId = new Map(
    divisionEstablishmentRows.map((row) => [row.id, row.stress_check_period_list]),
  );

  const establishmentTableRows: EstablishmentProgressTableRow[] = establishments.map((est) => ({
    ...est,
    stressCheckPeriod:
      est.id === 'unassigned' ? null : periodByEstablishmentId.get(est.id) ?? null,
  }));

  const chartEstablishments: DepartmentStat[] = establishments
    .filter((d) => d.submitted + d.notSubmitted > 0)
    .map((d) => ({
      id: d.id,
      parent_id: null,
      name: d.name,
      submitted: d.submitted,
      notSubmitted: d.notSubmitted,
      inProgress: d.inProgress,
      rate: d.rate,
    }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
      {/* ページヘッダー */}
      <PageHeader />

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href={APP_ROUTES.TENANT.ADMIN_STRESS_CHECK_GROUP_ANALYSIS} className="text-blue-600 hover:underline font-medium">
          集団分析ダッシュボード
        </Link>
        <span className="text-gray-300">|</span>
        <Link href={APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS} className="text-blue-600 hover:underline font-medium">
          拠点（事業場）設定
        </Link>
      </div>

      {/* サマリーカード */}
      <SummaryCards
        totalEmployees={stats.totalEmployees}
        submittedCount={stats.submittedCount}
        notSubmittedCount={stats.notSubmittedCount}
        consentCount={stats.consentCount}
        submissionRate={stats.submissionRate}
        consentRate={stats.consentRate}
      />

      {/* 拠点別進捗 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-linear-to-b from-teal-500 to-emerald-600 rounded-full" />
            拠点別 受検進捗
          </h2>
          <Link href={APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS} className="text-xs text-blue-600 hover:underline">
            拠点マスタを編集
          </Link>
        </div>
        {establishments.length > 0 ? (
          <>
            <div className="px-6 pt-4 text-xs text-gray-400">
              <code className="font-mono text-[11px] text-gray-500">/adm/establishments</code> で登録した拠点単位で、対象者・受検済み・未受検・否提出を確認できます。
              <span className="font-bold text-blue-600">青</span>＝受検済み人数、
              <span className="font-bold text-red-600">赤</span>＝受検率（%）
            </div>
            <div className="p-4">
              <DepartmentChart departments={chartEstablishments} />
            </div>
            <div className="border-t border-gray-100">
              <EstablishmentProgressTable periodId={period.id} rows={establishmentTableRows} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="bg-teal-50 p-4 rounded-full mb-4">
              <Building2 className="w-8 h-8 text-teal-500" />
            </div>
            <p className="text-base font-semibold text-gray-700">拠点が未登録です</p>
            <p className="text-sm text-gray-400 mt-2">
              拠点マスタを登録すると、拠点単位で進捗を確認できます。
            </p>
            <Link
              href={APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS}
              className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              拠点マスタを登録
            </Link>
          </div>
        )}
      </div>

      {/* リマインドアクション */}
      <ReminderAction
        periodId={period.id}
        notSubmittedCount={stats.notSubmittedCount}
        establishmentOptions={establishments.map((e) => ({
          id: e.id,
          name: e.name,
          notSubmittedCount: e.notSubmitted,
        }))}
      />
    </div>
  );
}

/** ページヘッダー */
function PageHeader() {
  return (
    <div className="relative pl-5">
      <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-linear-to-b from-blue-500 to-violet-500 rounded-full" />
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
        ストレスチェック進捗管理
      </h1>
      <p className="text-sm text-gray-500 mt-1 font-medium pl-0.5">
        拠点ごとの受検状況をリアルタイムで確認
      </p>
    </div>
  );
}
