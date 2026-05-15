'use client'

import { useState } from 'react'
import type { TenantSkill, EmployeeSkillRow, SkillGroupRow } from '../types'
import type { GlobalJobCategory, GlobalJobRole } from '@/features/global-skill-templates/types'
import { EmployeeSkillTable } from './EmployeeSkillTable'
import { SkillGroupView } from './SkillGroupView'
import { TenantSkillManager } from './TenantSkillManager'

type Props = {
  employeeRows: EmployeeSkillRow[]
  skillGroups: SkillGroupRow[]
  skills: TenantSkill[]
  divisions: Array<{ id: string; name: string; pathLabel: string }>
  templateCategories: GlobalJobCategory[]
  templateRoles: GlobalJobRole[]
}

export function SkillMapTabs({
  employeeRows,
  skillGroups,
  skills,
  divisions,
  templateCategories,
  templateRoles,
}: Props) {
  const [tab, setTab] = useState<'employee' | 'skill'>('employee')
  const [showManager, setShowManager] = useState(false)

  return (
    <div className="space-y-6">
      <div className="-mx-6 -mt-6 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-3.5">
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
              {t === 'employee' ? '従業員ビュー' : '技能ビュー'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowManager(!showManager)}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            showManager
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300 hover:bg-gray-100'
          }`}
        >
          技能マスタ管理
        </button>
      </div>

      {showManager && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <TenantSkillManager
            skills={skills}
            templateCategories={templateCategories}
            templateRoles={templateRoles}
          />
        </div>
      )}

      {tab === 'employee' ? (
        <EmployeeSkillTable rows={employeeRows} skills={skills} divisions={divisions} />
      ) : (
        <>
          <h2 className="text-sm font-semibold text-gray-800">
            <span className="text-gray-900">技能ビュー</span>
            <span className="font-normal text-gray-500"> の担当者</span>
          </h2>
          <SkillGroupView groups={skillGroups} />
        </>
      )}
    </div>
  )
}
