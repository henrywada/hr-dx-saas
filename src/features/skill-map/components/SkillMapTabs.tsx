'use client'

import { useState } from 'react'
import type {
  TenantSkillWithRequirements,
  SkillLevel,
  EmployeeSkillRow,
  SkillGroupRow,
  EmployeeCompletionRow,
} from '../types'
import { EmployeeSkillTable } from './EmployeeSkillTable'
import { SkillGroupView } from './SkillGroupView'
import { AnalysisView } from './AnalysisView'
import { BottleneckView } from './BottleneckView'
import { SimulationWorkspace } from './SimulationWorkspace'

type Props = {
  employeeRows: EmployeeSkillRow[]
  skillGroups: SkillGroupRow[]
  skills: TenantSkillWithRequirements[]
  levels: SkillLevel[]
  divisions: Array<{ id: string; name: string; pathLabel: string }>
  /** 職種ビュー用：employee_id → 有効な requirement_id 一覧 */
  skillViewRequirementSelections: Record<string, string[]>
  /** 分析ビュー用：従業員ごとの充足状況 */
  completionRows: EmployeeCompletionRow[]
  /** シミュレーション一覧 */
  initialSimulations: any[]
}

const TABS = [
  { key: 'employee', label: '従業員ビュー' },
  { key: 'skill', label: '職種ビュー' },
  { key: 'analysis', label: '分析ビュー' },
  { key: 'bottleneck', label: 'ボトルネック分析' },
  { key: 'simulation', label: 'アサインシミュレータ' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function SkillMapTabs({
  employeeRows,
  skillGroups,
  skills,
  levels,
  divisions,
  skillViewRequirementSelections,
  completionRows,
  initialSimulations,
}: Props) {
  const [tab, setTab] = useState<TabKey>('employee')

  return (
    <div className="space-y-6">
      <div className="-mx-6 -mt-6 mb-6 flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-6 py-3.5">
        <div className="flex flex-wrap gap-2">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-primary text-white shadow-sm'
                  : 'border border-gray-200 bg-gray-50 text-gray-700 shadow-sm hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'employee' && (
        <EmployeeSkillTable rows={employeeRows} skills={skills} divisions={divisions} />
      )}
      {tab === 'skill' && (
        <SkillGroupView
          groups={skillGroups}
          skillsWithRequirements={skills}
          levels={levels}
          requirementSelectionsByEmployee={skillViewRequirementSelections}
        />
      )}
      {tab === 'analysis' && (
        <AnalysisView rows={completionRows} skills={skills} divisions={divisions} />
      )}
      {tab === 'bottleneck' && (
        <BottleneckView skills={skills} divisions={divisions} />
      )}
      {tab === 'simulation' && (
        <SimulationWorkspace
          skills={skills}
          divisions={divisions}
          initialSimulations={initialSimulations}
        />
      )}
    </div>
  )
}
