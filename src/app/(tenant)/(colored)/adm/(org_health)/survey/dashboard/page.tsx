import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  MessageSquare,
  Activity,
  Smile,
  Frown,
  Minus,
} from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { SurveyDashboardHelpModalTrigger } from './SurveyDashboardHelpModal'
import ImprovementActionSection from './ImprovementActionSection'
import { getSurveyDashboardData } from '@/features/survey/dashboard-queries'

export default async function PulseSurveyDashboardPage() {
  const data = await getSurveyDashboardData()
  const { kpi, categoryScores, departments, recentComments, periodLabel, hasData } = data

  // AI インサイトテキストを実データから生成
  const lowestCategory = categoryScores.at(-1)
  const highestCategory = categoryScores.at(0)
  const worstDepts = departments.filter(d => d.status === '要注意')
  const insightText = hasData
    ? `今期の総合健康度スコアは ${kpi.overallScore.toFixed(1)} 点（5点満点）です。` +
      (lowestCategory
        ? `カテゴリ別では「${lowestCategory.name}」が ${lowestCategory.score.toFixed(1)} 点と最も低い水準にあります。`
        : '') +
      (worstDepts.length > 0
        ? `${worstDepts.map(d => d.name).join('・')}では要注意状態が検知されており、早急なフォローアップを推奨します。`
        : '現在、要注意部署は検知されていません。') +
      (recentComments.length > 0
        ? `フリーコメント ${recentComments.length} 件を収集しました。下記を確認してください。`
        : '')
    : 'まだ回答データがありません。パルスサーベイの回答が集まると自動でインサイトが生成されます。'

  // コメント内容からポジティブ・ネガティブなカテゴリを推定（高スコア = ポジティブ、低スコア = ネガティブ）
  const positiveThemes = categoryScores.slice(0, 3)
  const negativeThemes = [...categoryScores].reverse().slice(0, 3)

  // scoreChange の符号から前月比アイコンを決定
  const scoreChangeNum = kpi.scoreChange ? parseFloat(kpi.scoreChange) : null
  const ScoreChangeIcon =
    scoreChangeNum === null ? Minus : scoreChangeNum >= 0 ? TrendingUp : TrendingDown
  const scoreChangeColor =
    scoreChangeNum === null
      ? 'text-gray-500'
      : scoreChangeNum >= 0
        ? 'text-emerald-600'
        : 'text-red-500'
  const scoreChangeBg =
    scoreChangeNum === null ? 'bg-gray-50' : scoreChangeNum >= 0 ? 'bg-emerald-50' : 'bg-red-50'

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
            パルスサーベイ組織健康度ダッシュボード
            {periodLabel !== '—' && (
              <span className="text-xl font-medium text-gray-500 ml-2">({periodLabel})</span>
            )}
          </h1>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">
            ストレスチェックの結果を分析の根拠として、全社のコンディションとAIによるフリーコメント分析結果を確認できます。
          </p>
        </div>
        <div className="shrink-0">
          <SurveyDashboardHelpModalTrigger />
        </div>
      </div>

      {/* データなし状態 */}
      {!hasData && (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm mb-10">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">まだ回答データがありません</p>
          <p className="text-gray-400 text-sm mt-1">
            パルスサーベイへの回答が集まると自動でダッシュボードが生成されます
          </p>
        </div>
      )}

      {hasData && (
        <>
          {/* 2. サマリーKPI（上部・横並び） */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* 総合健康度スコア */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-gray-500 font-medium mb-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                総合健康度スコア
              </div>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-4xl font-extrabold text-gray-900">
                  {kpi.overallScore.toFixed(1)}
                </span>
                <span className="text-gray-500 font-medium">/ 5.0</span>
              </div>
              <div className="mt-4 flex items-center text-sm">
                {kpi.scoreChange ? (
                  <>
                    <span
                      className={`flex items-center font-bold px-2 py-1 rounded-md ${scoreChangeColor} ${scoreChangeBg}`}
                    >
                      <ScoreChangeIcon className="h-4 w-4 mr-1" />
                      {kpi.scoreChange}
                    </span>
                    <span className="text-gray-400 ml-2">前月比</span>
                  </>
                ) : (
                  <span className="text-gray-400 text-xs">前期データなし</span>
                )}
              </div>
            </div>

            {/* アンケート回答率 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 text-gray-500 font-medium mb-2">
                <Users className="h-5 w-5 text-blue-500" />
                アンケート回答率
              </div>
              <div className="flex items-baseline gap-3 mt-2">
                <span className="text-4xl font-extrabold text-gray-900">
                  {kpi.responseRate}
                  <span className="text-2xl">%</span>
                </span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{kpi.respondedCount}名 回答済</span>
                  <span>全 {kpi.totalCount}名</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(kpi.responseRate, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 要注意アラート数 */}
            <div className="bg-white rounded-2xl shadow-sm border-t-2 border-t-red-400 border border-gray-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute -right-4 -top-4 bg-red-50 w-24 h-24 rounded-full opacity-50 pointer-events-none" />
              <div className="flex items-center gap-2 text-red-600 font-bold mb-2 relative z-10">
                <AlertTriangle className="h-5 w-5" />
                要注意アラート数
              </div>
              <div className="flex items-baseline gap-2 mt-2 relative z-10">
                <span className="text-4xl font-extrabold text-red-600">{kpi.alertCount}</span>
                <span className="text-red-400 font-medium">件</span>
              </div>
              <p className="mt-4 text-sm text-gray-500 relative z-10">
                {kpi.alertCount > 0
                  ? 'スコアが低水準の部署を検知しています。'
                  : '現在、要注意状態の部署はありません。'}
              </p>
            </div>
          </div>

          {/* 3. メイン分析エリア（2カラムレイアウト） */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* 左側：フリーコメント分析 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col text-sm sm:text-base">
              <div className="bg-linear-to-r from-indigo-600 to-violet-600 p-5 text-white flex items-center gap-3">
                <MessageSquare className="h-6 w-6 text-indigo-200" />
                <h2 className="text-lg font-bold">フリーコメント分析</h2>
                <Badge
                  variant="teal"
                  className="ml-auto bg-white/20 text-white border-none backdrop-blur-sm"
                >
                  {recentComments.length}件
                </Badge>
              </div>

              <div className="p-6 grow space-y-6">
                {/* インサイトサマリー */}
                <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-5 relative">
                  <div className="absolute -left-3 -top-3 bg-white border border-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center shadow-sm">
                    <Sparkles size={16} />
                  </div>
                  <h3 className="font-bold text-indigo-900 mb-2">今期のサマリー</h3>
                  <p className="text-gray-700 leading-relaxed text-sm">{insightText}</p>
                </div>

                {/* カテゴリスコア由来のポジティブ・ネガティブテーマ */}
                {categoryScores.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                      <div className="flex items-center gap-2 text-green-700 font-bold mb-2">
                        <Smile size={18} /> 高スコアカテゴリ
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {positiveThemes.map(cat => (
                          <span
                            key={cat.name}
                            className="bg-white text-green-700 px-2 py-1 text-xs rounded border border-green-200 shadow-sm"
                          >
                            {cat.name} {cat.score.toFixed(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                      <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                        <Frown size={18} /> 低スコアカテゴリ
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {negativeThemes.map(cat => (
                          <span
                            key={cat.name}
                            className="bg-white text-red-700 px-2 py-1 text-xs rounded border border-red-200 shadow-sm"
                          >
                            {cat.name} {cat.score.toFixed(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 実際のコメント一覧（最大5件プレビュー） */}
                {recentComments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">
                      最新コメント（{recentComments.length}件中 最大5件表示）
                    </p>
                    <ul className="space-y-2">
                      {recentComments.slice(0, 5).map((c, i) => (
                        <li
                          key={i}
                          className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 leading-relaxed line-clamp-2"
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {recentComments.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">
                    今期のフリーコメントはまだありません
                  </p>
                )}
              </div>
            </div>

            {/* 右側：カテゴリ別スコア */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-100 flex items-center gap-3">
                <svg
                  className="h-6 w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <h2 className="text-lg font-bold text-gray-800">カテゴリ別スコア</h2>
                {highestCategory && (
                  <span className="ml-auto text-xs text-gray-400">
                    最高: {highestCategory.name} {highestCategory.score.toFixed(1)}
                  </span>
                )}
              </div>

              <div className="p-6 grow flex flex-col justify-center space-y-6">
                {categoryScores.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center">カテゴリデータがありません</p>
                ) : (
                  categoryScores.map((cat, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="font-semibold text-gray-700">{cat.name}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-gray-900">
                            {cat.score.toFixed(1)}
                          </span>
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
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 4. 部署別コンディション一覧 */}
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
                  {departments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">
                        部署データがありません
                      </td>
                    </tr>
                  ) : (
                    departments.map(dept => (
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
                                style={{ width: `${Math.min(dept.responseRate, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`font-bold ${dept.score < 3.0 ? 'text-red-600' : 'text-gray-900'}`}
                          >
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 5. AI 改善テーマ候補 ＋ PDCA ボード */}
      <div className="mt-12">
        <ImprovementActionSection />
      </div>
    </div>
  )
}
