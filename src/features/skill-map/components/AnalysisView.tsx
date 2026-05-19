'use client'

import { useMemo, useState } from 'react'
import { Users, CheckCircle, AlertCircle } from 'lucide-react'
import type { EmployeeCompletionRow, TenantSkillWithRequirements } from '../types'
import { CSVDownloadButton } from '@/components/ui/CSVDownloadButton'

type DivisionOption = { id: string; name: string; pathLabel: string }

type Props = {
  rows: EmployeeCompletionRow[]
  skills: TenantSkillWithRequirements[]
  divisions: DivisionOption[]
}

export function AnalysisView({ rows, skills, divisions }: Props) {
  const [divisionId, setDivisionId] = useState('')
  const [filterSkillId, setFilterSkillId] = useState('')

  // 部署フィルター
  const filtered = useMemo(() => {
    if (!divisionId || divisionId === 'all') return rows
    return rows.filter(r => r.division_id === divisionId)
  }, [rows, divisionId])

  // 職種フィルターで表示する skill を絞り込む
  const visibleSkills = useMemo(() => {
    if (!filterSkillId) return skills
    return skills.filter(s => s.id === filterSkillId)
  }, [skills, filterSkillId])

  // サマリー計算
  const summary = useMemo(() => {
    const withSkills = filtered.filter(r => r.totalRequirements > 0)
    const avgRate =
      withSkills.length > 0
        ? Math.round(
            withSkills.reduce((s, r) => s + (r.completionRate ?? 0), 0) / withSkills.length
          )
        : null
    const fullCount = filtered.filter(r => r.completionRate === 100).length

    // 最多ギャップ職種
    const gapBySkill = new Map<string, number>()
    for (const row of filtered) {
      for (const skill of skills) {
        if (!row.assignedSkillIds.includes(skill.id)) continue
        const gaps = skill.requirements.filter(
          r => row.requirementCompletions[r.id] === false
        ).length
        gapBySkill.set(skill.id, (gapBySkill.get(skill.id) ?? 0) + gaps)
      }
    }
    let maxGapSkillName = '—'
    let maxGap = 0
    for (const [skillId, gap] of gapBySkill) {
      if (gap > maxGap) {
        maxGap = gap
        maxGapSkillName = skills.find(s => s.id === skillId)?.name ?? '—'
      }
    }

    return { avgRate, fullCount, total: filtered.length, maxGapSkillName }
  }, [filtered, skills])

  // ヒートマップ列（requirement）を構築
  const heatmapColumns = useMemo(() => {
    const cols: Array<{
      skillId: string
      skillName: string
      reqId: string
      reqName: string
      /** 列ヘッダーに表示するラベル（レベル名があればレベル名、なければ要件名） */
      colLabel: string
    }> = []
    for (const skill of visibleSkills) {
      for (const req of skill.requirements) {
        const levelName = req.level?.name?.trim()
        const colLabel = levelName ? `${req.name}（${levelName}）` : req.name
        cols.push({ skillId: skill.id, skillName: skill.name, reqId: req.id, reqName: req.name, colLabel })
      }
    }
    return cols
  }, [visibleSkills])

  // ヒートマップに表示する従業員行
  const heatmapRows = useMemo(() => {
    if (!filterSkillId) return filtered
    return filtered.filter(r => r.assignedSkillIds.includes(filterSkillId))
  }, [filtered, filterSkillId])

  // CSV データ生成
  const csvData = useMemo((): string[][] => {
    const header = ['部署', '従業員番号', '氏名', '充足率(%)', '職種', '要件名', '達成']
    const dataRows: string[][] = []
    for (const row of filtered) {
      for (const skill of skills) {
        if (!row.assignedSkillIds.includes(skill.id)) continue
        for (const req of skill.requirements) {
          dataRows.push([
            row.division_name ?? '—',
            row.employee_no ?? '—',
            row.full_name ?? '—',
            row.completionRate !== null ? String(row.completionRate) : '—',
            skill.name,
            req.name,
            row.requirementCompletions[req.id] ? '○' : '×',
          ])
        }
        if (skill.requirements.length === 0) {
          dataRows.push([
            row.division_name ?? '—',
            row.employee_no ?? '—',
            row.full_name ?? '—',
            row.completionRate !== null ? String(row.completionRate) : '—',
            skill.name,
            '—',
            '—',
          ])
        }
      }
    }
    return [header, ...dataRows]
  }, [filtered, skills])

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<Users className="h-5 w-5 text-primary" />}
          label="全体平均充足率"
          value={summary.avgRate !== null ? `${summary.avgRate}%` : '—'}
          sub={`対象 ${summary.total} 名`}
        />
        <SummaryCard
          icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
          label="充足率 100%"
          value={`${summary.fullCount} 名`}
          sub={`/ ${summary.total} 名`}
        />
        <SummaryCard
          icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
          label="最多ギャップ職種"
          value={summary.maxGapSkillName}
          sub="未達成要件が最多"
        />
      </div>

      {/* フィルター + CSV */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <label className="shrink-0 text-sm font-medium text-gray-800">組織：</label>
            <select
              value={divisionId}
              onChange={e => setDivisionId(e.target.value)}
              className="min-w-48 max-w-xl rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              <option value=""></option>
              <option value="all">すべて</option>
              {divisions.map(d => (
                <option key={d.id} value={d.id}>
                  {d.pathLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <label className="shrink-0 text-sm font-medium text-gray-800">職種：</label>
            <select
              value={filterSkillId}
              onChange={e => setFilterSkillId(e.target.value)}
              className="min-w-48 max-w-xl rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              <option value="">すべて</option>
              {skills.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <CSVDownloadButton
          data={csvData}
          filename="skill-map-analysis.csv"
          label="CSVダウンロード"
        />
      </div>

      {/* ヒートマップ */}
      {heatmapColumns.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500">
          要件が登録されていません
        </p>
      ) : heatmapRows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500">
          該当する従業員がいません
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                {/* 職種グループ行 */}
                <tr className="bg-gray-100">
                  <th
                    className="border-b border-r border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-700"
                    rowSpan={2}
                  >
                    部署
                  </th>
                  <th
                    className="border-b border-r border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-700"
                    rowSpan={2}
                  >
                    番号
                  </th>
                  <th
                    className="border-b border-r border-gray-300 px-3 py-2 text-left text-xs font-semibold text-gray-700"
                    rowSpan={2}
                  >
                    氏名
                  </th>
                  {visibleSkills.map(skill => (
                    <th
                      key={skill.id}
                      colSpan={skill.requirements.length || 1}
                      className="border-b border-r border-gray-300 px-2 py-1.5 text-center"
                    >
                      <span
                        className="inline-block rounded px-2 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: `${skill.color_hex}25`, color: skill.color_hex }}
                      >
                        {skill.name}
                      </span>
                    </th>
                  ))}
                  <th
                    className="border-b border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-700"
                    rowSpan={2}
                  >
                    充足率
                  </th>
                </tr>
                {/* 要件名行 */}
                <tr className="bg-gray-50">
                  {heatmapColumns.map(col => (
                    <th
                      key={col.reqId}
                      className="border-b border-r border-gray-200 px-1 py-1.5"
                      style={{ minWidth: '2.5rem', maxWidth: '6rem' }}
                    >
                      <div
                        className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-normal text-gray-500"
                        title={col.colLabel}
                      >
                        {col.colLabel}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapRows.map((row, idx) => (
                  <tr
                    key={row.employee_id}
                    className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <td className="whitespace-nowrap border-r border-gray-100 px-3 py-2 text-xs text-gray-500">
                      {row.division_name ?? '—'}
                    </td>
                    <td className="whitespace-nowrap border-r border-gray-100 px-3 py-2 font-mono text-xs text-gray-700">
                      {row.employee_no ?? '—'}
                    </td>
                    <td className="whitespace-nowrap border-r border-gray-100 px-3 py-2 text-xs font-medium text-gray-900">
                      {row.full_name ?? '—'}
                    </td>

                    {heatmapColumns.map(col => {
                      const isAssigned = row.assignedSkillIds.includes(col.skillId)
                      if (!isAssigned) {
                        return (
                          <td
                            key={col.reqId}
                            className="border-r border-gray-100 bg-gray-100 px-1 py-2 text-center text-xs text-gray-300"
                          >
                            —
                          </td>
                        )
                      }
                      const done = row.requirementCompletions[col.reqId]
                      return (
                        <td
                          key={col.reqId}
                          className={`border-r border-gray-100 px-1 py-2 text-center text-xs font-medium ${
                            done ? 'bg-primary/10 text-primary' : 'bg-red-50 text-red-400'
                          }`}
                          title={`${col.colLabel}: ${done ? '達成' : '未達成'}`}
                        >
                          {done ? '✓' : '✗'}
                        </td>
                      )
                    })}

                    <td className="whitespace-nowrap px-3 py-2">
                      {row.completionRate !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className={`h-full rounded-full ${
                                row.completionRate === 100
                                  ? 'bg-emerald-500'
                                  : row.completionRate >= 50
                                    ? 'bg-primary'
                                    : 'bg-amber-400'
                              }`}
                              style={{ width: `${row.completionRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">
                            {row.completionRate}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 ring-1 ring-gray-200">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-0.5 truncate text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  )
}
