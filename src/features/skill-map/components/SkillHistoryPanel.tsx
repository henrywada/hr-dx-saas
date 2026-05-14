'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { TenantSkill, EmployeeSkillAssignment } from '../types'
import { getEmployeeSkillAssignments } from '../queries'
import { AssignSkillModal } from './AssignSkillModal'

type Props = {
  employeeId: string
  employeeName: string
  skills: TenantSkill[]
  currentAssignments: Record<string, EmployeeSkillAssignment>
  onClose: () => void
}

export function SkillHistoryPanel({ employeeId, employeeName, skills, currentAssignments, onClose }: Props) {
  const [history, setHistory] = useState<EmployeeSkillAssignment[]>([])
  const [showAssign, setShowAssign] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    getEmployeeSkillAssignments(supabase, employeeId)
      .then(setHistory)
      .finally(() => setLoading(false))
  }, [employeeId])

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <h2 className="font-semibold text-gray-900">技能履歴</h2>
              <p className="text-sm text-gray-500">{employeeName}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-8">読み込み中...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">履歴がありません</p>
            ) : (
              <div className="relative pl-5">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
                {history.map((a, i) => {
                  const skill = skills.find((s) => s.id === a.skill_id)
                  return (
                    <div key={a.id} className="relative mb-5">
                      <div className="absolute -left-3 top-1 w-3 h-3 rounded-full border-2 border-white"
                        style={{ backgroundColor: i === 0 ? '#0055ff' : '#d1d5db' }} />
                      <div className="text-sm font-medium text-gray-800">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold mr-1"
                          style={{ backgroundColor: (skill?.color_hex ?? '#6b7280') + '33', color: skill?.color_hex ?? '#6b7280' }}>
                          {skill?.name ?? '不明'}
                        </span>
                        を追加
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {a.started_at}{a.reason && <span className="ml-2">· {a.reason}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t">
            <button onClick={() => setShowAssign(true)}
              className="w-full border border-gray-300 text-gray-700 py-2 rounded text-sm hover:bg-gray-50">
              ＋ 技能を追加・変更
            </button>
          </div>
        </div>
      </div>

      {showAssign && (
        <AssignSkillModal
          employeeId={employeeId} employeeName={employeeName} skills={skills}
          currentAssignments={Object.values(currentAssignments)}
          onClose={() => setShowAssign(false)}
        />
      )}
    </>
  )
}
