'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { Shield, ChevronDown } from 'lucide-react'
import { KpiCards } from './KpiCards'
import { DeptGroupedBarChart, type DeptGroupData } from './DeptGroupedBarChart'
import { OvertimeTrendChart } from './OvertimeTrendChart'
import {
  EmployeeMonthlyTable,
  type EmpMonthlyRow,
} from './EmployeeMonthlyTable'
import {
  calcOvertimeKpi,
  getSingleMonthStatus,
  type OvertimeThresholds,
  type EmployeeAnnualSummary,
  type OvertimeStatus,
  STATUS_COLORS,
} from '@/utils/overtimeThresholds'

// =============================================================================
// DB行の型（page.tsx から渡される）
// =============================================================================

type DivisionRow = {
  id: string
  name: string | null
  parent_id: string | null
  layer: number | null
}

type EmployeeRow = {
  id: string
  name: string | null
  division_id: string | null
}

type OvertimeMonthRow = {
  employee_id: string
  year_month: string
  total_overtime_hours: number | null
}

type Props = {
  thresholds: OvertimeThresholds
  divisions: DivisionRow[]
  employees: EmployeeRow[]
  overtimeRows: OvertimeMonthRow[]
}

// =============================================================================
// 部署ツリーユーティリティ
// =============================================================================

/** 部署ツリーノード */
type DivNode = DivisionRow & {
  children: DivNode[]
  /** ルートからのフルパス（例: SaaS開発_全社 / 東京事務所 / 人事部） */
  fullPath: string
}

/** divisions 配列からツリーを構築する */
function buildDivTree(divisions: DivisionRow[]): DivNode[] {
  const nodeMap = new Map<string, DivNode>()
  for (const d of divisions) {
    nodeMap.set(d.id, { ...d, children: [], fullPath: d.name ?? '' })
  }

  const roots: DivNode[] = []
  for (const node of nodeMap.values()) {
    if (!node.parent_id) {
      roots.push(node)
    } else {
      const parent = nodeMap.get(node.parent_id)
      if (parent) {
        parent.children.push(node)
      } else {
        roots.push(node) // 親が見つからない場合はrootとして扱う
      }
    }
  }

  // フルパスを再帰的に構築
  function buildPaths(node: DivNode, parentPath: string) {
    node.fullPath = parentPath
      ? `${parentPath} / ${node.name ?? ''}`
      : (node.name ?? '')
    for (const child of node.children) {
      buildPaths(child, node.fullPath)
    }
  }
  for (const root of roots) buildPaths(root, '')

  return roots
}

/**
 * 指定レベル（layer）に表示すべき部署ノードを返す
 *
 * ルール:
 *  - layer === targetLayer のノードを返す
 *  - あるノードが targetLayer 未満のlayerを持ちかつ子孫に targetLayer のノードがない場合、
 *    そのノード自体を「リーフとして」返す（例: 関西事務所にlayer=3の子なし → level3でも表示）
 */
function getDivisionsAtLevel(
  roots: DivNode[],
  targetLayer: number,
): DivNode[] {
  const result: DivNode[] = []

  function walk(node: DivNode) {
    const nodeLayer = node.layer ?? 0
    if (nodeLayer === targetLayer) {
      result.push(node)
      return
    }
    if (nodeLayer > targetLayer) return // 深すぎる

    // layer < targetLayer: 子を探索
    if (node.children.length === 0) {
      // リーフノードとして採用
      result.push(node)
    } else {
      let foundChild = false
      for (const child of node.children) {
        const before = result.length
        walk(child)
        if (result.length > before) foundChild = true
      }
      if (!foundChild) {
        // 子孫に targetLayer のノードがないのでこのノード自体を表示
        result.push(node)
      }
    }
  }

  for (const root of roots) walk(root)
  return result
}

/** ツリー内から id 一致のノードを深さ優先で探す */
function findNodeById(nodes: DivNode[], id: string): DivNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    const found = findNodeById(n.children, id)
    if (found) return found
  }
  return null
}

/** 指定ノード配下（子孫を含む）の全 division_id を収集 */
function collectDescendantIds(node: DivNode): Set<string> {
  const ids = new Set<string>([node.id])
  function walk(n: DivNode) {
    for (const c of n.children) {
      ids.add(c.id)
      walk(c)
    }
  }
  walk(node)
  return ids
}

