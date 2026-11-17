'use client'

/**
 * 集団分析「仕事のストレス判定図」セクション。
 * 厚労省 結果帳票「仕事のストレス判定図（ひとつの職場／複数の職場）」に相当する
 * 量-コントロール判定図・職場の支援判定図と、各集団の数値表を表示する。
 */

import type { ReactNode } from 'react'
import {
  JOB_STRESS_CAUTION_THRESHOLD,
  JOB_STRESS_CHART_NORMS,
  JOB_STRESS_HIGH_RISK_THRESHOLD,
} from '@/features/stress-check/job-stress-chart'
import { buildJudgmentRows, type JudgmentRow } from '../job-stress-chart-rows'
import type { GroupData } from '../queries'
import JobStressJudgmentChart from './JobStressJudgmentChart'

interface JobStressChartSectionProps {
  groups: GroupData[]
  groupUnitLabel: string
  selectedId?: string | null
  onSelect?: (id: string) => void
}

const N = JOB_STRESS_CHART_NORMS

export default function JobStressChartSection({
  groups,
  groupUnitLabel,
  selectedId,
  onSelect,
}: JobStressChartSectionProps) {
  const rows = buildJudgmentRows(groups)
  const plottable = rows.filter(r => r.isPlottable)

  const demandControlPoints = plottable.map(r => ({
    id: r.id,
    label: r.label,
    name: r.name,
    x: r.workload as number,
    y: r.control as number,
    risk: r.riskA as number,
  }))
  const supportPoints = plottable.map(r => ({
    id: r.id,
    label: r.label,
    name: r.name,
    x: r.supervisor as number,
    y: r.colleague as number,
    risk: r.riskB as number,
  }))

  return (
    <div className="space-y-4">
      {plottable.length === 0 ? (
        <div className="py-10 text-center text-sm text-[#57606a] rounded-lg border border-dashed border-[#e2e6ec] bg-[#f6f8fa]">
          判定図にプロットできる{groupUnitLabel}がありません（受検者が少ない{groupUnitLabel}
          は表示しません）
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <JobStressJudgmentChart
            kind="demandControl"
            title="A：量-コントロール判定図"
            xLabel="仕事の量的負担"
            yLabel="仕事のコントロール"
            points={demandControlPoints}
            norm={{ x: N.workload, y: N.control }}
            selectedId={selectedId}
            onSelect={onSelect}
          />
          <JobStressJudgmentChart
            kind="support"
            title="B：職場の支援判定図"
            xLabel="上司の支援"
            yLabel="同僚の支援"
            points={supportPoints}
            norm={{ x: N.supervisor, y: N.colleague }}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </div>
      )}

      <Legend />

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-[#f6f8fa] text-[#57606a]">
              <Th className="text-center w-10">No.</Th>
              <Th className="text-left">{groupUnitLabel}</Th>
              <Th>人数</Th>
              <Th>量的負担</Th>
              <Th>コントロール</Th>
              <Th>上司の支援</Th>
              <Th>同僚の支援</Th>
              <Th>(A) 量-コントロール</Th>
              <Th>(B) 職場の支援</Th>
              <Th>総合健康リスク</Th>
              <Th>前回比</Th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-[#f6f8fa]/60 text-[#57606a]">
              <Td className="text-center">□</Td>
              <Td className="text-left font-medium">全国平均</Td>
              <Td>—</Td>
              <Td>{N.workload.toFixed(1)}</Td>
              <Td>{N.control.toFixed(1)}</Td>
              <Td>{N.supervisor.toFixed(1)}</Td>
              <Td>{N.colleague.toFixed(1)}</Td>
              <Td>100</Td>
              <Td>100</Td>
              <Td>100</Td>
              <Td>—</Td>
            </tr>
            {rows.map(r => (
              <JudgmentTableRow
                key={r.id}
                row={r}
                isSelected={r.id === selectedId}
                onSelect={onSelect}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-relaxed text-[#57606a]">
        判定図の斜めの線は、仕事のストレス要因から予想される疾病休業などの健康リスクを全国平均＝100
        として表したものです。総合健康リスク＝(A)×(B)÷100。健康リスクが 120
        を超える職場では、仕事のストレスに関する何らかの問題が生じていることが多いとされます（厚労省
        実施マニュアル P86）。男女を区別せず男性用の判定図を使っています。平均点のうち全国平均より
        リスクが高い側の値を赤字にしています。判定図の軸範囲外の値は枠線上に白抜きの点で表示します（実際の値は表とツールチップで確認できます）。
      </p>
    </div>
  )
}

function JudgmentTableRow({
  row,
  isSelected,
  onSelect,
}: {
  row: JudgmentRow
  isSelected: boolean
  onSelect?: (id: string) => void
}) {
  const base = isSelected ? 'bg-blue-50' : 'hover:bg-[#f6f8fa]'
  if (!row.isPlottable) {
    return (
      <tr className="text-[#57606a]">
        <Td className="text-center">—</Td>
        <Td className="text-left">{row.name}</Td>
        {/* マスキング対象は人数も出さない（集団分析の下限人数ルール） */}
        <Td>{row.isSuppressed ? '—' : row.memberCount}</Td>
        <td colSpan={8} className="border border-[#e2e6ec] px-3 py-1 text-center">
          {row.isSuppressed
            ? '受検者が少ないため表示しません'
            : '尺度の回答が不足しているため表示しません'}
        </td>
      </tr>
    )
  }
  return (
    <tr
      className={`${base} ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={onSelect ? () => onSelect(row.id) : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-selected={onSelect ? isSelected : undefined}
      onKeyDown={
        onSelect
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(row.id)
              }
            }
          : undefined
      }
    >
      <Td className="text-center font-bold">{row.label}</Td>
      <Td className="text-left font-medium text-[#24292f]">{row.name}</Td>
      <Td>{row.memberCount}</Td>
      <ScaleTd value={row.workload} isWorse={(row.workload as number) > N.workload} />
      <ScaleTd value={row.control} isWorse={(row.control as number) < N.control} />
      <ScaleTd value={row.supervisor} isWorse={(row.supervisor as number) < N.supervisor} />
      <ScaleTd value={row.colleague} isWorse={(row.colleague as number) < N.colleague} />
      <RiskTd value={row.riskA} />
      <RiskTd value={row.riskB} />
      <RiskTd value={row.total} strong />
      <Td>
        {row.totalDiff == null ? (
          '—'
        ) : (
          <span className={row.totalDiff > 0 ? 'text-rose-600 font-semibold' : 'text-emerald-700'}>
            {row.totalDiff > 0 ? '+' : ''}
            {row.totalDiff.toFixed(1)}
          </span>
        )}
      </Td>
    </tr>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#57606a]">
      <LegendItem swatch="bg-white border border-[#24292f]" label="全国平均" />
      <LegendItem swatch="bg-[#232a33] rounded-full" label="健康リスク 110 未満" />
      <LegendItem swatch="bg-[#FD7601] rounded-full" label="110 以上（要注意）" />
      <LegendItem
        swatch="bg-[#d1242f] rounded-full"
        label={`${JOB_STRESS_HIGH_RISK_THRESHOLD} 以上（高リスク）`}
      />
      <LegendItem swatch="bg-[#fff4d6]" label="110〜120 の領域" />
      <LegendItem swatch="bg-[#ffe0c2]" label="120 以上の領域" />
    </div>
  )
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 ${swatch}`} />
      {label}
    </span>
  )
}

function Th({ children, className = 'text-right' }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={`border border-[#e2e6ec] px-3 py-1.5 font-semibold whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  )
}

function Td({ children, className = 'text-right' }: { children: ReactNode; className?: string }) {
  return (
    <td className={`border border-[#e2e6ec] px-3 py-1 tabular-nums whitespace-nowrap ${className}`}>
      {children}
    </td>
  )
}

function ScaleTd({ value, isWorse }: { value: number | null; isWorse: boolean }) {
  return (
    <Td
      className={`text-right font-mono ${isWorse ? 'text-rose-600 font-semibold' : 'text-[#24292f]'}`}
    >
      {value == null ? '—' : value.toFixed(1)}
    </Td>
  )
}

function RiskTd({ value, strong = false }: { value: number | null; strong?: boolean }) {
  // 表示（整数に丸めた値）と色分けを一致させる
  const shown = value == null ? null : Math.round(value)
  const color =
    shown == null
      ? 'text-[#57606a]'
      : shown >= JOB_STRESS_HIGH_RISK_THRESHOLD
        ? 'text-rose-600'
        : shown >= JOB_STRESS_CAUTION_THRESHOLD
          ? 'text-orange-600'
          : 'text-[#24292f]'
  return (
    <Td className={`text-right font-mono ${color} ${strong ? 'font-bold' : ''}`}>{shown ?? '—'}</Td>
  )
}
