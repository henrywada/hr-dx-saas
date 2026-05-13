'use client'

import { useState } from 'react'
import type { Skill, SkillCategory, SkillMatrixRow, SkillProficiencyDef } from '../types'
import { SkillMatrixCell } from './SkillMatrixCell'
import { SkillCoverageBar } from './SkillCoverageBar'

type Props = {
  rows: SkillMatrixRow[]
  skills: Skill[]
  categories: SkillCategory[]
  proficiencyDefs: SkillProficiencyDef[]
}

export function SkillMatrix({ rows, skills, categories, proficiencyDefs }: Props) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  function toggleSort(skillId: string) {
    if (sortKey === skillId) setSortAsc(!sortAsc)
    else { setSortKey(skillId); setSortAsc(false) }
  }

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortKey) return 0
    const av = a.skills[sortKey] ?? 0
    const bv = b.skills[sortKey] ?? 0
    return sortAsc ? av - bv : bv - av
  })

  function skillCoverageRate(skillId: string): number {
    if (rows.length === 0) return 0
    return Math.round(rows.filter((r) => (r.skills[skillId] ?? 0) > 1).length / rows.length * 100)
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white border border-gray-200 px-3 py-2 min-w-40 text-left">従業員</th>
            {categories.map((cat) => (
              <th
                key={cat.id}
                colSpan={skills.filter((s) => s.category_id === cat.id).length}
                className="border border-gray-200 px-2 py-1 bg-gray-50 text-center font-medium text-gray-700"
              >
                {cat.name}
              </th>
            ))}
            <th className="border border-gray-200 px-3 py-2 bg-gray-50 text-center min-w-28">充足率</th>
          </tr>
          <tr>
            <th className="sticky left-0 bg-white border border-gray-200" />
            {skills.map((skill) => (
              <th key={skill.id} className="border border-gray-200 px-1 py-2 bg-gray-50 text-center">
                <button
                  onClick={() => toggleSort(skill.id)}
                  className="text-xs text-gray-600 hover:text-primary block mx-auto"
                  style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                >
                  {skill.name}{sortKey === skill.id ? (sortAsc ? ' ↑' : ' ↓') : ''}
                </button>
              </th>
            ))}
            <th className="border border-gray-200 bg-gray-50" />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.employee_id} className="hover:bg-blue-50/30">
              <td className="sticky left-0 bg-white border border-gray-200 px-3 py-2 min-w-40">
                <div className="font-medium">{row.employee_name}</div>
                {row.division_name && <div className="text-xs text-gray-500">{row.division_name}</div>}
              </td>
              {skills.map((skill) => (
                <td key={skill.id} className="border border-gray-200 p-1 text-center">
                  <SkillMatrixCell
                    employeeId={row.employee_id}
                    skillId={skill.id}
                    level={row.skills[skill.id] ?? 0}
                    proficiencyDefs={proficiencyDefs}
                  />
                </td>
              ))}
              <td className="border border-gray-200 px-2 py-1">
                <SkillCoverageBar coverage={row.coverage} />
              </td>
            </tr>
          ))}
          <tr className="bg-gray-50 font-medium">
            <td className="sticky left-0 bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-500">習得率</td>
            {skills.map((skill) => (
              <td key={skill.id} className="border border-gray-200 p-1 text-center">
                <span className="text-xs text-gray-600">{skillCoverageRate(skill.id)}%</span>
              </td>
            ))}
            <td className="border border-gray-200" />
          </tr>
        </tbody>
      </table>
    </div>
  )
}
