import { getServerUser } from '@/lib/auth/server-user';
import { redirect } from 'next/navigation';
import { APP_ROUTES } from '@/config/routes';
import { getActiveStressCheckPeriod, getGroupAnalysisData } from '@/features/adm/stress-check/queries';
import GroupSummaryCards from '@/features/adm/stress-check/components/GroupSummaryCards';
import GroupRadarChart from '@/features/adm/stress-check/components/GroupRadarChart';
import GroupAnalysisHeatMap from '@/features/adm/stress-check/components/GroupAnalysisHeatMap';
import { BarChart3, Calendar, Activity, ShieldAlert } from 'lucide-react';

export default async function GroupAnalysisPage() {
  const user = await getServerUser();
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN);
  }

  // 1. アクティブ（または直近）の実施期間を取得
  const period = await getActiveStressCheckPeriod(user.tenant_id);

  if (!period) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <PageHeader />
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg font-semibold text-gray-600">分析対象のストレスチェックがありません</p>
          <p className="text-sm text-gray-400 mt-2">ストレスチェック期間を登録し、受検データを収集してください。</p>
        </div>
      </div>
    );
  }

  // 2. 集団分析データの取得
  const { departments, summary } = await getGroupAnalysisData(user.tenant_id, period.id);

  // 日付フォーマット
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

  const visibleDepts = departments.filter((d) => !d.isMasked);
  const maskedDepts = departments.filter((d) => d.isMasked);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
      {/* ページヘッダー */}
      <PageHeader />

      {/* 実施期間情報 */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 px-6">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-500" />
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
        <span className="text-xs text-gray-400 ml-auto">{period.fiscalYear}年度</span>
      </div>

      {/* プライバシー保護アラート */}
      {summary.maskedDepartmentCount > 0 && (
        <div className="flex items-start gap-3 bg-amber-50/70 border border-amber-200 rounded-2xl p-4 px-5">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">プライバシー保護について</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              ※法令に基づき、回答者が10名未満の部署は個人の特定を防ぐため単体での結果を非表示とし、「その他（10名未満の部署合算）」として統合して表示しています。
            </p>
          </div>
        </div>
      )}

      {/* サマリーカード */}
      <GroupSummaryCards summary={summary} />

      {/* レーダーチャート */}
      {visibleDepts.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full" />
              組織比較レーダーチャート
            </h2>
            <p className="text-xs text-gray-400 mt-1 ml-4">
              全社平均と選択した部署のスコアを重ねて表示し、弱点や強みを比較します
            </p>
          </div>
          <div className="p-4 md:p-6">
            <GroupRadarChart departments={departments} summary={summary} />
          </div>
        </div>
      )}

      {/* 部署別ストレス・ヒートマップ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full" />
            部署別ストレス・ヒートマップ
          </h2>
          <p className="text-xs text-gray-400 mt-1 ml-4">
            「仕事の量」が高い、または「支援」が低いセルを直感的にリスクとして可視化しています（赤色がリスク高）
          </p>
        </div>
        <GroupAnalysisHeatMap departments={departments} />
      </div>

      {/* マスキング対象部署一覧（ある場合のみ） */}
      {maskedDepts.length > 0 && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-gray-500" />
            <p className="text-sm font-bold text-gray-600">合算対象部署（回答者10名未満）</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {maskedDepts.map((dept) => (
              <span
                key={dept.departmentName}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs text-gray-500"
              >
                {dept.departmentName}
                <span className="text-gray-400">（{dept.respondentCount}名）</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** ページヘッダー */
function PageHeader() {
  return (
    <div className="relative pl-5">
      <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full" />
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
        集団分析（組織健康度分析）
      </h1>
      <p className="text-sm text-gray-500 mt-1 font-medium pl-0.5">
        厚労省推奨基準に基づく部署別ストレス状況の可視化
      </p>
    </div>
  );
}

