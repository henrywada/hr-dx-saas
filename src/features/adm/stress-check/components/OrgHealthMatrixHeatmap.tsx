'use client'

import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import type { GroupData } from '../queries'

type SortKey =
  | 'code'
  | 'name'
  | 'high_stress_rate'
  | 'health_risk'
  | 'workload'
  | 'control'
  | 'supervisor_support'
  | 'colleague_support'
type SortDir = 'asc' | 'desc'

interface OrgHealthMatrixHeatmapProps {
  groups: GroupData[]
  onSelect: (group: GroupData) => void
  selectedDivisionId?: string | null
}

function healthRiskColor(v: number | null): string {
  if (v == null) return 'bg-[#f6f8fa] text-[#57606a]'
  if (v >= 120) return 'bg-rose-500 text-white'
  if (v >= 110) return 'bg-orange-300 text-orange-900'
  if (v >= 100) return 'bg-amber-100 text-amber-800'
  if (v >= 90) return 'bg-emerald-100 text-emerald-800'
  return 'bg-[#FD7601]-10 text-[#FD7601]'
}

function highStressColor(v: number | null): string {
  if (v == null) return 'bg-[#f6f8fa] text-[#57606a]'
  if (v >= 15) return 'bg-rose-500 text-white'
  if (v >= 10) return 'bg-orange-300 text-orange-900'
  if (v >= 5) return 'bg-amber-100 text-amber-800'
  return 'bg-emerald-100 text-emerald-800'
}

function relativeColor(v: number | null, min: number, max: number, highIsBad: boolean): string {
  if (v == null || max === min) return 'bg-[#f6f8fa] text-[#57606a]'
  const ratio = (v - min) / (max - min)
  if (highIsBad) {
    if (ratio > 0.75) return 'bg-rose-500 text-white'
    if (ratio > 0.5) return 'bg-orange-300 text-orange-900'
    if (ratio > 0.25) return 'bg-amber-100 text-amber-800'
    return 'bg-emerald-100 text-emerald-800'
  } else {
    if (ratio > 0.75) return 'bg-emerald-400 text-emerald-900'
    if (ratio > 0.5) return 'bg-emerald-100 text-emerald-800'
    if (ratio > 0.25) return 'bg-amber-100 text-amber-800'
    return 'bg-orange-300 text-orange-900'
  }
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: '部署名' },
  { key: 'high_stress_rate', label: '高ストレス率' },
  { key: 'health_risk', label: '健康リスク' },
  { key: 'workload', label: '仕事の負担' },
  { key: 'control', label: 'コントロール' },
  { key: 'supervisor_support', label: '上司サポート' },
  { key: 'colleague_support', label: '同僚サポート' },
]

