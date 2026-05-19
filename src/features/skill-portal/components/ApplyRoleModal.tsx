'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import type { TenantSkillWithRequirements } from '@/features/skill-map/types'
import { applyForSkillRole } from '../actions'

type Props = {
  skills: TenantSkillWithRequirements[]
  assignedSkillIds: Set<string>
  pendingSkillIds: Set<string>
  onClose: () => void
}

export function ApplyRoleModal({ skills, assignedSkillIds, pendingSkillIds, onClose }: Props) {
  const [selectedSkillId, setSelectedSkillId] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const availableSkills = skills.filter(
    s => !assignedSkillIds.has(s.id) && !pendingSkillIds.has(s.id)
  )

  function handleSubmit() {
    if (!selectedSkillId) {
      setError('職種を選択してください')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await applyForSkillRole({
        skillId: selectedSkillId,
        note: note.trim() || undefined,
      })
      if (!result.success) {
        setError((result as { success: false; error: string }).error)
        return
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">職種申請</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {availableSkills.length === 0 ? (
            <p className="text-sm text-gray-500">申請可能な職種がありません</p>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">職種</label>
                <select
                  value={selectedSkillId}
                  onChange={e => setSelectedSkillId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                >
                  <option value=""></option>
                  {availableSkills.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  申請理由（任意）
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                  placeholder="例: 業務でプログラミングを担当しています"
                />
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          {availableSkills.length > 0 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? '申請中...' : '申請する'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
