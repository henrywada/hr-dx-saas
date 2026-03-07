import React from 'react';
import { Sparkles, TrendingUp, Users, AlertTriangle, MessageSquare, ArrowRight, Activity, Smile, Frown } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';

// === モックデータ ===
const kpiData = {
  overallScore: 3.8,
  scoreChange: '+0.2',
  responseRate: 85,
  respondedCount: 120,
  totalCount: 142,
  alertCount: 2,
};

const categoryScores = [
  { name: '仕事のやりがい', score: 4.1, max: 5.0, color: 'bg-indigo-500' },
  { name: '職場環境', score: 3.5, max: 5.0, color: 'bg-emerald-500' },
  { name: '人間関係', score: 3.9, max: 5.0, color: 'bg-blue-500' },
  { name: '会社への共感', score: 3.2, max: 5.0, color: 'bg-amber-500' },
];

const departmentData = [
  { id: 1, name: '開発部', responseRate: 92, score: 4.2, status: '良好' },
  { id: 2, name: '人事総務部', responseRate: 88, score: 4.0, status: '良好' },
  { id: 3, name: '経営企画室', responseRate: 100, score: 3.8, status: '安定' },
  { id: 4, name: '営業部', responseRate: 81, score: 3.4, status: '安定' },
  { id: 5, name: 'カスタマーサポート部', responseRate: 75, score: 2.8, status: '要注意' },
  { id: 6, name: 'マーケティング部', responseRate: 65, score: 2.9, status: '要注意' },
];

