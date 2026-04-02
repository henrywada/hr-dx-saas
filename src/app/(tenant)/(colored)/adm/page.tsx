import React from 'react';
import { 
  Sparkles, 
  FileText, 
  Briefcase, 
  Activity, 
  AlertTriangle, 
  Lightbulb, 
  ArrowRight,
  TrendingUp,
  LineChart,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { APP_ROUTES } from '@/config/routes';

export default function HrDashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. Header Area */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">💡ダッシュボード</h1>
        <p className="text-sm text-slate-500 mt-2">
          本日のタスクと採用状況のサマリーを確認できます。
        </p>
      </div>

      {/* 2. Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: AI Generation Tickets */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles size={80} className="text-indigo-600" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">利用中</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">AI生成チケット</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-1">
                <h3 className="text-2xl font-bold text-slate-900">8</h3>
                <span className="text-sm font-medium text-slate-500">/ 10回</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-1">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">※今月の残り回数（毎月1日リセット）</p>
            </div>
          </div>
        </div>

        {/* Card 2: Saved Drafts */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <Link href="#" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center transition-colors">
              アーカイブを見る <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">保存済みの求人原稿</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-2xl font-bold text-slate-900">15</h3>
              <span className="text-sm font-medium text-slate-500">件</span>
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
              <span className="flex items-center text-emerald-600 font-medium">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +2
              </span>
              <span>先週比</span>
            </div>
          </div>
        </div>

        {/* Card 3: Active Jobs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Briefcase className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">公開中</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">公開中の求人数</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-2xl font-bold text-slate-900">3</h3>
              <span className="text-sm font-medium text-slate-500">件</span>
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
              <span>エンジニア職、営業職など</span>
            </p>
          </div>
        </div>

        {/* Card 4: Organization Health */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">組織の健康度（平均）</p>
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-slate-900">良好</h3>
              <span className="text-sm font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                B判定
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              概ね安定しています
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Left Column: AI Insights & Alerts */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">AIからの採用インサイト ＆ アラート</h2>
          </div>

          <div className="space-y-4">
            {/* Alert / Task */}
            <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-5 hover:bg-rose-50 transition-colors group">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 text-rose-500 rounded-full shadow-sm shrink-0 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">タスク</span>
                    <span className="text-xs text-rose-400 font-medium">1時間前</span>
                  </div>
                  <p className="text-slate-800 font-medium leading-relaxed">
                    今月の組織度アンケート（Echo）、未回答の従業員が <span className="text-rose-600 font-bold px-1 bg-white rounded border border-rose-100">12名</span> います。
                  </p>
                  <p className="text-sm text-slate-500">回答期限は明日までです。対象者へリマインドを送信しますか？</p>
                  <div className="pt-2">
                    <button type="button" className="text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-lg transition-colors shadow-sm">
                      リマインドメールを作成
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Insight / Suggestion */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 hover:bg-indigo-50 transition-colors group">
              <div className="flex items-start gap-4">
                <div className="bg-white p-2 text-amber-500 rounded-full shadow-sm shrink-0 group-hover:scale-110 transition-transform">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">市場動向</span>
                    <span className="text-xs text-indigo-400 font-medium">本日</span>
                  </div>
                  <p className="text-slate-800 font-medium leading-relaxed">
                    現在、『エンジニア 東京』の採用競合が激化しています。
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    他社の提示給与水準が上昇傾向にあります。AI求人メーカーを使用して、自社の魅力をより強く打ち出すスカウト文に見直してみませんか？
                  </p>
                  <div className="pt-2">
                    <button type="button" className="text-sm font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 px-4 py-2 rounded-lg transition-colors shadow-sm flex items-center">
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      改善案をAIに生成させる
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-bold text-slate-800">クイックアクション</h2>
          </div>

          <div className="flex flex-col gap-3">
            {/* Action 1 */}
            <button type="button" className="w-full relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-left p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group flex items-center justify-between outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-0.5">AI求人・募集文メーカー</h3>
                  <p className="text-indigo-100 text-sm font-medium">新規で求人票やスカウト文を作成する</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all z-10 relative" />
            </button>

            {/* Action 2 */}
            <button type="button" className="w-full bg-white border border-slate-200 hover:border-blue-300 text-left p-5 rounded-xl shadow-sm hover:shadow-md hover:bg-blue-50/30 transition-all group flex items-center justify-between outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 text-blue-600 p-2.5 rounded-lg group-hover:bg-blue-100 group-hover:scale-110 transition-transform duration-300">
                  <LineChart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-slate-800 font-bold mb-0.5 group-hover:text-blue-700 transition-colors">採用市場・競合を分析する</h3>
                  <p className="text-slate-500 text-xs">最新の市況データを確認できます</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </button>

            {/* 出勤・退勤データの明細一覧 */}
            <Link
              href={APP_ROUTES.TENANT.ADMIN_ATTENDANCE_DASHBOARD}
              className="w-full bg-white border border-slate-200 hover:border-slate-300 text-left p-5 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-50/40 transition-all group flex items-center justify-between outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
            >
              <div className="flex items-center gap-4">
                <div className="bg-slate-100 text-slate-700 p-2.5 rounded-lg group-hover:bg-slate-200 group-hover:scale-110 transition-transform duration-300">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-slate-800 font-bold mb-0.5 group-hover:text-slate-900 transition-colors">
                    出勤・退勤データの明細一覧
                  </h3>
                  <p className="text-slate-500 text-xs">残業・アラート・従業員別一覧（人事）</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
            </Link>

            {/* Action 3: マニュアル集 */}
            <Link
              href={APP_ROUTES.TENANT.ADMIN_MANUAL}
              className="w-full bg-white border border-slate-200 hover:border-amber-300 text-left p-5 rounded-xl shadow-sm hover:shadow-md hover:bg-amber-50/30 transition-all group flex items-center justify-between outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
            >
              <div className="flex items-center gap-4">
                <div className="bg-amber-50 text-amber-700 p-2.5 rounded-lg group-hover:bg-amber-100 group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-slate-800 font-bold mb-0.5 group-hover:text-amber-800 transition-colors">マニュアル集</h3>
                  <p className="text-slate-500 text-xs">システムの説明・利用方法等を説明</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </Link>
            
          </div>
        </div>

      </div>
    </div>
  );
}