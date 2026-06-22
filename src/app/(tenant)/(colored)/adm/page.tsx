import React from 'react'
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
  Zap,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'

export default function HrDashboardPage() {
  return (
    <div className="space-y-4 w-full px-4 sm:px-6 py-6 mx-auto max-w-[1200px]">
      {/* 1. Header Area */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#161b22] tracking-tight">
          💡管理ダッシュボード
        </h1>
        <p className="text-sm text-[#57606a] mt-2">
          本日のタスクと採用状況のサマリーを確認できます。
        </p>
      </div>

      {/* 2. Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: AI Generation Tickets */}
        <div className="bg-white rounded-xl border border-[#e2e6ec] p-5 shadow-none transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Sparkles size={80} className="text-[#FD7601]" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-[#fff3e6] text-[#FD7601] rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#fff3e6] text-[#FD7601]">
              利用中
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-[#57606a] mb-1">AI生成チケット</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-1">
                <h3 className="text-2xl font-bold font-mono text-[#161b22]">8</h3>
                <span className="text-sm font-medium text-[#57606a]">/ 10回</span>
              </div>
              <div className="w-full bg-[#f6f8fa] rounded-full h-2 mt-1">
                <div className="bg-[#FD7601] h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
              <p className="text-[10px] text-[#57606a] mt-1">※今月の残り回数（毎月1日リセット）</p>
            </div>
          </div>
        </div>

        {/* Card 2: Saved Drafts */}
        <div className="bg-white rounded-xl border border-[#e2e6ec] p-5 shadow-none transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <Link
              href="#"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center transition-colors"
            >
              アーカイブを見る <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div>
            <p className="text-sm font-medium text-[#57606a] mb-1">保存済みの求人原稿</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-2xl font-bold font-mono text-[#161b22]">15</h3>
              <span className="text-sm font-medium text-[#57606a]">件</span>
            </div>
            <div className="flex items-center gap-1.5 mt-3 text-xs text-[#57606a]">
              <span className="flex items-center text-emerald-600 font-medium">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +2
              </span>
              <span>先週比</span>
            </div>
          </div>
        </div>

        {/* Card 3: Active Jobs */}
        <div className="bg-white rounded-xl border border-[#e2e6ec] p-5 shadow-none transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-[#f6f8fa] text-[#FD7601] rounded-lg">
              <Briefcase className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#e8f0fe] text-[#1a56db]">
              公開中
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-[#57606a] mb-1">公開中の求人数</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-2xl font-bold font-mono text-[#161b22]">3</h3>
              <span className="text-sm font-medium text-[#57606a]">件</span>
            </div>
            <p className="text-xs text-[#57606a] mt-3 flex items-center gap-1">
              <span>エンジニア職、営業職など</span>
            </p>
          </div>
        </div>

        {/* Card 4: Organization Health */}
        <div className="bg-white rounded-xl border border-[#e2e6ec] p-5 shadow-none transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-[#57606a] mb-1">組織の健康度（平均）</p>
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold font-mono text-[#161b22]">良好</h3>
              <span className="text-sm font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                B判定
              </span>
            </div>
            <p className="text-xs text-[#57606a] mt-3 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              概ね安定しています
            </p>
          </div>
        </div>
      </div>

      {/* 3. Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: AI Insights & Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b border-[#ebebeb] flex items-center gap-3 bg-slate-50/50">
            <div className="p-2 bg-[#fff3e6] text-[#FD7601] rounded-lg shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-800">AIからの採用インサイト ＆ アラート</h3>
          </div>

          <ul className="divide-y divide-[#ebebeb]">
            {/* Alert / Task */}
            <li className="group hover:bg-slate-50/80 transition-colors">
              <div className="flex items-start gap-4 py-2.5 px-5 sm:px-6 outline-none focus:bg-slate-50">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-lg shadow-inner shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                      タスク
                    </span>
                    <span className="text-xs text-[#57606a] font-medium">1時間前</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 leading-relaxed">
                    今月の組織度アンケート（Echo）、未回答の従業員が{' '}
                    <span className="text-rose-600 font-bold">12名</span> います。
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    回答期限は明日までです。対象者へリマインドを送信しますか？
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      className="text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded transition-colors shadow-sm"
                    >
                      リマインドメールを作成
                    </button>
                  </div>
                </div>
              </div>
            </li>

            {/* Insight / Suggestion */}
            <li className="group hover:bg-slate-50/80 transition-colors">
              <div className="flex items-start gap-4 p-5 sm:px-6 outline-none focus:bg-slate-50">
                <div className="p-2 bg-[#fff3e6] text-[#FD7601] rounded-lg shadow-inner shrink-0">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#FD7601] bg-[#fff3e6] px-2.5 py-0.5 rounded-full">
                      市場動向
                    </span>
                    <span className="text-xs text-[#57606a] font-medium">本日</span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 leading-relaxed">
                    現在、『エンジニア 東京』の採用競合が激化しています。
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    他社の提示給与水準が上昇傾向にあります。AI求人メーカーを使用して、自社の魅力をより強く打ち出すスカウト文に見直してみませんか？
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      className="text-xs font-bold text-[#FD7601] bg-white border border-[#e2e6ec] hover:bg-[#fff3e6] px-3 py-1.5 rounded transition-colors shadow-sm flex items-center"
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      改善案をAIに生成させる
                    </button>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>

        {/* Right Column: Quick Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-6 py-5 border-b border-[#ebebeb] flex items-center gap-3 bg-slate-50/50">
            <div className="p-2 bg-[#fff3e6] text-[#FD7601] rounded-lg shadow-inner">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-800">クイックアクション</h3>
          </div>

          <ul className="divide-y divide-[#ebebeb]">
            {/* Action 1: AI求人・募集文メーカー */}
            <li className="group hover:bg-slate-50/80 transition-colors">
              <div className="flex items-start gap-4 p-5 sm:px-6 outline-none focus:bg-slate-50">
                <div className="p-2 bg-[#FD7601] text-white rounded-lg shadow-inner shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-blue-600! group-hover:text-blue-700! transition-colors">
                      AI求人・募集文メーカー
                    </h3>
                    <ExternalLink className="w-4 h-4 text-blue-600 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-600">新規で求人票やスカウト文を作成する</p>
                </div>
              </div>
            </li>

            {/* Action 2: 採用市場・競合を分析する */}
            <li className="group hover:bg-slate-50/80 transition-colors">
              <button
                type="button"
                className="w-full text-left flex items-start gap-4 p-5 sm:px-6 outline-none focus:bg-slate-50"
              >
                <div className="p-2 bg-[#fff3e6] text-[#FD7601] rounded-lg shadow-inner shrink-0">
                  <LineChart className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-blue-600! group-hover:text-blue-700! transition-colors">
                      採用市場・競合を分析する
                    </h3>
                    <ExternalLink className="w-4 h-4 text-blue-600 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-600">最新の市況データを確認できます</p>
                </div>
              </button>
            </li>

            {/* Action 3: 出勤・退勤データの明細一覧 */}
            <li className="group hover:bg-slate-50/80 transition-colors">
              <Link
                href={APP_ROUTES.TENANT.ADMIN_ATTENDANCE_DASHBOARD}
                className="flex items-start gap-4 p-5 sm:px-6 outline-none focus:bg-slate-50"
              >
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg shadow-inner shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-blue-600! group-hover:text-blue-700! transition-colors">
                      出勤・退勤データの明細一覧
                    </h3>
                    <ExternalLink className="w-4 h-4 text-blue-600 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-600">残業・アラート・従業員別一覧（人事）</p>
                </div>
              </Link>
            </li>

            {/* Action 4: マニュアル集 */}
            <li className="group hover:bg-slate-50/80 transition-colors">
              <Link
                href={APP_ROUTES.TENANT.ADMIN_MANUAL}
                className="flex items-start gap-4 p-5 sm:px-6 outline-none focus:bg-slate-50"
              >
                <div className="p-2 bg-amber-50 text-amber-700 rounded-lg shadow-inner shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-blue-600! group-hover:text-blue-700! transition-colors">
                      マニュアル集
                    </h3>
                    <ExternalLink className="w-4 h-4 text-blue-600 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-600">システムの説明・利用方法等を説明</p>
                </div>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
