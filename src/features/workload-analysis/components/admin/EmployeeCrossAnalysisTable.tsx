'use client'

import { DataTable, type Column } from '@/components/ui/DataTable'
import { STATUS_LABELS, STATUS_BG_CLASSES, type OvertimeStatus } from '@/utils/overtimeThresholds'
import type { EmployeeCrossAnalysisResult, EmployeeCrossAnalysisFlags } from '../../cross-analysis'

interface TableRow {
  employeeId: string
  employeeName: string
  divisionName: string
  latestOvertimeHours: number
  latestOvertimeStatus: OvertimeStatus
  latestLoggedHours: number
  latestGapRatio: number | null
  flags: EmployeeCrossAnalysisFlags
  isAttentionNeeded: boolean
}

function toTableRow(result: EmployeeCrossAnalysisResult): TableRow {
  const latest = result.months[result.months.length - 1] ?? null
  return {
    employeeId: result.employeeId,
    employeeName: result.employeeName,
    divisionName: result.divisionName ?? '未配属',
    latestOvertimeHours: latest?.overtimeHours ?? 0,
    latestOvertimeStatus: latest?.overtimeStatus ?? 'safe',
    latestLoggedHours: latest?.loggedHours ?? 0,
    latestGapRatio: latest?.gapRatio ?? null,
    flags: result.flags,
    isAttentionNeeded: result.isAttentionNeeded,
  }
}

const FLAG_LABEL: Record<keyof EmployeeCrossAnalysisFlags, string> = {
  sustainedOvertime: '継続的残業',
  underReportedGap: '申告乖離',
  workloadConcentration: 'タスク集中',
}

function FlagBadges({ flags }: { flags: EmployeeCrossAnalysisFlags }) {
  const active = (Object.keys(flags) as Array<keyof EmployeeCrossAnalysisFlags>).filter(
    key => flags[key]
  )
  if (active.length === 0) return <span className="text-xs text-slate-400">-</span>
  return (
    <div className="flex flex-wrap gap-1">
      {active.map(key => (
        <span
          key={key}
          className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700"
        >
          {FLAG_LABEL[key]}
        </span>
      ))}
    </div>
  )
}

const columns: Column<TableRow>[] = [
  { key: 'employeeName', label: '氏名', sortable: true },
  { key: 'divisionName', label: '部門', sortable: true },
  {
    key: 'latestOvertimeStatus',
    label: '直近月残業',
    render: (value: OvertimeStatus, item: TableRow) => (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BG_CLASSES[value]}`}
      >
        {item.latestOvertimeHours}h（{STATUS_LABELS[value]}）
      </span>
    ),
  },
  {
    key: 'latestLoggedHours',
    label: '直近月申告工数',
    render: (value: number) => `${value}h`,
  },
  {
    key: 'latestGapRatio',
    label: '乖離率',
    render: (value: number | null) =>
      value === null ? 'データ不足' : `${Math.round(value * 100)}%`,
  },
  {
    key: 'flags',
    label: '該当フラグ',
    render: (value: EmployeeCrossAnalysisFlags) => <FlagBadges flags={value} />,
  },
]

interface EmployeeCrossAnalysisTableProps {
  results: EmployeeCrossAnalysisResult[]
}

/** 従業員別の残業×工数クロス分析一覧（要注意メンバーを先頭にソート） */
export function EmployeeCrossAnalysisTable({ results }: EmployeeCrossAnalysisTableProps) {
  const rows = [...results]
    .sort((a, b) => Number(b.isAttentionNeeded) - Number(a.isAttentionNeeded))
    .map(toTableRow)

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <h2 className="text-sm font-semibold text-slate-900">
        従業員別クロス分析（{rows.length}名）
      </h2>
      <div className="mt-3">
        {rows.length === 0 ? (
          <p className="text-xs text-slate-500">分析対象の従業員がいません。</p>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            getRowId={r => r.employeeId}
            searchable
            searchKey="employeeName"
            searchPlaceholder="氏名で検索..."
          />
        )}
      </div>
    </div>
  )
}
