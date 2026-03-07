'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import type { DepartmentStat } from '../types';

interface DepartmentChartProps {
  departments: DepartmentStat[];
}

// カスタムツールチップ
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const submitted = payload.find((p: { dataKey: string }) => p.dataKey === 'submitted')?.value ?? 0;
  const notSubmitted = payload.find((p: { dataKey: string }) => p.dataKey === 'notSubmitted')?.value ?? 0;
  const total = submitted + notSubmitted;
  const rate = total > 0 ? Math.round((submitted / total) * 100) : 0;

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-sm font-bold text-gray-800 mb-2">{label}</p>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-gray-600">受検済み:</span>
          <span className="font-bold text-gray-900">{submitted}名</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
          <span className="text-gray-600">未受検:</span>
          <span className="font-bold text-gray-900">{notSubmitted}名</span>
        </div>
        <div className="pt-1 border-t border-gray-100 mt-1">
          <span className="text-gray-600">受検率:</span>
          <span className="font-bold text-blue-600 ml-1">{rate}%</span>
        </div>
      </div>
    </div>
  );
}

export default function DepartmentChart({ departments }: DepartmentChartProps) {
  if (departments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        部署データがありません
      </div>
    );
  }

  // グラデーション色の配列
  const submittedColors = ['#10b981', '#059669', '#047857', '#34d399', '#6ee7b7'];
  const notSubmittedColors = ['#f59e0b', '#d97706', '#b45309', '#fbbf24', '#fcd34d'];

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={Math.max(300, departments.length * 50 + 80)}>
        <BarChart
          data={departments}
          layout="vertical"
          margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
          barGap={2}
          barCategoryGap="25%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f1f5f9"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={100}
            tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
          />
          <Bar
            dataKey="submitted"
            name="受検済み"
            stackId="a"
            radius={[0, 0, 0, 0]}
          >
            {departments.map((_entry, index) => (
              <Cell key={`submitted-${index}`} fill={submittedColors[index % submittedColors.length]} />
            ))}
            <LabelList
              dataKey="submitted"
              position="center"
              fill="#fff"
              fontSize={11}
              fontWeight="bold"
              formatter={(value: number) => (value > 0 ? value : '')}
            />
          </Bar>
          <Bar
            dataKey="notSubmitted"
            name="未受検"
            stackId="a"
            radius={[0, 4, 4, 0]}
          >
            {departments.map((_entry, index) => (
              <Cell key={`not-${index}`} fill={notSubmittedColors[index % notSubmittedColors.length]} />
            ))}
            <LabelList
              dataKey="notSubmitted"
              position="center"
              fill="#fff"
              fontSize={11}
              fontWeight="bold"
              formatter={(value: number) => (value > 0 ? value : '')}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
