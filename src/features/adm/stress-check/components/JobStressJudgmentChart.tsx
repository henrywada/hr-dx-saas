'use client'

/**
 * 仕事のストレス判定図（1枚分）の SVG 描画。
 * 厚労省「仕事のストレス判定図」帳票と同じ軸範囲・等リスク線（10 刻み）で描き、
 * 健康リスク 120 以上の領域を塗り分ける。
 */

import {
  isoRiskSegment,
  JOB_STRESS_CAUTION_THRESHOLD,
  JOB_STRESS_CHART_AXES,
  JOB_STRESS_HIGH_RISK_THRESHOLD,
  JOB_STRESS_ISO_RISKS,
  riskAtLeastPolygon,
  type ChartPoint,
  type JobStressChartKind,
} from '@/features/stress-check/job-stress-chart'

export interface JudgmentChartPoint {
  id: string
  /** 図中に表示する番号（表の No. と対応） */
  label: string
  name: string
  x: number
  y: number
  risk: number
}

interface JobStressJudgmentChartProps {
  kind: JobStressChartKind
  title: string
  xLabel: string
  yLabel: string
  points: JudgmentChartPoint[]
  norm: ChartPoint
  selectedId?: string | null
  onSelect?: (id: string) => void
}

const W = 360
const H = 320
const PAD = { left: 44, right: 12, top: 12, bottom: 40 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

export default function JobStressJudgmentChart({
  kind,
  title,
  xLabel,
  yLabel,
  points,
  norm,
  selectedId,
  onSelect,
}: JobStressJudgmentChartProps) {
  const { x: xr, y: yr } = JOB_STRESS_CHART_AXES[kind]
  const sx = (x: number) => PAD.left + ((x - xr[0]) / (xr[1] - xr[0])) * PLOT_W
  const sy = (y: number) => PAD.top + (1 - (y - yr[0]) / (yr[1] - yr[0])) * PLOT_H
  const toPath = (poly: ChartPoint[]) =>
    poly.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x)},${sy(p.y)}`).join(' ') + ' Z'

  const xTicks = range(xr[0], xr[1])
  const yTicks = range(yr[0], yr[1])
  const caution = riskAtLeastPolygon(kind, JOB_STRESS_CAUTION_THRESHOLD)
  const high = riskAtLeastPolygon(kind, JOB_STRESS_HIGH_RISK_THRESHOLD)
  // 選択中の点を最前面に描く
  const ordered = [...points].sort(
    (a, b) => Number(a.id === selectedId) - Number(b.id === selectedId)
  )

  return (
    <figure className="w-full">
      <figcaption className="text-sm font-bold text-[#24292f] mb-1 text-center">{title}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`${title}。${points.length}件の集団をプロット`}
      >
        <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} fill="#ffffff" />
        {caution.length > 0 && <path d={toPath(caution)} fill="#fff4d6" />}
        {high.length > 0 && <path d={toPath(high)} fill="#ffe0c2" />}

        {/* 1 点刻みのグリッド */}
        {xTicks.map(t => (
          <line
            key={`gx${t}`}
            x1={sx(t)}
            x2={sx(t)}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            stroke="#e2e6ec"
          />
        ))}
        {yTicks.map(t => (
          <line
            key={`gy${t}`}
            x1={PAD.left}
            x2={PAD.left + PLOT_W}
            y1={sy(t)}
            y2={sy(t)}
            stroke="#e2e6ec"
          />
        ))}

        {/* 等リスク線 */}
        {JOB_STRESS_ISO_RISKS.map(risk => {
          const seg = isoRiskSegment(kind, risk)
          if (!seg) return null
          const isNorm = risk === 100
          const isHigh = risk >= JOB_STRESS_HIGH_RISK_THRESHOLD
          const labelAt = kind === 'demandControl' ? seg[1] : seg[0]
          return (
            <g key={risk}>
              <line
                x1={sx(seg[0].x)}
                y1={sy(seg[0].y)}
                x2={sx(seg[1].x)}
                y2={sy(seg[1].y)}
                stroke={isHigh ? '#d1242f' : isNorm ? '#24292f' : '#8c959f'}
                strokeWidth={isNorm ? 1.5 : 1}
                strokeDasharray={isNorm ? undefined : '3 3'}
              />
              <text
                x={sx(labelAt.x)}
                y={sy(labelAt.y)}
                dx={kind === 'demandControl' ? -4 : 4}
                dy={kind === 'demandControl' ? -3 : 10}
                textAnchor={kind === 'demandControl' ? 'end' : 'start'}
                fontSize={9}
                fill={isHigh ? '#d1242f' : '#57606a'}
                fontFamily="'Noto Sans Mono', monospace"
              >
                {risk}
              </text>
            </g>
          )
        })}

        {/* 軸 */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={PLOT_W}
          height={PLOT_H}
          fill="none"
          stroke="#8c959f"
        />
        {xTicks.map(t => (
          <text
            key={`tx${t}`}
            x={sx(t)}
            y={PAD.top + PLOT_H + 14}
            textAnchor="middle"
            fontSize={10}
            fill="#57606a"
          >
            {t}
          </text>
        ))}
        {yTicks.map(t => (
          <text
            key={`ty${t}`}
            x={PAD.left - 6}
            y={sy(t) + 3}
            textAnchor="end"
            fontSize={10}
            fill="#57606a"
          >
            {t}
          </text>
        ))}
        <text x={PAD.left + PLOT_W / 2} y={H - 6} textAnchor="middle" fontSize={11} fill="#24292f">
          {xLabel}
        </text>
        <text
          transform={`translate(12 ${PAD.top + PLOT_H / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize={11}
          fill="#24292f"
        >
          {yLabel}
        </text>

        {/* 全国平均 */}
        <g>
          <rect
            x={sx(norm.x) - 5}
            y={sy(norm.y) - 5}
            width={10}
            height={10}
            fill="#ffffff"
            stroke="#24292f"
            strokeWidth={1.5}
          />
          <title>{`全国平均（${norm.x} / ${norm.y}）`}</title>
        </g>

        {/* 集団 */}
        {ordered.map(p => {
          const cx = sx(clamp(p.x, xr))
          const cy = sy(clamp(p.y, yr))
          const isSelected = p.id === selectedId
          // 軸範囲外の点は枠線上に白抜きで描き、外れ値であることを示す
          const isOutOfRange = clamp(p.x, xr) !== p.x || clamp(p.y, yr) !== p.y
          const color =
            p.risk >= JOB_STRESS_HIGH_RISK_THRESHOLD
              ? '#d1242f'
              : p.risk >= JOB_STRESS_CAUTION_THRESHOLD
                ? '#FD7601'
                : '#232a33'
          return (
            <g
              key={p.id}
              onClick={onSelect ? () => onSelect(p.id) : undefined}
              className={onSelect ? 'cursor-pointer focus:outline-none' : undefined}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              aria-label={`${p.name}を選択`}
              aria-pressed={onSelect ? isSelected : undefined}
              onKeyDown={
                onSelect
                  ? e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelect(p.id)
                      }
                    }
                  : undefined
              }
            >
              <circle
                cx={cx}
                cy={cy}
                r={isSelected ? 9 : 7}
                fill={isOutOfRange ? '#ffffff' : color}
                stroke={isSelected ? '#0969da' : isOutOfRange ? color : '#ffffff'}
                strokeWidth={isSelected ? 3 : 1.5}
              />
              <text
                x={cx}
                y={cy + 3}
                textAnchor="middle"
                fontSize={8}
                fontWeight={700}
                fill={isOutOfRange ? color : '#ffffff'}
                fontFamily="'Noto Sans Mono', monospace"
              >
                {p.label}
              </text>
              <title>
                {`${p.name}（${p.x.toFixed(1)} / ${p.y.toFixed(1)}）健康リスク ${Math.round(p.risk)}${isOutOfRange ? '（軸範囲外）' : ''}`}
              </title>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i)
}

/** 軸範囲外の値は枠の端に寄せて描く */
function clamp(v: number, r: readonly [number, number]): number {
  return Math.min(r[1], Math.max(r[0], v))
}
