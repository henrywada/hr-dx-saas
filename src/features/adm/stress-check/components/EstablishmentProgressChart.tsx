'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import type { DepartmentStat } from '../types'

interface Props {
  data: DepartmentStat[]
}

// ─── 横バー: 受検者（青）＋ 未受検者（灰背景）の重ね表示 ───────────────────────
const OverlappingBar = (props: any) => {
  const { x, y, width, height, payload } = props
  if (!width || width <= 0) return null
  const submitted: number = payload?.submitted ?? 0
  const total: number = payload?.total ?? 0
  const submittedW = total > 0 ? Math.round((submitted / total) * width) : 0
  const bh = Math.max(height - 6, 10)
  const by = y + (height - bh) / 2
  return (
    <g>
      {/* 灰背景（未受検を含む全体） */}
      <rect x={x} y={by} width={width} height={bh} fill="#e5e7eb" rx={4} />
      {/* 青前面（受検済み） */}
      {submittedW > 0 && <rect x={x} y={by} width={submittedW} height={bh} fill="#3b82f6" rx={4} />}
    </g>
  )
}

// ─── ツールチップ ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as {
    name: string
    submitted: number
    notSubmitted: number
    inProgress: number
    total: number
    rate: number
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm min-w-[200px]">
      <p className="font-bold text-gray-800 mb-2 text-xs leading-snug break-all">{d.name}</p>
      <p className="text-blue-600">
        受検者：<span className="font-bold">{d.submitted}名</span>
      </p>
      <p className="text-gray-500">
        未受検者：<span className="font-bold">{d.notSubmitted + d.inProgress}名</span>
      </p>
      <p className="text-gray-400 text-xs mt-1">受検率：{d.rate}%</p>
    </div>
  )
}

const PIE_COLORS = ['#3b82f6', '#e5e7eb']

// ─── メインコンポーネント ────────────────────────────────────────────────────
export default function EstablishmentProgressChart({ data }: Props) {
  // 横バー用データ（全体人数 = submitted + notSubmitted + inProgress）
  const barData = data.map(d => ({
    name: d.name.length > 12 ? d.name.slice(0, 12) + '…' : d.name,
    submitted: d.submitted,
    notSubmitted: d.notSubmitted,
    inProgress: d.inProgress,
    total: d.submitted + d.notSubmitted + d.inProgress,
    rate: d.rate,
  }))

  const maxTotal = Math.max(...barData.map(d => d.total), 1)
  const chartHeight = Math.max(200, data.length * 56)

  // パイチャート用集計
  const totalSubmitted = data.reduce((sum, d) => sum + d.submitted, 0)
  const totalAll = data.reduce((sum, d) => sum + d.submitted + d.notSubmitted + d.inProgress, 0)
  const totalNotSubmitted = totalAll - totalSubmitted
  const overallRate = totalAll > 0 ? Math.round((totalSubmitted / totalAll) * 100) : 0

  const pieData = [
    { name: '受検済み', value: totalSubmitted > 0 ? totalSubmitted : 0 },
    { name: '未受検', value: totalNotSubmitted > 0 ? totalNotSubmitted : totalAll > 0 ? 0 : 1 },
  ]

  return (
    <div className="flex gap-4 w-full">
      {/* ─── 左：横バーチャート（65%） ─── */}
      <div style={{ width: '65%', minWidth: 0 }}>
        {/* 凡例 */}
        <div className="flex gap-4 text-xs font-medium text-gray-600 mb-2">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#e5e7eb]" />
            未受検者（全体）
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#3b82f6]" />
            受検者
          </span>
        </div>

        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
            <XAxis
              type="number"
              allowDecimals={false}
              domain={[0, maxTotal]}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 11, fill: '#374151' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip cursor={{ fill: '#f9fafb' }} content={<CustomTooltip />} />
            <Bar dataKey="total" barSize={32} shape={<OverlappingBar />} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ─── 右：パイチャート（35%） ─── */}
      <div
        style={{ width: '35%', minWidth: 0 }}
        className="flex flex-col items-center justify-center"
      >
        <p className="text-xs font-semibold text-gray-600 mb-1">全体 受検率</p>
        <PieChart width={180} height={180}>
          <Pie
            data={pieData}
            cx={90}
            cy={90}
            innerRadius={54}
            outerRadius={80}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
          >
            {pieData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
            ))}
          </Pie>
          {/* 中央ラベル：受検率 % */}
          <text
            x={90}
            y={84}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: 26, fontWeight: 700, fill: '#1f2937' }}
          >
            {overallRate}%
          </text>
          <text
            x={90}
            y={108}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: 11, fill: '#6b7280' }}
          >
            受検率
          </text>
        </PieChart>

        {/* 凡例 */}
        <div className="flex flex-col gap-1 mt-2 text-xs text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#3b82f6]" />
            受検済み {totalSubmitted}名
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-[#e5e7eb] border border-gray-300" />
            未受検 {totalNotSubmitted}名
          </span>
        </div>
      </div>
    </div>
  )
}
