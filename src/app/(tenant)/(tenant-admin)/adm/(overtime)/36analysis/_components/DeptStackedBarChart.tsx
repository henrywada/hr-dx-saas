'use client'

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
} from 'recharts'
import { type OvertimeThresholds, STATUS_COLORS } from '@/utils/overtimeThresholds'

// =============================================================================
// 型定義
// =============================================================================

/** グラフ用の部署別集計データ */
export type DeptChartData = {
  /** 部署名（Y軸ラベル） */
  deptName: string
  /** 安全（〜45h）人数 */
  safe: number
  /** 注意（45〜60h）人数 */
  warning: number
  /** 危険（60〜80h）人数 */
  danger: number
  /** 重大（80〜100h）人数 */
  critical: number
  /** 法違反（100h〜）人数 */
  violation: number
}

type Props = {
  data: DeptChartData[]
  thresholds: OvertimeThresholds
}

// =============================================================================
// カスタムツールチップ
// =============================================================================

const SEGMENT_CONFIG = [
  { key: 'safe', label: '安全（〜45h）', color: STATUS_COLORS.safe },
  { key: 'warning', label: '注意（45〜60h）', color: STATUS_COLORS.warning },
  { key: 'danger', label: '危険（60〜80h）', color: STATUS_COLORS.danger },
  { key: 'critical', label: '重大（80〜100h）', color: STATUS_COLORS.critical },
  { key: 'violation', label: '法違反（100h〜）', color: STATUS_COLORS.violation },
] as const

type SegmentKey = (typeof SEGMENT_CONFIG)[number]['key']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null

  const total = payload.reduce((sum, p) => sum + (Number(p.value) || 0), 0)

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-4 min-w-[200px]">
      <p className="font-bold text-slate-800 text-sm mb-3 pb-2 border-b border-slate-100">
        {label}
      </p>
      <div className="space-y-1.5">
        {SEGMENT_CONFIG.map((seg) => {
          const entry = payload.find((p) => p.dataKey === seg.key)
          const value = Number(entry?.value ?? 0)
          if (value === 0) return null
          const pct = total > 0 ? Math.round((value / total) * 100) : 0
          return (
            <div key={seg.key} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-xs text-slate-600">{seg.label}</span>
              </div>
              <span className="text-xs font-bold text-slate-800">
                {value}名
                <span className="text-slate-400 font-normal ml-1">({pct}%)</span>
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between">
        <span className="text-xs text-slate-500 font-medium">合計</span>
        <span className="text-xs font-bold text-slate-800">{total}名</span>
      </div>
    </div>
  )
}

// =============================================================================
// カスタム Y 軸ラベル（部署名を折り返す）
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomYAxisTick(props: any) {
  const { x, y, payload } = props
  const name = payload?.value ?? ''
  const MAX_LEN = 9
  const display =
    name.length > MAX_LEN ? `${name.slice(0, MAX_LEN)}…` : name

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="#475569"
        fontSize={12}
        fontWeight={500}
      >
        {display}
      </text>
    </g>
  )
}

// =============================================================================
// メインコンポーネント
// =============================================================================

export function DeptStackedBarChart({ data, thresholds }: Props) {
  // データの並び: 違反が多い順（危険度の高い部署を上に表示）
  const sorted = [...data].sort(
    (a, b) =>
      (b.violation + b.critical + b.danger) -
      (a.violation + a.critical + a.danger),
  )

  const chartHeight = Math.max(240, sorted.length * 52)

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <p className="text-sm">表示できる部署データがありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* セクションヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            部署別 残業ステータス分布
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            各部署の従業員を残業時間帯ごとに色分けして表示しています
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
          基準: 月{thresholds.monthlyLimit}h /
          平均{thresholds.averageLimit}h /
          単月{thresholds.singleMonthSpecialLimit}h
        </div>
      </div>

      {/* グラフ本体 */}
      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={sorted}
            margin={{ top: 4, right: 32, left: 8, bottom: 4 }}
            barCategoryGap="28%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="#e2e8f0"
            />

            {/* X軸: 人数 */}
            <XAxis
              type="number"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              label={{
                value: '人数（名）',
                position: 'insideBottomRight',
                offset: -8,
                fontSize: 11,
                fill: '#94a3b8',
              }}
            />

            {/* Y軸: 部署名 */}
            <YAxis
              type="category"
              dataKey="deptName"
              width={90}
              tickLine={false}
              axisLine={false}
              tick={(props) => <CustomYAxisTick {...props} />}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: '#f8fafc', stroke: '#e2e8f0', strokeWidth: 1 }}
            />

            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
              formatter={(value) => {
                const seg = SEGMENT_CONFIG.find((s) => s.key === value)
                return (
                  <span style={{ color: '#475569' }}>
                    {seg?.label ?? value}
                  </span>
                )
              }}
            />

            {/* 積み上げバー: safe → warning → danger → critical → violation の順 */}
            {SEGMENT_CONFIG.map((seg) => (
              <Bar
                key={seg.key}
                dataKey={seg.key as string}
                stackId="status"
                fill={seg.color}
                radius={
                  seg.key === 'safe'
                    ? [4, 0, 0, 4]   // 左端を丸く
                    : seg.key === 'violation'
                      ? [0, 4, 4, 0] // 右端を丸く
                      : [0, 0, 0, 0]
                }
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-out"
              >
                {/* 法違反セルに star アイコン風の強調ボーダーをCellで付与 */}
                {seg.key === 'violation' &&
                  sorted.map((entry, idx) => (
                    <Cell
                      key={`cell-violation-${idx}`}
                      fill={entry.violation > 0 ? STATUS_COLORS.violation : 'transparent'}
                    />
                  ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
