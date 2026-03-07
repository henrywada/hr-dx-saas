'use client';

import { EyeOff, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import type { GroupAnalysisDepartment } from '../types';

interface Props {
  departments: GroupAnalysisDepartment[];
}

// 評価点のしきい値に応じたヒートマップの背景色と文字色を決定するヘルパー
function getHeatmapClass(value: number | null, inverse: boolean = false) {
  if (value == null) return 'bg-gray-50 text-gray-300'; // マスキング等

  if (inverse) {
    // 支援、自律性など（高いほうが良い）
    if (value >= 3.5) return 'bg-emerald-100 text-emerald-800 font-bold'; // 良好
    if (value >= 2.5) return 'bg-yellow-50 text-yellow-800 font-medium';  // 普通
    return 'bg-red-100 text-red-700 font-bold';                           // リスク高
  } else {
    // 負担量など（低いほうが良い）
    if (value <= 2.5) return 'bg-emerald-100 text-emerald-800 font-bold'; // 良好
    if (value <= 3.5) return 'bg-yellow-50 text-yellow-800 font-medium';  // 普通
    return 'bg-red-100 text-red-700 font-bold';                           // リスク高 // 修正箇所
  }
}

// 総合健康リスクのスタイル
function getRiskClass(risk: number | null) {
  if (risk == null) return 'bg-gray-50 text-gray-300';
  if (risk > 120) return 'bg-red-100 text-red-700 font-bold';
  if (risk >= 100) return 'bg-amber-50 text-amber-700 font-medium';
  return 'bg-emerald-50 text-emerald-700 font-bold';
}

function RiskBadge({ risk }: { risk: number | null }) {
  if (risk == null) return <span className="text-gray-300">—</span>;

  let comparisonText = '';
  if (risk > 100) comparisonText = `(+${risk - 100}%)`;
  else if (risk < 100) comparisonText = `(${risk - 100}%)`;
  else comparisonText = '(±0%)';

  const riskClass = getRiskClass(risk);
  const Icon = risk >= 100 ? TrendingUp : TrendingDown;

  return (
    <div className={`flex flex-col items-center justify-center p-2 rounded-lg ${riskClass} h-full`}>
      <div className="flex items-center gap-1 text-sm">
        {risk >= 120 && <AlertTriangle className="w-4 h-4" />}
        {! (risk >= 120) && <Icon className="w-3 h-3" />}
        <span>{risk}</span>
      </div>
      <span className="text-[10px] opacity-80 font-normal">{comparisonText}</span>
    </div>
  );
}

export default function GroupAnalysisHeatMap({ departments }: Props) {
  if (!departments || departments.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">
        部署データがありません
      </div>
    );
  }

  // 表示する主要4項目
  const indicators = [
    { key: 'workloadQuantity', label: '仕事の量', inverse: false }, // 低い方が良い
    { key: 'control', label: '自律性', inverse: true },         // 高い方が良い
    { key: 'supervisorSupport', label: '上司の支援', inverse: true }, // 高い方が良い
    { key: 'coworkerSupport', label: '同僚の支援', inverse: true },   // 高い方が良い
  ] as const;

  return (
    <div className="overflow-x-auto p-4">
      <table className="min-w-full border-separate border-spacing-2">
        <thead>
          <tr>
            <th className="p-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-white sticky left-0 z-10 w-48">
              部署名
            </th>
            <th className="p-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider w-24">
              回答者数
            </th>
            {indicators.map((ind) => (
              <th key={ind.key} className="p-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider w-24">
                {ind.label}
              </th>
            ))}
            <th className="p-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider w-32 border-l-2 border-gray-100">
              総合健康リスク
            </th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => {
            return (
              <tr key={dept.departmentName} className="group transition-transform hover:-translate-y-0.5">
                {/* 部署名 */}
                <td className={`p-4 rounded-xl sticky left-0 z-10 shadow-sm border border-gray-100 ${dept.isMasked ? 'bg-gray-50 text-gray-400' : 'bg-white text-gray-800'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate leading-tight">
                      {dept.departmentName}
                    </span>
                    {dept.isMasked && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-gray-200 text-gray-500 shrink-0">
                        <EyeOff className="w-3 h-3" />
                        合算済
                      </span>
                    )}
                  </div>
                </td>

                <td className="p-2 text-center text-sm tabular-nums">
                  <span className={dept.isMasked ? 'text-gray-400 font-medium' : 'text-gray-600 font-bold'}>
                    {dept.respondentCount}
                  </span>
                </td>

                {/* 尺度ヒートマップセル */}
                {indicators.map((ind) => {
                  const val = dept.isMasked ? null : (dept.scaleAverages as unknown as Record<string, number | null>)[ind.key];
                  const heatClass = getHeatmapClass(val, ind.inverse);
                  return (
                    <td key={ind.key} className="p-1">
                      <div className={`flex items-center justify-center p-3 rounded-lg text-sm tabular-nums transition-colors h-full ${heatClass}`}>
                        {val != null ? val.toFixed(1) : '—'}
                      </div>
                    </td>
                  );
                })}

                {/* 健康リスク */}
                <td className="p-1 border-l-2 border-gray-100">
                  <RiskBadge risk={dept.isMasked ? null : dept.totalHealthRisk} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-6 mt-4 px-4 text-[11px] text-gray-500 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300"></span>
          <span>良好</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-50 border border-yellow-300"></span>
          <span>普通</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-100 border border-red-300"></span>
          <span>要注意（リスク高）</span>
        </div>
      </div>
    </div>
  );
}
