'use client'

import type { SkillGroupRow } from '../types'

type Props = { groups: SkillGroupRow[] }

export function SkillGroupView({ groups }: Props) {
  if (groups.length === 0) return <p className="text-center text-gray-400 py-12">技能が登録されていません</p>

  return (
    <div className="space-y-4">
      {groups.map(({ skill, employees }) => (
        <div key={skill.id} className="border rounded-lg overflow-hidden" style={{ borderColor: skill.color_hex + '66' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: skill.color_hex + '1a' }}>
            <span className="font-semibold text-sm" style={{ color: skill.color_hex }}>{skill.name}</span>
            <span className="text-xs" style={{ color: skill.color_hex + 'aa' }}>{employees.length}名</span>
          </div>
          {employees.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">担当者なし</p>
          ) : (
            <div className="px-4 py-3 flex flex-wrap gap-x-4 gap-y-1">
              {employees.map((emp) => (
                <span key={emp.employee_id} className="text-sm text-gray-700">
                  {emp.employee_name}
                  {emp.division_name && <span className="text-xs text-gray-400 ml-1">（{emp.division_name}）</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
