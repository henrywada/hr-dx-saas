'use client'

import { useState } from 'react'
import type { TenantSkill, EmployeeSkillRow, SkillGroupRow } from '../types'
import { EmployeeSkillTable } from './EmployeeSkillTable'
import { SkillGroupView } from './SkillGroupView'
import { TenantSkillManager } from './TenantSkillManager'

type Props = {
  employeeRows: EmployeeSkillRow[]
  skillGroups: SkillGroupRow[]
  skills: TenantSkill[]
  divisions: Array<{ id: string; name: string }>
}

export function SkillMapTabs({ employeeRows, skillGroups, skills, divisions }: Props) {
  const [tab, setTab] = useState<'employee' | 'skill'>('employee')
  const [showManager, setShowManager] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex">
          {(['employee', 'skill'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t === 'employee' ? '👤 従業員ビュー' : '🏷️ 技能ビュー'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowManager(!showManager)}
          className="text-sm text-gray-500 hover:text-primary border border-gray-200 px-3 py-1.5 rounded mb-1">
          ⚙️ 技能マスタ管理
        </button>
      </div>

      {showManager && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <TenantSkillManager skills={skills} />
        </div>
      )}

      {tab === 'employee'
        ? <EmployeeSkillTable rows={employeeRows} skills={skills} divisions={divisions} />
        : <SkillGroupView groups={skillGroups} />
      }
    </div>
  )
}
