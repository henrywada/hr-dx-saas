'use client';

import { EyeOff, TrendingUp, TrendingDown } from 'lucide-react';
import type { GroupAnalysisDepartment } from '../types';
import { GROUP_ANALYSIS_SCALES } from '../types';

interface Props {
  departments: GroupAnalysisDepartment[];
}

function RiskBadge({ risk }: { risk: number | null }) {
  if (risk == null) return <span className="text-gray-300">—</span>;

  const color =
    risk >= 120
      ? 'bg-red-50 text-red-700 border-red-200'
      : risk >= 100
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  const Icon = risk >= 100 ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}>
      <Icon className="w-3 h-3" />
      {risk}
    </span>
  );
}

function ScoreCell({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value == null) return <span className="text-gray-300">—</span>;

  // 色分け: inverse=false → 低い方が良い (ストレス要因系), inverse=true → 高い方が良い (サポート・活気)
  let color = 'text-gray-700';
  if (inverse) {
    // 高い方が良い
    color = value >= 4 ? 'text-emerald-600 font-bold' : value >= 3 ? 'text-gray-700' : value <= 2 ? 'text-red-600 font-bold' : 'text-amber-600';
  } else {
    // 低い方が良い
    color = value <= 2 ? 'text-emerald-600 font-bold' : value <= 3 ? 'text-gray-700' : value >= 4 ? 'text-red-600 font-bold' : 'text-amber-600';
  }

  return <span className={`tabular-nums ${color}`}>{value.toFixed(1)}</span>;
}

// 高い方が良い尺度のキー
const INVERSE_SCALES = new Set(['control', 'supervisorSupport', 'coworkerSupport', 'vitality']);

export default function GroupAnalysisTable({ departments }: Props) {
  if (departments.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm">
        部署データがありません
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50/50">
          <tr>
            <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50/50 z-10">
              部署名
            </th>
            <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              回答者数
            </th>
            {GROUP_ANALYSIS_SCALES.map((scale) => (
              <th
                key={scale.key}
                className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {scale.shortLabel}
              </th>
            ))}
            <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              高ストレス率
            </th>
            <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              健康リスク
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-50">
          {departments.map((dept) => (
            <tr
              key={dept.departmentName}
              className={`transition-colors ${dept.isMasked ? 'bg-gray-50/30' : 'hover:bg-blue-50/30'}`}
            >
              {/* 部署名 */}
              <td className="px-5 py-3 whitespace-nowrap sticky left-0 bg-inherit z-10">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${dept.isMasked ? 'text-gray-400' : 'text-gray-800'}`}>
                    {dept.departmentName}
                  </span>
                  {dept.isMasked && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500">
                      <EyeOff className="w-3 h-3" />
                      非表示
                    </span>
                  )}
                </div>
              </td>

              {/* 回答者数 */}
              <td className="px-4 py-3 text-center text-sm tabular-nums">
                <span className={dept.isMasked ? 'text-gray-400' : 'text-gray-700 font-semibold'}>
                  {dept.respondentCount}
                </span>
              </td>

              {/* 尺度スコア */}
              {GROUP_ANALYSIS_SCALES.map((scale) => (
                <td key={scale.key} className="px-4 py-3 text-center text-sm">
                  {dept.isMasked ? (
                    <span className="text-gray-300">—</span>
                  ) : (
                    <ScoreCell
                      value={(dept.scaleAverages as unknown as Record<string, number | null>)[scale.key]}
                      inverse={INVERSE_SCALES.has(scale.key)}
                    />
                  )}
                </td>
              ))}

              {/* 高ストレス率 */}
              <td className="px-4 py-3 text-center text-sm">
                {dept.isMasked ? (
                  <span className="text-gray-300">—</span>
                ) : (
                  <span
                    className={`tabular-nums font-semibold ${
                      dept.highStressRate >= 15 ? 'text-red-600' : dept.highStressRate >= 10 ? 'text-amber-600' : 'text-gray-700'
                    }`}
                  >
                    {dept.highStressRate}%
                    <span className="text-[10px] text-gray-400 ml-1">({dept.highStressCount}名)</span>
                  </span>
                )}
              </td>

              {/* 健康リスク */}
              <td className="px-4 py-3 text-center text-sm">
                {dept.isMasked ? (
                  <span className="text-gray-300">—</span>
                ) : (
                  <RiskBadge risk={dept.totalHealthRisk} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
