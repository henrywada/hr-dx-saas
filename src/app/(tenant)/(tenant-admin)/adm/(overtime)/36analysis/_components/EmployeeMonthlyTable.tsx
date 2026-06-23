'use client'

/**
 * 従業員月別残業時間テーブル（Step 4 & 5）
 *
 * レイアウト（画像モックアップ準拠）:
 *  ┌────────────┬──────┬──────┬──────┐
 *  │ 従業員名   │  4月 │  5月 │  6月 │
 *  ├────────────┼──────┼──────┼──────┤
 *  │ 時間外労働 │  46  │  10  │  46  │ ← 45h超は赤ボーダー
 *  ├────────────┼──────┼──────┼──────┤
 *  │ 田中 花子  │      │      │      │ （次の従業員）
 *  │ 時間外労働 │  20  │  58  │  95  │
 *  └────────────┴──────┴──────┴──────┘
 *
 * ハイライト基準（解説書 21ページ：法違反となるケース準拠）:
 *   条件A: 月100h以上           → bg-red-100 border-red-500
 *   条件B: 2〜6ヶ月平均80h超   → bg-pink-100 border-pink-400
 *   条件C: 年7回目以降の45h超  → bg-yellow-100 border-yellow-500
 *   条件D: 年間累計720h超       → bg-orange-100 border-orange-400
 *   注意  : 45h超〜（条件外）  → bg-white border-red-400 (赤枠のみ)
 */

import React, { useEffect, useRef } from 'react'
import { X, AlertTriangle, Info } from 'lucide-react'
import {
  calcMonthlyStatuses,
  type OvertimeThresholds,
  type MonthlyOvertimeData,
} from '@/utils/overtimeThresholds'

// =============================================================================
// 型
// =============================================================================

export type EmpMonthlyRow = {
  employeeId: string
  employeeName: string
  divisionName: string
}

type OvertimeMonthRow = {
  employee_id: string
  year_month: string
  total_overtime_hours: number | null
}

type Props = {
  /** 表示対象の従業員リスト（部署フィルタ済み） */
  employees: EmpMonthlyRow[]
  /** フィルタ済み残業データ */
  overtimeRows: OvertimeMonthRow[]
  /** 集計対象の月一覧（昇順 YYYY-MM） */
  months: string[]
  /** しきい値 */
  thresholds: OvertimeThresholds
  /** 選択部署のフルパス（タイトル用） */
  deptPath: string
  /** 閉じるコールバック */
  onClose: () => void
}

// =============================================================================
// ユーティリティ
// =============================================================================

/** 'YYYY-MM' → 'M月' */
function ymToMonthLabel(ym: string): string {
  const m = Number(ym.split('-')[1])
  return `${m}月`
}

/** 年をまたぐ場合に 'YYYY年M月' を返す */
function ymToFullLabel(ym: string, baseYear: number): string {
  const [y, m] = ym.split('-').map(Number)
  return y !== baseYear ? `${y}/${m}月` : `${m}月`
}

// =============================================================================
// セルスタイル決定
// =============================================================================

type CellStyle = {
  bg: string
  border: string
  reasons: string[]
}

function getCellStyle(
  reasons: string[],
  totalHours: number | null,
  thresholds: OvertimeThresholds,
): CellStyle {
  if (totalHours === null) {
    return { bg: '', border: 'border border-transparent', reasons: [] }
  }

  const hasA = reasons.some((r) => r.includes('100時間'))
  const hasB = reasons.some((r) => r.includes('平均'))
  const hasC = reasons.some((r) => r.includes('回目'))
  const hasD = reasons.some((r) => r.includes('年間累計'))

  if (hasA) {
    return {
      bg: 'bg-red-100',
      border: 'border-2 border-red-500',
      reasons,
    }
  }
  if (hasB) {
    return {
      bg: 'bg-pink-100',
      border: 'border-2 border-pink-400',
      reasons,
    }
  }
  if (hasC) {
    return {
      bg: 'bg-yellow-100',
      border: 'border-2 border-yellow-500',
      reasons,
    }
  }
  if (hasD) {
    return {
      bg: 'bg-orange-100',
      border: 'border-2 border-orange-400',
      reasons,
    }
  }
  if (totalHours > thresholds.monthlyLimit) {
    return {
      bg: 'bg-white',
      border: 'border-2 border-red-400',
      reasons: [`月${thresholds.monthlyLimit}h超過`],
    }
  }
  return { bg: '', border: 'border border-slate-100', reasons: [] }
}

