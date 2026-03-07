'use client';

import { useState } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import type { GroupAnalysisDepartment, GroupAnalysisSummary } from '../types';
import { GROUP_ANALYSIS_SCALES } from '../types';

interface Props {
  departments: GroupAnalysisDepartment[];
  summary: GroupAnalysisSummary;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 shadow-xl max-w-xs">
      <p className="text-xs font-bold text-gray-700 mb-2">{label}</p>
      <div className="space-y-1">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 truncate">{entry.name}:</span>
            <span className="font-bold text-gray-900 ml-auto tabular-nums">
              {entry.value != null ? Number(entry.value).toFixed(1) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GroupRadarChart({ departments, summary }: Props) {
  // マスキングされていない、かつデータがある部署を抽出（その他合算はマスキングだが表示するなら filter しないなど要件次第。一旦すべて表示可能とするが、スコアがnullなら除外）
  const validDepts = departments.filter((d) => !d.isMasked && d.scaleAverages.workloadQuantity != null);
  
  const [selectedDeptName, setSelectedDeptName] = useState<string>(
    validDepts.length > 0 ? validDepts[0].departmentName : ''
  );

  const selectedDept = validDepts.find((d) => d.departmentName === selectedDeptName);

  if (validDepts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        表示可能な部署データがありません
      </div>
    );
  }

  // レーダーチャート用データを変換
  const radarData = GROUP_ANALYSIS_SCALES.map((scale) => {
    const point: Record<string, string | number | null> = {
      scale: scale.shortLabel,
      fullLabel: scale.label,
      '全社平均': (summary.overallScaleAverages as unknown as Record<string, number | null>)[scale.key],
    };

    if (selectedDept) {
      const val = (selectedDept.scaleAverages as unknown as Record<string, number | null>)[scale.key];
      point[selectedDept.departmentName] = val;
    }

    return point;
  });

  return (
    <div className="w-full flex flex-col md:flex-row gap-6">
      <div className="md:w-1/3 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
            比較する部署を選択
          </label>
          <div className="relative">
            <select
              value={selectedDeptName}
              onChange={(e) => setSelectedDeptName(e.target.value)}
              className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-2.5 px-4 pr-10 rounded-xl leading-tight focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-sm"
            >
              {validDepts.map((d) => (
                <option key={d.departmentName} value={d.departmentName}>
                  {d.departmentName} （{d.respondentCount}名）
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg className="fill-current w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mt-auto hidden md:block">
          <p className="text-xs font-bold text-blue-800 mb-1">チャートの見方</p>
          <p className="text-[10px] text-blue-600 leading-relaxed">
            灰色（破線）の領域が<strong>全社平均</strong>を表します。<br className="my-1" />
            青色（実線）の領域が<strong>{selectedDeptName || '選択部署'}</strong>のスコアです。<br />
            枠線より内側に凹んでいる項目が「弱点」、外側に膨らんでいる項目が「強み」となります。<br />
            <span className="text-gray-500 mt-2 block">※「仕事の負担」や「コントロール度」などの項目は評価点換算（1〜5点）で統一されています。</span>
          </p>
        </div>
      </div>

      <div className="md:w-2/3 flex items-center justify-center">
        <ResponsiveContainer width="100%" height={380}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="scale"
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[1, 5]}
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              tickCount={5}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
            />
            
            {/* 全社平均（常に背面に描画） */}
            <Radar
              key="全社平均"
              name="全社平均"
              dataKey="全社平均"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="#cbd5e1"
              fillOpacity={0.15}
              dot={{ r: 3, fill: '#94a3b8' }}
            />

            {/* 選択された部署 */}
            {selectedDept && (
              <Radar
                key={selectedDept.departmentName}
                name={selectedDept.departmentName}
                dataKey={selectedDept.departmentName}
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="#3b82f6"
                fillOpacity={0.25}
                dot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 1.5 }}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
