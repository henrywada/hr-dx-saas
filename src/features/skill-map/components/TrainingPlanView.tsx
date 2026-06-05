'use client'

// SkillMapTabs から import される。育成計画タブのルートコンポーネント。

import { useState } from 'react'
import type { TrainingPlanDashboardData } from '../training-plan-types'
import type { EmployeeSkillRow } from '../types'
import { TrainingTemplateManager } from './TrainingTemplateManager'
import { TrainingPlanList } from './TrainingPlanList'
import { TrainingProgressReport } from './TrainingProgressReport'

type SubTab = 'templates' | 'plans' | 'progress'

interface Props {
  data: TrainingPlanDashboardData
  employeeRows: EmployeeSkillRow[]
  jobRoles: { id: string; name: string }[]
}

export function TrainingPlanView({ data, employeeRows, jobRoles }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('templates')

  const employees = employeeRows.map(r => ({
    id: r.employee_id,
    name: r.full_name ?? '',
    department_name: r.division_name,
  }))

  return (
    <div className="space-y-4">
      {/* サブタブ */}
      <div className="flex gap-2">
        {[
          { key: 'templates' as SubTab, label: `テンプレート (${data.templates.length})` },
          { key: 'plans' as SubTab, label: `育成計画 (${data.plans.length})` },
          { key: 'progress' as SubTab, label: '進捗レポート' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={
              subTab === t.key
                ? 'rounded-full px-4 py-1.5 text-sm font-medium bg-primary text-white shadow-sm'
                : 'rounded-full px-4 py-1.5 text-sm font-medium border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'templates' && (
        <TrainingTemplateManager
          templates={data.templates}
          availableCourses={data.availableCourses}
          jobRoles={jobRoles}
        />
      )}
      {subTab === 'plans' && (
        <TrainingPlanList
          plans={data.plans}
          templates={data.templates}
          employees={employees}
        />
      )}
      {subTab === 'progress' && (
        <TrainingProgressReport rows={data.progressRows} />
      )}
    </div>
  )
}
