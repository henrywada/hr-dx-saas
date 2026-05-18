'use client'

import { useState } from 'react'
import type {
  TenantSkillWithRequirements,
  SkillLevel,
  EmployeeSkillRow,
  SkillGroupRow,
} from '../types'
import { EmployeeSkillTable } from './EmployeeSkillTable'
import { SkillGroupView } from './SkillGroupView'

type Props = {
  employeeRows: EmployeeSkillRow[]
  skillGroups: SkillGroupRow[]
  skills: TenantSkillWithRequirements[]
  levels: SkillLevel[]
  divisions: Array<{ id: string; name: string; pathLabel: string }>
  /** 職種ビュー用：employee_id → 有効な requirement_id 一覧 */
  skillViewRequirementSelections: Record<string, string[]>
}

export function SkillMapTabs({
  employeeRows,
  skillGroups,
  skills,
  levels,
  divisions,
  skillViewRequirementSelections,
}: Props) {
  const [tab, setTab] = useState<'employee' | 'skill'>('employee')

  return (
    <div className="space-y-6">
      <div className="-mx-6 -mt-6 mb-6 flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-6 py-3.5">
        <div className="flex flex-wrap gap-2">
          {(['employee', 'skill'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-primary text-white shadow-sm'
                  : 'border border-gray-200 bg-gray-50 text-gray-700 shadow-sm hover:bg-gray-100'
              }`}
            >
              {t === 'employee' ? '従業員ビュー' : '職種ビュー'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'employee' ? (
        <EmployeeSkillTable rows={employeeRows} skills={skills} divisions={divisions} />
      ) : (
        <SkillGroupView
          groups={skillGroups}
          skillsWithRequirements={skills}
          levels={levels}
          requirementSelectionsByEmployee={skillViewRequirementSelections}
        />
      )}
    </div>
  )
}
