'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { WithdrawalRatePoint } from '../types'

interface Props {
  trend: WithdrawalRatePoint[]
}

export function WithdrawalTrend({ trend }: Props) {
  // Recharts 用データ変換（月ラベルを短縮: 'YYYY-MM' → 'YY/MM'）
  const chartData = trend.map(point => ({
    month: point.month.slice(2).replace('-', '/'),
    内定数: point.offered,
    辞退数: point.withdrawn,
    '辞退率(%)': point.rate,
  }))

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="bg-gray-200 border-b border-gray-300 px-6 py-4">
        <h2 className="text-lg font-bold tracking-tight text-gray-900">内定辞退率の推移</h2>
        <p className="text-sm text-gray-500 mt-0.5">過去6ヶ月（月別）</p>
      </div>

      <div className="p-6">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">
            過去6ヶ月の内定・辞退データがありません
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                {/* 左軸: 件数 */}
                <YAxis yAxisId="count" allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
                {/* 右軸: 辞退率 */}
                <YAxis
                  yAxisId="rate"
                  orientation="right"
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  tick={{ fontSize: 12 }}
                  width={40}
                />
                <Tooltip
                  formatter={(value, name) =>
                    name === '辞退率(%)' ? [`${value}%`, name] : [value, name]
                  }
                />
                <Legend />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="内定数"
                  stroke="#0055ff"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="辞退数"
                  stroke="#ff6b00"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  yAxisId="rate"
                  type="monotone"
                  dataKey="辞退率(%)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* 直近月サマリー */}
            {(() => {
              const latest = trend[trend.length - 1]
              return (
                <div className="mt-4 flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">直近月の内定数</span>
                    <span className="ml-2 font-bold text-gray-900">{latest.offered}件</span>
                  </div>
                  <div>
                    <span className="text-gray-500">辞退数</span>
                    <span className="ml-2 font-bold text-orange-600">{latest.withdrawn}件</span>
                  </div>
                  <div>
                    <span className="text-gray-500">辞退率</span>
                    <span
                      className={[
                        'ml-2 font-bold',
                        latest.rate >= 20 ? 'text-red-600' : 'text-gray-900',
                      ].join(' ')}
                    >
                      {latest.rate}%
                    </span>
                  </div>
                </div>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}