// =============================================================================
// グラフデータ構築
// =============================================================================

function buildDeptGroupData(
  deptNodes: DivNode[],
  employees: EmployeeRow[],
  overtimeRows: OvertimeMonthRow[],
  thresholds: OvertimeThresholds,
): DeptGroupData[] {
  // employeeId → 最新月の残業時間 マップ
  const latestOvertimeByEmp = new Map<string, number>()
  for (const row of overtimeRows) {
    // year_month 昇順なので後から来るほど新しい → 上書きで最新を保持
    if (row.total_overtime_hours !== null) {
      latestOvertimeByEmp.set(row.employee_id, row.total_overtime_hours)
    }
  }

  // employeeId → EmployeeRow マップ
  const empById = new Map<string, EmployeeRow>()
  for (const emp of employees) empById.set(emp.id, emp)

  return deptNodes.map((node) => {
    const descendantIds = collectDescendantIds(node)

    // この部署（配下含む）の従業員
    const deptEmps = employees.filter(
      (e) => e.division_id && descendantIds.has(e.division_id),
    )

    const counts: Record<OvertimeStatus, number> = {
      safe: 0, warning: 0, danger: 0, critical: 0, violation: 0,
    }

    for (const emp of deptEmps) {
      const hours = latestOvertimeByEmp.get(emp.id) ?? 0
      const status = getSingleMonthStatus(hours, thresholds)
      counts[status]++
    }

    return {
      deptPath: node.fullPath,
      divisionId: node.id,
      counts,
      total: deptEmps.length,
    }
  })
}

// =============================================================================
// EmployeeAnnualSummary 構築（KPI 用）
// =============================================================================

function buildEmployeeAnnualSummaries(
  employees: EmployeeRow[],
  overtimeRows: OvertimeMonthRow[],
): EmployeeAnnualSummary[] {
  // employeeId → 月別マップ
  const monthsByEmp = new Map<string, Map<string, number>>()
  for (const row of overtimeRows) {
    if (!monthsByEmp.has(row.employee_id)) {
      monthsByEmp.set(row.employee_id, new Map())
    }
    monthsByEmp
      .get(row.employee_id)!
      .set(row.year_month, row.total_overtime_hours ?? 0)
  }

  return employees.map((emp) => {
    const monthMap = monthsByEmp.get(emp.id) ?? new Map()
    const months = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([yearMonth, totalHours]) => ({ yearMonth, totalHours }))
    return {
      employeeId: emp.id,
      employeeName: emp.name ?? '',
      departmentName: '',
      months,
    }
  })
}

// =============================================================================
// 年月ユーティリティ
// =============================================================================

