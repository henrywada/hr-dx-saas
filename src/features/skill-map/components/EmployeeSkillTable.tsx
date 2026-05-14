'use client'

import { useState } from 'react'
import type { TenantSkill, EmployeeSkillRow } from '../types'
import { SkillBadge } from './SkillBadge'
import { AssignSkillModal } from './AssignSkillModal'
import { SkillHistoryPanel } from './SkillHistoryPanel'

type Props = {
  rows: EmployeeSkillRow[]
  skills: TenantSkill[]
  divisions: Array<{ id: string; name: string }>
}

export function EmployeeSkillTable({ rows, skills, divisions }: Props) {
  const [divisionId, setDivisionId] = useState('all')
  const [assignTarget, setAssignTarget] = useState<EmployeeSkillRow | null>(null)
  const [historyTarget, setHistoryTarget] = useState<EmployeeSkillRow | null>(null)

  const filtered = divisionId === 'all' ? rows : rows.filter((r) => r.division_id === divisionId)

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[{ id: 'all', name: 'すべて' }, ...divisions].map((d) => (
          <button key={d.id} onClick={() => setDivisionId(d.id)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${divisionId === d.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {d.name}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border-b border-gray-200 px-4 py-3 text-left font-medium text-gray-700">従業員</th>
              <th className="border-b border-gray-200 px-4 py-3 text-left font-medium text-gray-700">部署</th>
              <th className="border-b border-gray-200 px-4 py-3 text-left font-medium text-gray-700">現在の技能</th>
              <th className="border-b border-gray-200 px-4 py-3 text-center font-medium text-gray-700">直近変更日</th>
              <th className="border-b border-gray-200 px-4 py-3 text-center font-medium text-gray-700">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">該当する従業員がいません</td></tr>
            ) : filtered.map((row) => {
              const assignments = Object.values(row.currentAssignments)
              const assignedSkills = assignments.map((a) => skills.find((s) => s.id === a.skill_id)).filter(Boolean) as TenantSkill[]
              return (
                <tr key={row.employee_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.employee_name}</td>
                  <td className="px-4 py-3 text-gray-500">{row.division_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {assignedSkills.length > 0 ? (
                      <div className="flex gap-1.5 flex-wrap">
                        {assignedSkills.map((skill) => <SkillBadge key={skill.id} skill={skill} size="sm" />)}
                      </div>
                    ) : <span className="text-gray-400 text-xs">未設定</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">{row.latestStartedAt ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setAssignTarget(row)} className="text-xs text-primary hover:underline">
                        {assignments.length === 0 ? '＋ 割り当て' : '✏️ 編集'}
                      </button>
                      {assignments.length > 0 && (
                        <button onClick={() => setHistoryTarget(row)} className="text-xs text-gray-400 hover:text-gray-600">📋 履歴</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {assignTarget && (
        <AssignSkillModal
          employeeId={assignTarget.employee_id} employeeName={assignTarget.employee_name}
          skills={skills} currentAssignments={Object.values(assignTarget.currentAssignments)}
          onClose={() => setAssignTarget(null)}
        />
      )}
      {historyTarget && (
        <SkillHistoryPanel
          employeeId={historyTarget.employee_id} employeeName={historyTarget.employee_name}
          skills={skills} currentAssignments={historyTarget.currentAssignments}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  )
}