export default function PulseSurveyDashboardPage() {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. ページヘッダー */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <Activity className="h-5 w-5" />
            <span className="font-semibold text-sm tracking-widest uppercase">Pulse Survey</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            組織健康度ダッシュボード <span className="text-xl font-medium text-gray-500 ml-2">(2026年2月度)</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">
            全社のコンディションと、AIによるフリーコメント分析結果を確認できます。
          </p>
        </div>
        <button className="bg-white border-2 border-indigo-100 text-indigo-700 hover:bg-indigo-50 font-semibold py-2 px-4 rounded-lg flex items-center justify-center transition-colors shadow-sm">
          詳細レポートを出力 <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </div>

      {/* 2. サマリーKPI（上部・横並び） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* 総合健康度スコア */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-gray-500 font-medium">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              総合健康度スコア
            </div>
          </div>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-4xl font-extrabold text-gray-900">{kpiData.overallScore}</span>
            <span className="text-gray-500 font-medium">/ 5.0</span>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="flex items-center text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-md">
              <TrendingUp className="h-4 w-4 mr-1" />
              {kpiData.scoreChange}
            </span>
            <span className="text-gray-400 ml-2">前月比</span>
          </div>
        </div>

        {/* アンケート回答率 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-gray-500 font-medium">
              <Users className="h-5 w-5 text-blue-500" />
              アンケート回答率
            </div>
          </div>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-4xl font-extrabold text-gray-900">{kpiData.responseRate}<span className="text-2xl">%</span></span>
          </div>
          {/* 簡易プログレスバー */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{kpiData.respondedCount}名 回答済</span>
              <span>全 {kpiData.totalCount}名</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${kpiData.responseRate}%` }}></div>
            </div>
          </div>
        </div>

        {/* 要注意アラート数 */}
        <div className="bg-white rounded-2xl shadow-sm border-l-4 border-l-red-500 border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute -right-4 -top-4 bg-red-50 w-24 h-24 rounded-full opacity-50 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="flex items-center gap-2 text-red-600 font-bold">
              <AlertTriangle className="h-5 w-5" />
              要注意アラート数
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2 relative z-10">
            <span className="text-4xl font-extrabold text-red-600">{kpiData.alertCount}</span>
            <span className="text-red-400 font-medium">件</span>
          </div>
          <p className="mt-4 text-sm text-gray-500 relative z-10">
            スコア急落やネガティブ傾向が強い部署を検知しています。
          </p>
        </div>
      </div>

      {/* 3. メイン分析エリア（2カラムレイアウト） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        
        {/* 左側：AIフリーコメント感情分析 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col text-sm sm:text-base">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-indigo-200" />
            <h2 className="text-lg font-bold">AI フリーコメント感情分析</h2>
            <Badge variant="teal" className="ml-auto bg-white/20 text-white border-none backdrop-blur-sm">AI Analyzed</Badge>
          </div>
          
          <div className="p-6 flex-grow space-y-6">
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-5 relative">
              <div className="absolute -left-3 -top-3 bg-white border border-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                <Sparkles size={16} />
              </div>
              <h3 className="font-bold text-indigo-900 mb-2 flex items-center">
                TalentDraft AI のインサイト
              </h3>
              <p className="text-gray-700 leading-relaxed">
                全体的に<strong>『新しい評価制度』に対するポジティブな声</strong>が多い一方、営業部から<strong>『月末の事務作業の負担』に関するネガティブなコメントが急増</strong>しています。<br/><br/>
                また、カスタマーサポート部にて「人員不足による残業時間の増加」を懸念する声が複数検知されました。業務フローの見直しと、該当部署のヒアリングを推奨します。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <div className="flex items-center gap-2 text-green-700 font-bold mb-2">
                  <Smile size={18} /> 主なポジティブ用語
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-white text-green-700 px-2 py-1 text-xs rounded border border-green-200 shadow-sm">評価制度</span>
                  <span className="bg-white text-green-700 px-2 py-1 text-xs rounded border border-green-200 shadow-sm">リモートワーク</span>
                  <span className="bg-white text-green-700 px-2 py-1 text-xs rounded border border-green-200 shadow-sm">チームワーク</span>
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                  <Frown size={18} /> 主なネガティブ用語
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-white text-red-700 px-2 py-1 text-xs rounded border border-red-200 shadow-sm">事務作業</span>
                  <span className="bg-white text-red-700 px-2 py-1 text-xs rounded border border-red-200 shadow-sm">残業時間</span>
                  <span className="bg-white text-red-700 px-2 py-1 text-xs rounded border border-red-200 shadow-sm">人員不足</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右側：カテゴリ別スコア */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center gap-3">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className="text-lg font-bold text-gray-800">カテゴリ別スコア</h2>
          </div>
          
          <div className="p-6 flex-grow flex flex-col justify-center space-y-6">
            {categoryScores.map((cat, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="font-semibold text-gray-700">{cat.name}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-gray-900">{cat.score}</span>
                    <span className="text-xs font-medium text-gray-400">/ {cat.max}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200/50">
                  <div 
                    className={`h-full rounded-full ${cat.color} transition-all duration-1000 ease-out`}
                    style={{ width: `${(cat.score / cat.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. 部署別コンディション一覧（下部） */}
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-gray-500" />
        部署別コンディション一覧
      </h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-sm sm:text-base">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm font-semibold">
                <th className="px-6 py-4 whitespace-nowrap">部署名</th>
                <th className="px-6 py-4 whitespace-nowrap">回答率</th>
                <th className="px-6 py-4 whitespace-nowrap">総合スコア</th>
                <th className="px-6 py-4 whitespace-nowrap">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departmentData.map((dept) => (
                <tr key={dept.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                    {dept.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="w-10 text-right">{dept.responseRate}%</span>
                      <div className="w-16 sm:w-24 bg-gray-100 rounded-full h-1.5 hidden sm:block">
                        <div 
                          className={`h-1.5 rounded-full ${dept.responseRate < 80 ? 'bg-amber-400' : 'bg-blue-500'}`} 
                          style={{ width: `${dept.responseRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-bold ${dept.score < 3.0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {dept.score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {dept.status === '良好' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {dept.status}
                      </span>
                    )}
                    {dept.status === '安定' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        {dept.status}
                      </span>
                    )}
                    {dept.status === '要注意' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 animate-pulse">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {dept.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