/** JSTの現在年月を 'YYYY-MM' 形式で返す */
function getJSTYearMonth(): string {
  const now = new Date()
  // JST = UTC+9
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const y = jst.getUTCFullYear()
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** 基準年月から deltaMonths ヶ月ずらした 'YYYY-MM' を返す */
function shiftYm(base: string, deltaMonths: number): string {
  const [y, m] = base.split('-').map(Number)
  const d = new Date(y, m - 1 + deltaMonths, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 表示ラベル用: 'YYYY-MM' → 'YYYY/MM' */
function fmtYmLabel(ym: string): string {
  return ym.replace('-', '/')
}

/**
 * 開始・終了の年月選択肢を生成する
 *  - 選択肢範囲: 18ヶ月前（1.5年前）〜 当月
 */
function buildYmOptions(currentYm: string): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  for (let delta = -18; delta <= 0; delta++) {
    const ym = shiftYm(currentYm, delta)
    options.push({ value: ym, label: fmtYmLabel(ym) })
  }
  return options
}

// =============================================================================
// レベル選択肢の動的生成
// =============================================================================

function buildLevelOptions(divisions: DivisionRow[]) {
  const layers = [...new Set(divisions.map((d) => d.layer ?? 0))].sort(
    (a, b) => a - b,
  )
  return layers.map((l) => ({
    value: String(l),
    label: `レベル ${l}${l === 0 ? '（全社）' : ''}`,
  }))
}

// =============================================================================
// メインコンポーネント
// =============================================================================

export function AnalysisDashboard({
  thresholds,
  divisions,
  employees,
  overtimeRows,
}: Props) {
  // ===== 年月レンジ state =====
  const currentYm = getJSTYearMonth()          // 例: '2026-04'
  const defaultStartYm = shiftYm(currentYm, -12) // 1年前
  const defaultEndYm = currentYm               // 当月

  const ymOptions = useMemo(() => buildYmOptions(currentYm), [currentYm])

  const [startYm, setStartYm] = useState(defaultStartYm)
  const [endYm, setEndYm] = useState(defaultEndYm)

  // 選択範囲で overtimeRows をフィルタリング
  const filteredOvertimeRows = useMemo(
    () =>
      overtimeRows.filter((row) => {
        const ym = row.year_month.slice(0, 7)
        return ym >= startYm && ym <= endYm
      }),
    [overtimeRows, startYm, endYm],
  )

  // ===== 部署ツリー =====
  // ツリー構築（一度だけ）
  const divTree = useMemo(() => buildDivTree(divisions), [divisions])

  // 利用可能なレベル一覧
  const levelOptions = useMemo(
    () => buildLevelOptions(divisions),
    [divisions],
  )

  // デフォルトは最小レイヤー
  const defaultLevel = levelOptions[0]?.value ?? '0'
  const [selectedLevel, setSelectedLevel] = useState(defaultLevel)

  // 選択レベルの部署ノード
  const targetLayer = Number(selectedLevel)
  const deptNodes = useMemo(
    () => getDivisionsAtLevel(divTree, targetLayer),
    [divTree, targetLayer],
  )

  // KPI 用: 全従業員の年間サマリー（フィルタ済み）
  const employeeSummaries = useMemo(
    () => buildEmployeeAnnualSummaries(employees, filteredOvertimeRows),
    [employees, filteredOvertimeRows],
  )

  // KPI 集計
  const kpi = useMemo(
    () => calcOvertimeKpi(employeeSummaries, thresholds),
    [employeeSummaries, thresholds],
  )

  // グラフデータ（フィルタ済み）
  const deptGroupData = useMemo(
    () => buildDeptGroupData(deptNodes, employees, filteredOvertimeRows, thresholds),
    [deptNodes, employees, filteredOvertimeRows, thresholds],
  )

  // ===== クリックされた部署 State =====
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)

  const handleDeptClick = useCallback((divisionId: string) => {
    setSelectedDivisionId((prev) => (prev === divisionId ? null : divisionId))
    setTimeout(() => {
      document
        .getElementById('employee-monthly-table')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
  }, [])

  // 選択部署ノード & 子孫 ID セット
  const selectedNode = useMemo(
    () => (selectedDivisionId ? findNodeById(divTree, selectedDivisionId) : null),
    [divTree, selectedDivisionId],
  )
  const selectedDescendantIds = useMemo(
    () => (selectedNode ? collectDescendantIds(selectedNode) : new Set<string>()),
    [selectedNode],
  )

  // ===== 集計対象月リスト（startYm〜endYm） =====
  const months = useMemo(() => {
    const result: string[] = []
    let cur = startYm
    while (cur <= endYm) {
      result.push(cur)
      const [y, m] = cur.split('-').map(Number)
      const next = new Date(y, m, 1)
      cur = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
    }
    return result
  }, [startYm, endYm])

  // division_id → 部署名 マップ（テーブルの部署名表示用）
  const divNameMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of divisions) m.set(d.id, d.name ?? '')
    return m
  }, [divisions])

  // テーブル用 従業員リスト（選択部署の子孫に所属する従業員）
  const deptEmployees = useMemo((): EmpMonthlyRow[] => {
    if (!selectedNode) return []
    return employees
      .filter((e) => e.division_id && selectedDescendantIds.has(e.division_id))
      .map((e) => ({
        employeeId: e.id,
        employeeName: e.name ?? '（名前なし）',
        divisionName: e.division_id ? (divNameMap.get(e.division_id) ?? '') : '',
      }))
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName, 'ja'))
  }, [selectedNode, employees, selectedDescendantIds, divNameMap])

  return (

    <div className="space-y-8 max-w-7xl mx-auto pt-6 pb-12">
      {/* ===== ページヘッダー ===== */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              36協定 遵守状況ダッシュボード
            </h1>
          </div>
          <p className="text-sm text-slate-500 ml-11">
            時間外・休日労働の上限規制に対するリスクを一覧管理します。
          </p>
        </div>

        {/* しきい値バッジ */}
        <div className="flex flex-wrap gap-2 text-xs ml-11 sm:ml-0">
          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-medium">
            原則上限: 月{thresholds.monthlyLimit}h / 年{thresholds.annualLimit}h
          </span>
          <span className="px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full font-medium">
            特別条項: 単月{thresholds.singleMonthSpecialLimit}h未満 / 平均{thresholds.averageLimit}h以内
          </span>
        </div>
      </div>

      {/* ===== 年月レンジセレクター ===== */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
          集計期間
        </span>

        {/* 開始年月 */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="start-ym-select"
            className="text-xs font-medium text-slate-500 whitespace-nowrap"
          >
            開始年月
          </label>
          <div className="relative">
            <select
              id="start-ym-select"
              value={startYm}
              onChange={(e) => {
                setStartYm(e.target.value)
                // 開始 > 終了になった場合は終了を開始に合わせる
                if (e.target.value > endYm) setEndYm(e.target.value)
              }}
              className="appearance-none bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-slate-800 shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-colors cursor-pointer"
            >
              {ymOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        <span className="text-slate-300 font-bold text-lg select-none">〜</span>

        {/* 終了年月 */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="end-ym-select"
            className="text-xs font-medium text-slate-500 whitespace-nowrap"
          >
            終了年月
          </label>
          <div className="relative">
            <select
              id="end-ym-select"
              value={endYm}
              onChange={(e) => {
                setEndYm(e.target.value)
                // 終了 < 開始になった場合は開始を終了に合わせる
                if (e.target.value < startYm) setStartYm(e.target.value)
              }}
              className="appearance-none bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-slate-800 shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-colors cursor-pointer"
            >
              {ymOptions
                .filter((opt) => opt.value >= startYm)
                .map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* 集計月数バッジ */}
        {(() => {
          const [sy, sm] = startYm.split('-').map(Number)
          const [ey, em] = endYm.split('-').map(Number)
          const months = (ey - sy) * 12 + (em - sm) + 1
          return (
            <span className="ml-1 text-xs text-slate-500 bg-slate-100 rounded-full px-2.5 py-1 font-medium">
              {months}ヶ月間
            </span>
          )
        })()}
      </div>

      <OvertimeTrendChart yearMonth={endYm} startYm={startYm} endYm={endYm} />

      {/* ===== 部署レベルセレクター ===== */}
      <div className="flex items-center gap-3 flex-wrap">
        <label
          htmlFor="level-select"
          className="text-sm font-semibold text-slate-700 whitespace-nowrap"
        >
          集計範囲（部署レベル）
        </label>
        <div className="relative">
          <select
            id="level-select"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="appearance-none bg-white border border-slate-300 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-colors cursor-pointer"
          >
            {levelOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
        <span className="text-xs text-slate-400">
          ※ 選択レベルの部署単位で集計（子孫を含む）
        </span>
      </div>

      {/* ===== KPI カード ===== */}
      <KpiCards kpi={kpi} />

      {/* ===== ステータス凡例 ===== */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
        <span className="text-slate-500">凡例：</span>
        {(
          [
            { label: '安全（〜45h）', color: STATUS_COLORS.safe },
            { label: '注意（45〜60h）', color: STATUS_COLORS.warning },
            { label: '危険（60〜80h）', color: STATUS_COLORS.danger },
            { label: '重大（80〜100h）', color: STATUS_COLORS.critical },
            { label: '法違反（100h〜）', color: STATUS_COLORS.violation },
          ] as const
        ).map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* ===== 部署別グループ棒グラフ ===== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <DeptGroupedBarChart
          data={deptGroupData}
          thresholds={thresholds}
          onDeptClick={handleDeptClick}
          selectedDivisionId={selectedDivisionId ?? undefined}
        />
      </div>

      {/* ===== 従業員月別テーブル ===== */}
      <div id="employee-monthly-table">
        {selectedNode ? (
          <EmployeeMonthlyTable
            employees={deptEmployees}
            overtimeRows={filteredOvertimeRows}
            months={months}
            thresholds={thresholds}
            deptPath={selectedNode.fullPath}
            onClose={() => setSelectedDivisionId(null)}
          />
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-slate-400 text-sm">
              📋 部署カードをクリックすると従業員別の月次残業時間を表示します
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
