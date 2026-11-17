'use client'

/**
 * 年度別分析「尺度別プロフィール」。
 * 職業性ストレス簡易調査票の全19尺度について、素点換算表の評価点（1=ストレスが高い〜5=低い）の
 * 集団平均を標準集団の目安（3）と比べる（厚労省 実施マニュアル P86：判定図以外の尺度も
 * 集団平均を全国平均と比べることで、より詳しく特徴を評価できる）。
 */

import type { StressCategory } from '@/features/stress-check/mhlw-scales'
import { SCALE_PROFILE_NORM, type YearlyDashboardYear } from '../yearly-dashboard'

const CATEGORY_LABELS: Record<StressCategory, string> = {
  A: 'ストレスの原因と考えられる因子',
  B: 'ストレスによっておこる心身の反応',
  C: 'ストレス反応に影響を与える他の因子',
  D: '満足度',
}

/** 評価点のとりうる範囲（素点換算表の 5 段階） */
const EVAL_MIN = 1
const EVAL_MAX = 5

interface ScaleProfilePanelProps {
  /** 表示対象（10 名以上）の年度。古い順 */
  years: YearlyDashboardYear[]
}

export default function ScaleProfilePanel({ years }: ScaleProfilePanelProps) {
  const current = years[years.length - 1]
  const previous = years.length >= 2 ? years[years.length - 2] : null
  if (!current) return null

  const prevByScale = new Map(previous?.scaleProfile.map(s => [s.scaleName, s.avgEval]) ?? [])
  const categories = (['A', 'B', 'C', 'D'] as const).filter(c =>
    current.scaleProfile.some(s => s.category === c)
  )

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#57606a]">
        {current.fiscalYear}年度（最終回・対象 {current.n} 名）
        {previous && ` ／ 前回比の比較対象：${previous.fiscalYear}年度`}
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#f6f8fa] text-[#57606a]">
              <th className="border border-[#e2e6ec] px-3 py-1.5 text-left font-semibold">尺度</th>
              <th className="border border-[#e2e6ec] px-3 py-1.5 text-right font-semibold w-16">
                評価点
              </th>
              <th className="border border-[#e2e6ec] px-3 py-1.5 font-semibold min-w-[220px]">
                <div className="flex justify-between font-normal">
                  <span>← ストレス高い</span>
                  <span>標準集団（{SCALE_PROFILE_NORM}）</span>
                  <span>ストレス低い →</span>
                </div>
              </th>
              {previous && (
                <th className="border border-[#e2e6ec] px-3 py-1.5 text-right font-semibold w-20">
                  前回比
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <CategoryRows
                key={cat}
                category={cat}
                rows={current.scaleProfile.filter(s => s.category === cat)}
                prevByScale={prevByScale}
                hasPrevious={previous != null}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] leading-relaxed text-[#57606a]">
        評価点は素点換算表による5段階（1=ストレスが高い〜5=ストレスが低い）の集団平均です。素点換算表は標準集団の分布から作られているため、標準集団の平均はおよそ
        {SCALE_PROFILE_NORM}
        になります。左に伸びる棒は標準集団よりストレスが高い（好ましくない）尺度です。対象10名未満の年度は表示しません。
      </p>
    </div>
  )
}

function CategoryRows({
  category,
  rows,
  prevByScale,
  hasPrevious,
}: {
  category: StressCategory
  rows: YearlyDashboardYear['scaleProfile']
  prevByScale: Map<string, number | null>
  hasPrevious: boolean
}) {
  return (
    <>
      <tr>
        <td
          colSpan={hasPrevious ? 4 : 3}
          className="border border-[#e2e6ec] bg-[#f6f8fa]/60 px-3 py-1 font-semibold text-[#24292f]"
        >
          {category}．{CATEGORY_LABELS[category]}
        </td>
      </tr>
      {rows.map(s => {
        const prev = prevByScale.get(s.scaleName) ?? null
        const diff =
          s.avgEval != null && prev != null ? Math.round((s.avgEval - prev) * 10) / 10 : null
        return (
          <tr key={s.scaleName} className="hover:bg-[#f6f8fa]">
            <td className="border border-[#e2e6ec] px-3 py-1 text-[#24292f] whitespace-nowrap">
              {s.scaleName}
            </td>
            <td className="border border-[#e2e6ec] px-3 py-1 text-right font-mono tabular-nums">
              {s.avgEval == null ? '—' : s.avgEval.toFixed(1)}
            </td>
            <td className="border border-[#e2e6ec] px-3 py-1">
              <DeviationBar value={s.avgEval} />
            </td>
            {hasPrevious && (
              <td className="border border-[#e2e6ec] px-3 py-1 text-right font-mono tabular-nums">
                {diff == null ? (
                  '—'
                ) : (
                  // 評価点は高いほど良いので、下がった（マイナス）ときを悪化として赤にする
                  <span className={diff < 0 ? 'text-rose-600 font-semibold' : 'text-emerald-700'}>
                    {diff > 0 ? '+' : ''}
                    {diff.toFixed(1)}
                  </span>
                )}
              </td>
            )}
          </tr>
        )
      })}
    </>
  )
}

/** 標準集団（3）を中心に、評価点との差を左右に伸びる棒で表す */
function DeviationBar({ value }: { value: number | null }) {
  if (value == null) return <div className="h-3" />
  const half = SCALE_PROFILE_NORM - EVAL_MIN // 中心から端までの評価点幅
  const clamped = Math.min(EVAL_MAX, Math.max(EVAL_MIN, value))
  const ratio = Math.abs(clamped - SCALE_PROFILE_NORM) / half // 0〜1
  const isWorse = clamped < SCALE_PROFILE_NORM
  const widthPct = ratio * 50

  return (
    <div className="relative h-3 rounded-sm bg-[#f6f8fa]" aria-hidden>
      <div className="absolute inset-y-0 left-1/2 w-px bg-[#8c959f]" />
      <div
        className={`absolute inset-y-0.5 rounded-sm ${isWorse ? 'bg-rose-500' : 'bg-[#0969da]/70'}`}
        style={
          isWorse ? { right: '50%', width: `${widthPct}%` } : { left: '50%', width: `${widthPct}%` }
        }
      />
    </div>
  )
}