export default function OrgHealthMatrixHeatmap({
  groups,
  onSelect,
  selectedDivisionId,
}: OrgHealthMatrixHeatmapProps) {
  const [sortKey, setSortKey] = useState<SortKey>('code')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const { workloadRange, controlRange, supRange, colRange } = useMemo(() => {
    const valid = groups.filter(g => !g.is_suppressed)
    const vals = (key: keyof GroupData) =>
      valid.map(g => g[key] as number | null).filter((v): v is number => v != null)
    const range = (arr: number[]) =>
      arr.length > 0 ? { min: Math.min(...arr), max: Math.max(...arr) } : { min: 0, max: 1 }
    return {
      workloadRange: range(vals('workload')),
      controlRange: range(vals('control')),
      supRange: range(vals('supervisor_support')),
      colRange: range(vals('colleague_support')),
    }
  }, [groups])

  const sorted = useMemo(() => {
    return [...groups].sort((a, b) => {
      if (sortKey === 'code' || sortKey === 'name') {
        const av = sortKey === 'code' ? (a.code ?? '￿') : a.name
        const bv = sortKey === 'code' ? (b.code ?? '￿') : b.name
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      const av = (a[sortKey] as number | null) ?? -Infinity
      const bv = (b[sortKey] as number | null) ?? -Infinity
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [groups, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 opacity-40" />
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3 w-3 text-[#FD7601]" />
    ) : (
      <ChevronDown className="h-3 w-3 text-[#FD7601]" />
    )
  }

  return (
    <div className="space-y-3">
      {/* カラー凡例 */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[#57606a] font-medium shrink-0">健康リスク:</span>
        {[
          { label: '< 90 良好', cls: 'bg-[#FD7601]-10 text-[#FD7601]' },
          { label: '90–99', cls: 'bg-emerald-100 text-emerald-800' },
          { label: '100–109', cls: 'bg-amber-100 text-amber-800' },
          { label: '110–119 注意', cls: 'bg-orange-300 text-orange-900' },
          { label: '120+ 高リスク', cls: 'bg-rose-500 text-white' },
        ].map(({ label, cls }) => (
          <span key={label} className={`px-2 py-0.5 rounded-full font-medium ${cls}`}>
            {label}
          </span>
        ))}
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto rounded-xl border border-[#e2e6ec] shadow-sm">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#f6f8fa] border-b border-[#e2e6ec]">
              {COLUMNS.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`px-3 py-3 text-xs font-semibold text-[#57606a] uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:bg-[#f6f8fa] transition-colors ${
                    key === 'name'
                      ? 'sticky left-0 bg-[#f6f8fa] z-10 text-left min-w-[120px]'
                      : 'text-center min-w-[72px]'
                  }`}
                >
                  <span
                    className={`flex items-center gap-1 ${key === 'name' ? '' : 'justify-center'}`}
                  >
                    {label}
                    <SortIcon col={key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e6ec]">
            {sorted.map(group => {
              const suppressed = group.is_suppressed
              const isSelected = group.division_id === selectedDivisionId
              const isHighRisk = !suppressed && (group.health_risk ?? 0) >= 120

              return (
                <tr
                  key={group.division_id}
                  onClick={() => onSelect(group)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#f6f8fa] outline outline-2 outline-indigo-400 outline-offset-[-2px]'
                      : isHighRisk
                        ? 'bg-rose-50 hover:bg-rose-100'
                        : 'hover:bg-[#f6f8fa]'
                  }`}
                >
                  {/* 部署名（sticky） */}
                  <td
                    className={`sticky left-0 px-3 py-2.5 z-10 ${
                      isSelected
                        ? 'bg-[#f6f8fa]'
                        : isHighRisk
                          ? 'bg-rose-50 border-l-4 border-rose-500'
                          : 'bg-white'
                    }`}
                  >
                    <div className="font-medium text-[#24292f] leading-tight">{group.name}</div>
                    <div className="text-xs text-[#57606a]">{group.member_count}名</div>
                  </td>

                  {/* 高ストレス率 */}
                  <td className="px-1.5 py-2 text-center">
                    {suppressed ? (
                      <CellSuppressed />
                    ) : (
                      <CellValue
                        value={group.high_stress_rate == null ? '—' : `${Number(group.high_stress_rate).toFixed(1)}%`}
                        colorClass={highStressColor(group.high_stress_rate)}
                      />
                    )}
                  </td>

                  {/* 健康リスク */}
                  <td className="px-1.5 py-2 text-center">
                    {suppressed ? (
                      <CellSuppressed />
                    ) : (
                      <CellValue
                        value={group.health_risk == null ? '—' : Number(group.health_risk).toFixed(1)}
                        colorClass={healthRiskColor(group.health_risk)}
                        bold
                      />
                    )}
                  </td>

                  {/* 仕事の負担 */}
                  <td className="px-1.5 py-2 text-center">
                    {suppressed || group.workload == null ? (
                      <CellSuppressed />
                    ) : (
                      <CellValue
                        value={group.workload.toFixed(1)}
                        colorClass={relativeColor(
                          group.workload,
                          workloadRange.min,
                          workloadRange.max,
                          true
                        )}
                      />
                    )}
                  </td>

                  {/* コントロール */}
                  <td className="px-1.5 py-2 text-center">
                    {suppressed || group.control == null ? (
                      <CellSuppressed />
                    ) : (
                      <CellValue
                        value={group.control.toFixed(1)}
                        colorClass={relativeColor(
                          group.control,
                          controlRange.min,
                          controlRange.max,
                          false
                        )}
                      />
                    )}
                  </td>

                  {/* 上司サポート */}
                  <td className="px-1.5 py-2 text-center">
                    {suppressed || group.supervisor_support == null ? (
                      <CellSuppressed />
                    ) : (
                      <CellValue
                        value={group.supervisor_support.toFixed(1)}
                        colorClass={relativeColor(
                          group.supervisor_support,
                          supRange.min,
                          supRange.max,
                          false
                        )}
                      />
                    )}
                  </td>

                  {/* 同僚サポート */}
                  <td className="px-1.5 py-2 text-center">
                    {suppressed || group.colleague_support == null ? (
                      <CellSuppressed />
                    ) : (
                      <CellValue
                        value={group.colleague_support.toFixed(1)}
                        colorClass={relativeColor(
                          group.colleague_support,
                          colRange.min,
                          colRange.max,
                          false
                        )}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {groups.length === 0 && (
          <div className="py-12 text-center text-[#57606a] text-sm">
            表示できるデータがありません
          </div>
        )}
      </div>
    </div>
  )
}

function CellValue({
  value,
  colorClass,
  bold = false,
}: {
  value: string | number
  colorClass: string
  bold?: boolean
}) {
  return (
    <div className="flex justify-center">
      <span
        className={`inline-block px-2 py-1 rounded-lg text-xs tabular-nums min-w-[3.5rem] text-center ${
          bold ? 'font-bold' : 'font-medium'
        } ${colorClass}`}
      >
        {value}
      </span>
    </div>
  )
}

function CellSuppressed() {
  return (
    <div className="flex justify-center">
      <span className="inline-block px-2 py-1 rounded-lg text-xs font-medium bg-[#f6f8fa] text-[#57606a] min-w-[3.5rem] text-center">
        —
      </span>
    </div>
  )
}
