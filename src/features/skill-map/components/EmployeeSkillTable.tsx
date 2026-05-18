'use client'

import { useMemo, useState } from 'react'
import { Layers } from 'lucide-react'
import type { TenantSkillWithRequirements, EmployeeSkillRow } from '../types'
import { SkillBadge } from './SkillBadge'
import { AssignSkillModal } from './AssignSkillModal'
import { EmployeeSkillMatrixModal } from './EmployeeSkillMatrixModal'

/** フィルター用（階層フルパス表示） */
type DivisionOption = { id: string; name: string; pathLabel: string }

type Props = {
  rows: EmployeeSkillRow[]
  skills: TenantSkillWithRequirements[]
  divisions: DivisionOption[]
}

/** モーダル見出し：氏名優先、番号を併記 */
function employeeModalLabel(row: EmployeeSkillRow): string {
  const name = row.full_name?.trim()
  const no = row.employee_no?.trim()
  if (name && no) return `${name}（${no}）`
  return name || no || row.employee_id
}

export function EmployeeSkillTable({ rows, skills, divisions }: Props) {
  const [divisionId, setDivisionId] = useState('')
  const [assignModalRow, setAssignModalRow] = useState<EmployeeSkillRow | null>(null)
  const [matrixModalRow, setMatrixModalRow] = useState<EmployeeSkillRow | null>(null)

  const pathById = useMemo(() => new Map(divisions.map(d => [d.id, d.pathLabel])), [divisions])

  const filtered =
    divisionId === '' || divisionId === 'all'
      ? rows
      : rows.filter(r => r.division_id === divisionId)

  const divisionLabel =
    divisionId === '' || divisionId === 'all'
      ? 'すべて'
      : (divisions.find(d => d.id === divisionId)?.pathLabel ?? '—')

  /** 一覧の部署列：階層フルパス（不明時は DB の部署名のみ） */
  function divisionCellLabel(row: EmployeeSkillRow) {
    if (row.division_id) {
      const path = pathById.get(row.division_id)
      if (path) return path
    }
    return row.division_name ?? '—'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <label
          htmlFor="skill-map-division-filter"
          className="shrink-0 text-sm font-medium text-gray-800"
        >
          組織
        </label>
        <select
          id="skill-map-division-filter"
          value={divisionId}
          onChange={e => setDivisionId(e.target.value)}
          className="max-w-xl rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 sm:min-w-72 md:min-w-96"
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

      <h2 className="text-sm font-semibold text-gray-800">
        <span className="text-gray-900">{divisionLabel}</span>
        <span className="font-normal text-gray-500"> の従業員</span>
      </h2>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  部署
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  従業員番号
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  氏名
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                  現在の職種
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="border-b border-gray-100 px-4 py-8 text-center text-gray-400"
                  >
                    該当する従業員がいません
                  </td>
                </tr>
              ) : (
                filtered.map((row, index) => {
                  const assignments = Object.values(row.currentAssignments)
                  const assignedSkills = assignments
                    .map(a => skills.find(s => s.id === a.skill_id))
                    .filter(Boolean) as TenantSkillWithRequirements[]
                  return (
                    <tr
                      key={row.employee_id}
                      className={`border-b border-gray-100 transition-[background-color,box-shadow] duration-300 ease-out hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)] ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="max-w-xs px-4 py-3 text-gray-700 wrap-break-word whitespace-normal md:max-w-md">
                        {divisionCellLabel(row)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-900">
                        {row.employee_no ?? '—'}
                      </td>
                      <td className="max-w-[12rem] px-4 py-3 text-gray-900">
                        {(row.full_name && row.full_name.trim()) || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {assignedSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {assignedSkills.map(skill => (
                              <SkillBadge key={skill.id} skill={skill} size="sm" />
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">未設定</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                          <button
                            type="button"
                            onClick={() => setAssignModalRow(row)}
                            className="text-xs text-primary hover:underline"
                          >
                            {assignments.length === 0 ? '＋ 割り当て' : '✏️ 編集'}
                          </button>
                          <button
                            type="button"
                            disabled={assignments.length === 0}
                            title={
                              assignments.length === 0
                                ? '職種を割り当ててから利用できます'
                                : undefined
                            }
                            onClick={() => setMatrixModalRow(row)}
                            className={`inline-flex items-center gap-1 text-xs ${
                              assignments.length === 0
                                ? 'cursor-not-allowed text-gray-400'
                                : 'text-primary hover:underline'
                            }`}
                            aria-label="スキル編集"
                            aria-disabled={assignments.length === 0}
                          >
                            <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            スキル編集
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {assignModalRow && (
        <AssignSkillModal
          employeeId={assignModalRow.employee_id}
          employeeName={employeeModalLabel(assignModalRow)}
          skills={skills}
          currentAssignments={Object.values(assignModalRow.currentAssignments)}
          onClose={() => setAssignModalRow(null)}
        />
      )}
      {matrixModalRow && (
        <EmployeeSkillMatrixModal
          row={matrixModalRow}
          employeeLabel={employeeModalLabel(matrixModalRow)}
          skillsWithRequirements={skills}
          onClose={() => setMatrixModalRow(null)}
        />
      )}
    </div>
  )
}
