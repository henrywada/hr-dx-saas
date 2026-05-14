'use client'

import { useState, useTransition } from 'react'
import type { TenantSkill, EmployeeSkillAssignment } from '../types'
import { assignSkill, removeSkillAssignment } from '../actions'

type Props = {
  employeeId: string
  employeeName: string
  skills: TenantSkill[]
  currentAssignments: EmployeeSkillAssignment[]
  onClose: () => void
}

export function AssignSkillModal({ employeeId, employeeName, skills, currentAssignments, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedSkillId, setSelectedSkillId] = useState('')
  const [startedAt, setStartedAt] = useState(new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const currentSkillIds = new Set(currentAssignments.map((a) => a.skill_id))

  function handleAssign() {
    if (!selectedSkillId || !startedAt) return
    startTransition(async () => {
      const res = await assignSkill({ employeeId, skillId: selectedSkillId, startedAt, reason: reason || undefined })
      if (!res.success) { setError(res.error); return }
      setSelectedSkillId(''); setReason(''); setError(null)
    })
  }

  function handleRemove(assignmentId: string) {
    if (!confirm('この技能の割り当てを削除しますか？')) return
    startTransition(async () => {
      const res = await removeSkillAssignment(assignmentId)
      if (!res.success) setError(res.error)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">技能を管理</h2>
            <p className="text-sm text-gray-500">{employeeName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

          {currentAssignments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">現在の技能</p>
              <div className="space-y-1">
                {currentAssignments.map((a) => {
                  const skill = skills.find((s) => s.id === a.skill_id)
                  return (
                    <div key={a.id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded">
                      <span className="text-sm font-medium px-2.5 py-0.5 rounded-full"
                        style={{ backgroundColor: (skill?.color_hex ?? '#6b7280') + '33', color: skill?.color_hex ?? '#6b7280' }}>
                        {skill?.name ?? '不明'}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{a.started_at}</span>
                        <button onClick={() => handleRemove(a.id)} disabled={isPending}
                          className="text-red-400 hover:text-red-600">削除</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-3 border-t pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">技能を追加</p>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">技能名 <span className="text-red-500">*</span></label>
              <select value={selectedSkillId} onChange={(e) => setSelectedSkillId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="">選択してください</option>
                {skills.filter((s) => !currentSkillIds.has(s.id)).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">開始日 <span className="text-red-500">*</span></label>
              <input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">変更理由・メモ</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="例：兼務辞令、部署異動に伴い..." rows={2}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none" />
            </div>
            <button onClick={handleAssign} disabled={isPending || !selectedSkillId || !startedAt}
              className="w-full bg-primary text-white py-2 rounded font-medium text-sm disabled:opacity-50">
              割り当てる
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
