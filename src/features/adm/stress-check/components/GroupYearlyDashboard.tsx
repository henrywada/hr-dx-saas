'use client'

import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ITEM_KEYS,
  RESPONSE_LEVELS,
  YEARLY_MIN_N,
  type HealthRiskBlock,
  type YearlyDashboardYear,
} from '../yearly-dashboard'

const YEAR_LINE_COLORS = [
  '#3366CC',
  '#DC3912',
  '#FF9900',
  '#109618',
  '#990099',
  '#0099C6',
  '#DD4477',
]
const MALE_COLOR = '#3366CC'
const FEMALE_COLOR = '#FF9900'

type Props = {
  years: YearlyDashboardYear[]
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export default function GroupYearlyDashboard({ years }: Props) {
  const visible = years.filter(y => !y.suppressed)
  const snapshot = [...visible].reverse()[0] ?? null

  if (years.length === 0) {
    return (
      <p className="text-center text-sm text-[#57606a] py-12">表示できる年度データがありません。</p>
    )
  }

  if (visible.length === 0) {
    return (
      <p className="text-center text-sm text-[#57606a] py-12">
        対象が{YEARLY_MIN_N}名未満の年度は表示しません。
      </p>
    )
  }

  const barData = visible.map(y => {
    const row: Record<string, string | number> = { year: String(y.fiscalYear) }
    for (const lv of RESPONSE_LEVELS) {
      row[lv.label] = y.responseLevels[lv.key]
    }
    return row
  })

  const itemData = ITEM_KEYS.map(({ key, label }) => {
    const row: Record<string, string | number | null> = { item: label }
    for (const y of visible) {
      row[String(y.fiscalYear)] = y.itemAverages[key]
    }
    return row
  })

  const riskTrendData = visible.map(y => ({
    year: String(y.fiscalYear),
    男性: y.healthRisk.male.suppressed ? null : y.healthRisk.male.total,
    女性: y.healthRisk.female.suppressed ? null : y.healthRisk.female.total,
  }))

  const riskValues = riskTrendData
    .flatMap(r => [r.男性, r.女性])
    .filter((v): v is number => v != null)
  const yMin =
    riskValues.length > 0 ? Math.min(80, Math.floor(Math.min(...riskValues) / 5) * 5) : 80
  const yMax =
    riskValues.length > 0 ? Math.max(120, Math.ceil(Math.max(...riskValues) / 5) * 5) : 120

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 px-4 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <Panel title="対応度別の年推移">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                {/* 積み上げは下から良好→緊急面談（凡例は上から緊急面談） */}
                {[...RESPONSE_LEVELS].reverse().map(lv => (
                  <Bar
                    key={lv.key}
                    dataKey={lv.label}
                    stackId="resp"
                    fill={lv.color}
                    maxBarSize={56}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-[#57606a]">
            {RESPONSE_LEVELS.map(lv => (
              <span key={lv.key} className="inline-flex items-center gap-1">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: lv.color }}
                />
                {lv.label}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto mt-3">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#f6f8fa] text-[#57606a]">
                  <th className="border border-[#e2e6ec] px-3 py-1.5 text-left font-semibold">
                    項目
                  </th>
                  {visible.map(y => (
                    <th
                      key={y.fiscalYear}
                      className="border border-[#e2e6ec] px-3 py-1.5 text-center font-semibold"
                    >
                      {y.fiscalYear}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RESPONSE_LEVELS.map(lv => (
                  <tr key={lv.key}>
                    <td className="border border-[#e2e6ec] px-3 py-1.5 font-medium text-[#24292f]">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-middle"
                        style={{ backgroundColor: lv.color }}
                      />
                      {lv.label}
                    </td>
                    {visible.map(y => (
                      <td
                        key={y.fiscalYear}
                        className="border border-[#e2e6ec] px-3 py-1.5 text-center tabular-nums"
                      >
                        {y.responseLevels[lv.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[#57606a] mt-2">
            厚労省高ストレス判定（B領域・複合）を5区分に読み替えています。対象{YEARLY_MIN_N}
            名未満の年度は非表示です。
          </p>
        </Panel>

        <Panel title="各項目の年推移">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={itemData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="item"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  domain={[0, 6]}
                  ticks={[0, 1, 2, 3, 4, 5, 6]}
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {visible.map((y, idx) => (
                  <Line
                    key={y.fiscalYear}
                    type="monotone"
                    dataKey={String(y.fiscalYear)}
                    name={String(y.fiscalYear)}
                    stroke={YEAR_LINE_COLORS[idx % YEAR_LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="space-y-3">
        <Panel title="健康リスク">
          {snapshot ? (
            <div className="space-y-3">
              <p className="text-xs text-[#57606a]">{snapshot.fiscalYear}年度（最終回）</p>
              {!snapshot.healthRisk.male.suppressed && (
                <HealthRiskTable title="男性用" block={snapshot.healthRisk.male} />
              )}
              {!snapshot.healthRisk.female.suppressed && (
                <HealthRiskTable title="女性用" block={snapshot.healthRisk.female} />
              )}
              {!snapshot.healthRisk.all.suppressed && (
                <HealthRiskTable title="部署全体" block={snapshot.healthRisk.all} />
              )}
              {snapshot.healthRisk.male.suppressed &&
                snapshot.healthRisk.female.suppressed &&
                snapshot.healthRisk.all.suppressed && (
                  <p className="text-sm text-[#57606a]">
                    対象が{YEARLY_MIN_N}名未満のため健康リスクは表示しません。
                  </p>
                )}
            </div>
          ) : (
            <p className="text-sm text-[#57606a]">表示できる健康リスクがありません。</p>
          )}
        </Panel>

        <Panel title="健康リスクの年推移">
          {riskValues.length === 0 ? (
            <p className="text-sm text-[#57606a] py-8 text-center">
              男女とも対象が{YEARLY_MIN_N}名未満のため表示できません。
            </p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskTrendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} />
                  <YAxis
                    domain={[yMin, yMax]}
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [fmt(value), name]}
                    labelFormatter={label => `${label}年度`}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="男性"
                    stroke={MALE_COLOR}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="女性"
                    stroke={FEMALE_COLOR}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-[#e2e6ec] shadow-xs p-5">
      <h2 className="text-sm font-bold text-[#24292f] mb-3">{title}</h2>
      {children}
    </div>
  )
}

function HealthRiskTable({ title, block }: { title: string; block: HealthRiskBlock }) {
  const rows: { label: string; value: number | null }[] = [
    { label: '仕事の量的負担', value: block.demand },
    { label: '仕事のコントロール', value: block.control },
    { label: '上司の支援', value: block.supervisor },
    { label: '同僚の支援', value: block.coworker },
    { label: '総合健康リスク', value: block.total },
  ]

  return (
    <div className="rounded-lg border border-[#e2e6ec] overflow-hidden">
      <div className="flex items-center justify-between bg-[#f6f8fa] px-3 py-1.5">
        <span className="text-xs font-semibold text-[#24292f]">{title}</span>
        <span className="text-xs text-[#57606a]">対象 {block.n} 名</span>
      </div>
      <table className="w-full text-xs border-collapse">
        <tbody>
          {rows.map(r => (
            <tr key={r.label}>
              <th className="border-t border-[#e2e6ec] px-3 py-1.5 text-left font-medium text-[#57606a] w-1/2">
                {r.label}
              </th>
              <td className="border-t border-[#e2e6ec] px-3 py-1.5 text-right tabular-nums font-semibold text-[#24292f]">
                {fmt(r.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
