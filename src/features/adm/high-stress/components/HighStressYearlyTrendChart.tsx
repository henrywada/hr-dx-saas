'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Info, List } from 'lucide-react'
import type { HighStressYearlyTrendRow } from '../queries'

const MALE_COLOR = '#3366CC'
const FEMALE_COLOR = '#DC3912'

type Props = {
  rows: HighStressYearlyTrendRow[]
}

export default function HighStressYearlyTrendChart({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <ChartHeader />
        <p className="mt-6 text-center text-sm text-gray-500">表示できる年度データがありません。</p>
      </div>
    )
  }

  const chartData = rows.map(r => ({
    year: String(r.fiscalYear),
    男性: r.maleCount,
    女性: r.femaleCount,
  }))

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6 space-y-4">
      <ChartHeader />
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number, name: string) => [`${value}名`, name]}
              labelFormatter={label => `${label}年度`}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="男性" stackId="hs" fill={MALE_COLOR} maxBarSize={56} />
            <Bar dataKey="女性" stackId="hs" fill={FEMALE_COLOR} maxBarSize={56} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-120 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="border border-gray-200 px-3 py-2 text-left font-semibold">項目</th>
              {rows.map(r => (
                <th
                  key={r.fiscalYear}
                  className="border border-gray-200 px-3 py-2 text-center font-semibold"
                >
                  {r.fiscalYear}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">
                年度
              </th>
              {rows.map(r => (
                <td key={r.fiscalYear} className="border border-gray-200 px-3 py-2 text-center">
                  {r.fiscalYear}
                </td>
              ))}
            </tr>
            <tr>
              <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">
                高ストレス者人数
              </th>
              {rows.map(r => (
                <td key={r.fiscalYear} className="border border-gray-200 px-3 py-2 text-center">
                  {r.highStressCount} 名
                </td>
              ))}
            </tr>
            <tr>
              <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">
                発生率
              </th>
              {rows.map(r => (
                <td key={r.fiscalYear} className="border border-gray-200 px-3 py-2 text-center">
                  {r.rate == null ? '—' : `${r.rate.toFixed(1)} %`}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ChartHeader() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
        <List className="w-4 h-4 text-slate-500" />
        高ストレス者の推移（年度別対比）
      </h2>
      <p className="flex items-start gap-1 text-[11px] text-gray-500 max-w-md">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        年度内に複数回ストレスチェックを実施した場合、最終回の結果が使用されます
      </p>
    </div>
  )
}
