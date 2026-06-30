'use client';

import { 
  PulseStressEmployeeData, 
  PulseStressDepartmentData, 
  PulseStressChartData,
  ConditionDailyTrendPoint,
  ConditionStressDepartmentData,
  ConditionStressAlertEmployee,
} from '@/features/adm/pulse-stress/queries';
import { 
  ResponsiveContainer, ComposedChart, ScatterChart, Scatter,
  Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ZAxis
} from 'recharts';
import { AlertCircle, UserMinus, Activity as ActivityIcon, Info, Heart } from 'lucide-react';

interface Props {
  employees: PulseStressEmployeeData[];
  departments: PulseStressDepartmentData[];
  chartData: PulseStressChartData[];
  periods: string[];
  conditionDailyTrend: ConditionDailyTrendPoint[];
  conditionStressDepartments: ConditionStressDepartmentData[];
  conditionStressAlerts: ConditionStressAlertEmployee[];
}

export default function PulseStressClient({
  employees,
  departments,
  chartData,
  periods,
  conditionDailyTrend,
  conditionStressDepartments,
  conditionStressAlerts,
}: Props) {
  // 離職予備軍（High Level）のフィルタ
  const highRiskEmployees = employees.filter(e => e.warningLevel === 'high');
  const highConditionStressAlerts = conditionStressAlerts.filter(a => a.warningLevel === 'high');

  const conditionChartData = conditionDailyTrend.map(point => ({
    date: point.checkin_date.slice(5).replace('-', '/'),
    avgCondition: point.avg_score,
    respondentCount: point.respondent_count,
  }));

  const conditionScatterData = conditionStressDepartments.filter(
    d => d.avgConditionScore !== null
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. 「点・線・面」のクロス分析グラフ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full" />
              全社タイムライン（点・線・面分析）
            </h2>
            <p className="text-xs text-gray-400 mt-1 ml-4">
              [面] ストレスチェック健康リスク / [線] Echoエンゲージメントスコア推移
            </p>
          </div>
          <div className="p-4 md:p-6 flex-1 min-h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tick={{ fill: '#9ca3af', fontSize: 12 }} tickLine={false} axisLine={false} />
                  
                  {/* 左軸：Echoスコア（1〜5） */}
                  <YAxis 
                    yAxisId="left" 
                    domain={[1, 5]} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                    axisLine={false} 
                    tickLine={false} 
                    label={{ value: 'Echo', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 }}
                  />
                  {/* 右軸：健康リスク（全国平均100、下へいくほど良い=逆転） */}
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    domain={[80, 140]} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                    axisLine={false} 
                    tickLine={false} 
                    label={{ value: '健康リスク', angle: 90, position: 'insideRight', fill: '#9ca3af', fontSize: 12 }}
                  />
                  
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />

                  {/* 面（Area）: 健康リスク */}
                  <Area 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="stressRiskArea" 
                    name="総合健康リスク (SC)" 
                    fill="#ede9fe" // violet-100
                    stroke="#c4b5fd" // violet-300 
                    fillOpacity={0.5} 
                    isAnimationActive={true}
                  />
                  
                  {/* 線（Line）: Echoスコア */}
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="pulseAvg" 
                    name="エンゲージメント (Echo)" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 6 }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">パルスデータがありません</div>
            )}
          </div>
        </div>

        {/* 3. 組織単位のコンディション・ヒートマップ（散布図） */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full" />
              部署別コンディション・マトリクス
            </h2>
            <p className="text-xs text-gray-400 mt-1 ml-4">
              X軸: 健康リスク(低←→高) / Y軸: Echo活気(低←→高)
            </p>
          </div>
          <div className="p-4 md:p-6 flex-1 min-h-[300px]">
            {departments.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                  <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="healthRisk" 
                    name="健康リスク" 
                    domain={[80, 140]} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                    axisLine={false} 
                    tickLine={false} 
                    reversed={true} // 低リスク(良い)を右に持ってくるか、標準のままとするか。今回は値が大きいとリスク高
                  />
                  <YAxis 
                    type="number" 
                    dataKey="avgPulseScore" 
                    name="Echoスコア" 
                    domain={[1, 5]} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <ZAxis type="category" dataKey="divisionName" name="部署名" />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Scatter 
                    name="部署" 
                    data={departments} 
                    fill="#10b981" 
                    fillOpacity={0.7}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">部署データがありません</div>
            )}
          </div>
        </div>

      </div>

      {/* C-S1: コンディション × ストレス クロス分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-gradient-to-b from-emerald-400 to-green-600 rounded-full" />
              コンディション日次推移（直近30日）
            </h2>
            <p className="text-xs text-gray-400 mt-1 ml-4">
              日次チェックインの匿名集計（5名未満の日は非表示）
            </p>
          </div>
          <div className="p-4 md:p-6 flex-1 min-h-[280px]">
            {conditionChartData.some(d => d.avgCondition !== null) ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={conditionChartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" domain={[1, 5]} tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgCondition"
                    name="コンディション平均"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#10b981' }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                コンディション記録データがありません
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-gradient-to-b from-rose-400 to-orange-500 rounded-full" />
              コンディション × 健康リスク マトリクス
            </h2>
            <p className="text-xs text-gray-400 mt-1 ml-4">
              X軸: 健康リスク(低←→高) / Y軸: コンディション(低←→高)
            </p>
          </div>
          <div className="p-4 md:p-6 flex-1 min-h-[280px]">
            {conditionScatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                  <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="healthRisk" name="健康リスク" domain={[80, 140]} tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="number" dataKey="avgConditionScore" name="コンディション" domain={[1, 5]} tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <ZAxis type="category" dataKey="divisionName" name="部署名" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Scatter name="部署" data={conditionScatterData} fill="#f97316" fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                部署別コンディション集計データがありません
              </div>
            )}
          </div>
        </div>
      </div>

      {/* C-S1: コンディション × ストレス 要注意リスト */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-amber-50/30">
          <div>
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-gradient-to-b from-amber-500 to-orange-600 rounded-full" />
              コンディション × ストレス 要注意リスト
            </h2>
            <p className="text-xs text-gray-500 mt-1 ml-4 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-gray-400" />
              条件：直近30日のコンディション平均が低い、または低下傾向 ＋ 高ストレス判定
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-amber-200">
            <Heart className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-bold text-amber-700">{highConditionStressAlerts.length} 名（高）</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-4 font-semibold">社員名 / 部署</th>
                <th className="px-6 py-4 font-semibold text-center">コンディション平均</th>
                <th className="px-6 py-4 font-semibold text-center">7日間トレンド</th>
                <th className="px-6 py-4 font-semibold text-center">高ストレス判定</th>
                <th className="px-6 py-4 font-semibold text-center">リスク</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {conditionStressAlerts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    コンディション記録とストレスチェックの突合対象者がいません。
                  </td>
                </tr>
              ) : (
                conditionStressAlerts.map(emp => (
                  <tr key={emp.employeeId} className={`hover:bg-amber-50/30 transition-colors ${emp.warningLevel === 'high' ? 'bg-amber-50/20' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        <Heart className={`w-4 h-4 ${emp.warningLevel === 'high' ? 'text-amber-600' : 'text-gray-400'}`} />
                        {emp.name}
                      </div>
                      <div className="text-xs text-gray-400 ml-6">{emp.divisionName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded font-bold text-xs border ${emp.avgConditionScore <= 2.5 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {emp.avgConditionScore.toFixed(1)} / 5
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {emp.conditionTrendDown ? (
                        <span className="text-amber-600 font-medium">↓ 低下傾向</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {emp.isHighStress ? (
                        <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs font-bold">該当</span>
                      ) : (
                        <span className="text-gray-400 font-bold">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${emp.warningLevel === 'high' ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {emp.warningLevel === 'high' ? '高' : '中'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. 離職リスク予測・アラート機能（対象者リスト） */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-rose-50/30">
          <div>
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-gradient-to-b from-rose-500 to-red-600 rounded-full" />
              離職予備軍アラート（要注意リスト）
            </h2>
            <p className="text-xs text-gray-500 mt-1 ml-4 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-gray-400" />
              条件：ストレスチェックで「上司の支援」が低い ＋ Echoスコアが3ヶ月連続で下降
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-bold text-rose-600">{highRiskEmployees.length} 名抽出</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-4 font-semibold">社員名 / 部署</th>
                <th className="px-6 py-4 font-semibold text-center">SC 上司の支援スコア</th>
                <th className="px-6 py-4 font-semibold text-center">Echo 3ヶ月トレンド</th>
                <th className="px-6 py-4 font-semibold text-center">高ストレス判定</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {highRiskEmployees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    現在、条件に該当する要注意の従業員はいません。組織状態は安定しています。
                  </td>
                </tr>
              ) : (
                highRiskEmployees.map((emp) => {
                  const pKeys = Object.keys(emp.pulseScores).sort();
                  const last3 = pKeys.slice(-3);
                  const trendStr = last3.map(k => `${emp.pulseScores[k]}`).join(' → ');

                  return (
                    <tr key={emp.employeeId} className="hover:bg-rose-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          <UserMinus className="w-4 h-4 text-rose-500" />
                          {emp.name}
                        </div>
                        <div className="text-xs text-gray-400 ml-6">{emp.divisionName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200">
                          {emp.bossSupportEvalList} 点 (低)
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-rose-600 font-medium tracking-wider flex items-center justify-center gap-1">
                          <ActivityIcon className="w-3.5 h-3.5" />
                          {trendStr}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {emp.isHighStress ? (
                          <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs font-bold">該当</span>
                        ) : (
                          <span className="text-gray-400 font-bold">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