// =============================================================================
// メインコンポーネント
// =============================================================================

export function EmployeeMonthlyTable({
  employees,
  overtimeRows,
  months,
  thresholds,
  deptPath,
  onClose,
}: Props) {
  const tableRef = useRef<HTMLDivElement>(null)

  // マウント時に自動スクロール
  useEffect(() => {
    tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // employee_id → { yearMonth → hours } マップ
  const hoursMap = new Map<string, Map<string, number>>()
  for (const row of overtimeRows) {
    if (!hoursMap.has(row.employee_id)) hoursMap.set(row.employee_id, new Map())
    if (row.total_overtime_hours !== null) {
      hoursMap.get(row.employee_id)!.set(row.year_month, row.total_overtime_hours)
    }
  }

  if (employees.length === 0) {
    return (
      <div ref={tableRef} className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
        <p className="text-slate-400 text-sm">この部署に所属する従業員データがありません</p>
      </div>
    )
  }

  const baseYear = Number(months[0]?.split('-')[0] ?? new Date().getFullYear())

  return (
    <div
      ref={tableRef}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      {/* ===== ヘッダーバー ===== */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span className="text-sm font-bold text-slate-800">{deptPath}</span>
          <span className="text-xs text-slate-500">
            — 従業員別 月次残業時間
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          aria-label="閉じる"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ===== ハイライト凡例 ===== */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-2.5 bg-slate-50/60 border-b border-slate-100 text-[11px] font-medium">
        <span className="text-slate-500 flex items-center gap-1">
          <Info className="w-3 h-3" /> 違反理由：
        </span>
        {[
          { cls: 'bg-red-100 border-2 border-red-500', label: '条件A: 月100h以上' },
          { cls: 'bg-pink-100 border-2 border-pink-400', label: '条件B: 複数月平均80h超' },
          { cls: 'bg-yellow-100 border-2 border-yellow-500', label: '条件C: 年7回目超過' },
          { cls: 'bg-orange-100 border-2 border-orange-400', label: '条件D: 年間累計720h超' },
          { cls: 'bg-white border-2 border-red-400', label: '注意: 月45h超' },
        ].map(({ cls, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`inline-block w-4 h-4 rounded-sm ${cls}`} />
            {label}
          </span>
        ))}
      </div>

      {/* ===== テーブル本体（横スクロール） ===== */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          {/* thead: 月ラベル */}
          <thead>
            <tr className="bg-slate-100">
              <th
                className="sticky left-0 z-10 bg-slate-100 text-left px-4 py-2.5 text-slate-600 font-semibold whitespace-nowrap border-r border-slate-200"
                style={{ minWidth: '140px' }}
              >
                従業員名
              </th>
              <th
                className="px-3 py-2.5 text-slate-500 font-medium text-center whitespace-nowrap border-r border-slate-100"
                style={{ minWidth: '80px' }}
              >
                区分
              </th>
              {months.map((ym) => (
                <th
                  key={ym}
                  className="px-2 py-2.5 text-slate-600 font-semibold text-center whitespace-nowrap border-r border-slate-100"
                  style={{ minWidth: '54px' }}
                >
                  {ymToFullLabel(ym, baseYear)}
                </th>
              ))}
              <th className="px-3 py-2.5 text-slate-600 font-semibold text-center whitespace-nowrap">
                合計
              </th>
            </tr>
          </thead>

          {/* tbody: 従業員ごとに「名前行 + 時間外労働行」 */}
          <tbody>
            {employees.map((emp, empIdx) => {
              const empHoursMap = hoursMap.get(emp.employeeId) ?? new Map<string, number>()

              // calcMonthlyStatuses 用のデータ（全月）
              const monthlyData: MonthlyOvertimeData[] = months.map((ym) => ({
                yearMonth: ym,
                totalHours: empHoursMap.get(ym) ?? 0,
              }))

              // 全月の violation 判定
              const statusResults = calcMonthlyStatuses(monthlyData, thresholds)

              // 期間合計
              const totalHours = monthlyData.reduce((s, m) => s + m.totalHours, 0)

              return (
                <React.Fragment key={emp.employeeId}>
                  {/* ─── 従業員名 行 ─── */}
                  <tr
                    className={`border-t-2 border-slate-200 ${
                      empIdx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'
                    }`}
                  >
                    <td
                      className="sticky left-0 z-10 px-4 py-2 font-bold text-slate-800 whitespace-nowrap border-r border-slate-200"
                      style={{
                        background: empIdx % 2 === 0 ? 'rgb(248 250 252 / 0.5)' : 'white',
                      }}
                    >
                      {emp.employeeName}
                    </td>
                    <td
                      colSpan={months.length + 2}
                      className="px-3 py-2 text-slate-400 text-[11px]"
                    >
                      {emp.divisionName}
                    </td>
                  </tr>

                  {/* ─── 時間外労働 行 ─── */}
                  <tr
                    className={empIdx % 2 === 0 ? 'bg-slate-50/30' : 'bg-white'}
                  >
                    {/* 固定列: 行ラベル */}
                    <td
                      className="sticky left-0 z-10 px-4 py-2 text-slate-500 whitespace-nowrap border-r border-slate-200 border-b border-slate-100 text-[11px] font-medium"
                      style={{
                        background: empIdx % 2 === 0 ? 'rgb(248 250 252 / 0.3)' : 'white',
                      }}
                    >
                      時間外労働
                    </td>

                    {/* 区分列（空） */}
                    <td className="border-b border-slate-100 border-r border-slate-100" />

                    {/* 月別データセル */}
                    {statusResults.map((result, mIdx) => {
                      const hours = empHoursMap.get(result.yearMonth) ?? null
                      const { bg, border, reasons } = getCellStyle(
                        result.reasons,
                        hours,
                        thresholds,
                      )

                      return (
                        <td
                          key={result.yearMonth}
                          className={`
                            px-1 py-2 text-center tabular-nums font-semibold
                            border-b border-slate-100 border-r border-slate-100
                            ${bg} ${border}
                            ${hours !== null && hours > thresholds.monthlyLimit ? 'text-red-700' : 'text-slate-700'}
                          `}
                          title={
                            reasons.length > 0
                              ? `【違反】${reasons.join(' / ')}`
                              : undefined
                          }
                        >
                          {hours !== null ? (
                            <span className="block">
                              {Math.round(hours)}
                            </span>
                          ) : (
                            <span className="text-slate-300">–</span>
                          )}
                        </td>
                      )
                    })}

                    {/* 合計列 */}
                    <td className="px-3 py-2 text-center font-bold tabular-nums border-b border-slate-100 text-slate-700">
                      {Math.round(totalHours)}
                    </td>
                  </tr>
                </React.Fragment>
              )
            })}

            {/* ─── 月別合計 行 ─── */}
            {employees.length > 0 && (
              <tr className="bg-slate-100/80 font-bold border-t-[3px] border-slate-300">
                <td
                  className="sticky left-0 z-10 px-4 py-3 text-slate-800 whitespace-nowrap border-r border-slate-300"
                  style={{ background: 'rgb(241 245 249 / 0.8)' }}
                >
                  月別合計
                </td>
                <td className="border-r border-slate-200" />
                {months.map((ym) => {
                  let monthlySum = 0
                  let hasData = false
                  for (const emp of employees) {
                    const h = hoursMap.get(emp.employeeId)?.get(ym)
                    if (h != null) {
                      monthlySum += h
                      hasData = true
                    }
                  }
                  return (
                    <td
                      key={ym}
                      className="px-1 py-3 text-center tabular-nums text-slate-800 border-r border-slate-200"
                    >
                      {hasData ? Math.round(monthlySum) : <span className="text-slate-400">–</span>}
                    </td>
                  )
                })}
                <td className="px-3 py-3 text-center tabular-nums text-slate-800">
                  {Math.round(
                    months.reduce((acc, ym) => {
                      let s = 0
                      for (const emp of employees) {
                        const h = hoursMap.get(emp.employeeId)?.get(ym)
                        if (h != null) s += h
                      }
                      return acc + s
                    }, 0)
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== フッター: 件数 ===== */}
      <div className="px-5 py-2.5 border-t border-slate-100 text-xs text-slate-400 text-right">
        {employees.length}名 / {months.length}ヶ月間
      </div>
    </div>
  )
}
