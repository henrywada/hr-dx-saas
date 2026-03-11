import { getServerUser } from '@/lib/auth/server-user';
import { redirect } from 'next/navigation';
import { APP_ROUTES } from '@/config/routes';
import { getActiveStressCheckPeriod, getProgressStats } from '@/features/adm/stress-check/queries';
import SummaryCards from '@/features/adm/stress-check/components/SummaryCards';
import DepartmentChart from '@/features/adm/stress-check/components/DepartmentChart';
import ReminderAction from '@/features/adm/stress-check/components/ReminderAction';
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

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

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
          <span>{formatDate(period.startDate)} 〜 {formatDate(period.endDate)}</span>
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
          {period.fiscalYear}年度
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
            各部署の受検済み・未受検人数を表示しています
          </p>
        </div>
        <div className="p-4">
          <DepartmentChart departments={stats.departments} />
        </div>

        {/* 部署別テーブル */}
        {stats.departments.length > 0 && (
          <div className="border-t border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      部署名
                    </th>
                    <th className="px-6 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      受検済み
                    </th>
                    <th className="px-6 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      未受検
                    </th>
                    <th className="px-6 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      受検率
                    </th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider w-48">
                      進捗
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {stats.departments.map((dept) => (
                    <tr key={dept.name} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-gray-800">{dept.name}</td>
                      <td className="px-6 py-3 text-sm text-center text-emerald-600 font-semibold">{dept.submitted}</td>
                      <td className="px-6 py-3 text-sm text-center text-orange-500 font-semibold">{dept.notSubmitted}</td>
                      <td className="px-6 py-3 text-sm text-center font-bold text-gray-800">{dept.rate}%</td>
                      <td className="px-6 py-3">
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                              dept.rate >= 80
                                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                : dept.rate >= 50
                                  ? 'bg-gradient-to-r from-amber-400 to-yellow-400'
                                  : 'bg-gradient-to-r from-red-400 to-orange-400'
                            }`}
                            style={{ width: `${dept.rate}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* リマインドアクション */}
      <ReminderAction />
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
