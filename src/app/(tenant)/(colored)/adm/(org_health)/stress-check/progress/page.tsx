import { getServerUser } from '@/lib/auth/server-user';
import { redirect } from 'next/navigation';
import { APP_ROUTES } from '@/config/routes';
import { getActiveStressCheckPeriod, getProgressStats } from '@/features/adm/stress-check/queries';
import SummaryCards from '@/features/adm/stress-check/components/SummaryCards';
import DepartmentChart from '@/features/adm/stress-check/components/DepartmentChart';
import DepartmentProgressTree from '@/features/adm/stress-check/components/DepartmentProgressTree';
import ReminderAction from '@/features/adm/stress-check/components/ReminderAction';
import { formatDateInJST } from '@/lib/datetime';
import { ClipboardCheck, Calendar, Activity } from 'lucide-react';

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

  // ストレスチェック進捗管理は全社の受検状況を表示するため、常に全部署を表示
  const visibleDepartments = stats.departments;

  // バーチャート用：従業員がいない部署は非表示
  const chartDepartments = visibleDepartments.filter(
    (d) => d.submitted + d.notSubmitted > 0
  );

  const formatDate = formatDateInJST;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
      {/* ページヘッダー */}
      <PageHeader />

      {/* 実施期間情報 */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 px-6">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-bold text-gray-800">{period.title}</span>
        </div>
        <span className="text-gray-300">|</span>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(period.start_date)} 〜 {formatDate(period.end_date)}</span>
        </div>
        <span className={`
          inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
          ${period.status === 'active'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-gray-100 text-gray-500 border border-gray-200'
          }
        `}>
          {period.status === 'active' ? '● 実施中' : period.status}
        </span>
        <span className="text-xs text-gray-400 ml-auto">
          {period.fiscal_year}年度
        </span>
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

      {/* 部署別進捗グラフ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full" />
            部署別 受検進捗
          </h2>
          <p className="text-xs text-gray-400 mt-1 ml-4">
            各部署の受検済み・未受検人数を表示しています。
            <span className="font-bold text-blue-600">青</span>＝受検済み人数、
            <span className="font-bold text-red-600">赤</span>＝受検率（%）
          </p>
        </div>
        <div className="p-4">
          <DepartmentChart departments={chartDepartments} />
        </div>

        {/* 部署別テーブル（階層表示） */}
        {visibleDepartments.length > 0 && (
          <div className="border-t border-gray-100">
            <DepartmentProgressTree departments={visibleDepartments} />
          </div>
        )}
      </div>

      {/* リマインドアクション */}
      <ReminderAction
        periodId={period.id}
        notSubmittedCount={stats.notSubmittedCount}
      />
    </div>
  );
}

/** ページヘッダー */
function PageHeader() {
  return (
    <div className="relative pl-5">
      <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-gradient-to-b from-blue-500 to-violet-500 rounded-full" />
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
        ストレスチェック進捗管理
      </h1>
      <p className="text-sm text-gray-500 mt-1 font-medium pl-0.5">
        全社の受検状況をリアルタイムで確認
      </p>
    </div>
  );
}
