'use client'

import { useState, useTransition } from 'react'
import type { TenantSkill, SkillLevel, SkillRequirement } from '../types'
import { deleteSkillRequirement } from '../actions'
import { SkillRequirementModal } from './SkillRequirementModal'

type Props = {
  skills: TenantSkill[]
  levels: SkillLevel[]
  initialRequirements: SkillRequirement[]
  initialSkillId: string
}

export function SkillRequirementsTable({
  skills,
  levels,
  initialRequirements,
  initialSkillId,
}: Props) {
  const [selectedSkillId, setSelectedSkillId] = useState(initialSkillId)
  const [requirements, setRequirements] = useState(initialRequirements)
  const [showModal, setShowModal] = useState(false)
  const [editingReq, setEditingReq] = useState<SkillRequirement | undefined>()
  const [isPending, startTransition] = useTransition()

  function handleSkillChange(skillId: string) {
    window.location.href = `${window.location.pathname}?skill=${skillId}`
  }

  function handleDelete(id: string) {
    if (!confirm('この要件を削除しますか？')) return
    startTransition(async () => {
      const res = await deleteSkillRequirement(id)
      if (res.success) setRequirements(prev => prev.filter(r => r.id !== id))
    })
  }

  const selectedSkill = skills.find(s => s.id === selectedSkillId)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {skills.map(skill => (
          <button
            key={skill.id}
            type="button"
            onClick={() => handleSkillChange(skill.id)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              skill.id === selectedSkillId
                ? 'font-medium text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            style={skill.id === selectedSkillId ? { backgroundColor: skill.color_hex } : {}}
          >
            {skill.name}
          </button>
        ))}
        {skills.length === 0 && (
          <p className="text-sm text-gray-400">
            技能が登録されていません。スキルマップ画面から追加してください。
          </p>
        )}
      </div>

      {selectedSkill && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              <span
                className="mr-2 rounded-full px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: selectedSkill.color_hex + '33',
                  color: selectedSkill.color_hex,
                }}
              >
                {selectedSkill.name}
              </span>
              の要件
            </h3>
            <button
              type="button"
              onClick={() => {
                setEditingReq(undefined)
                setShowModal(true)
              }}
              className="rounded bg-primary px-3 py-1.5 text-sm text-white"
            >
              ＋ 要件を追加
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border-b border-gray-300 px-4 py-3 text-left font-semibold text-gray-800">
                    要件名
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left font-semibold text-gray-800">
                    カテゴリ
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
                    スキルレベル
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left font-semibold text-gray-800">
                    達成基準
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {requirements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      要件が登録されていません
                    </td>
                  </tr>
                ) : (
                  requirements.map((req, index) => {
                    const level = levels.find(l => l.id === req.level_id)
                    return (
                      <tr
                        key={req.id}
                        className={`border-b border-gray-100 transition-[background-color,box-shadow] duration-300 ease-out hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)] ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">{req.name}</td>
                        <td className="px-4 py-3 text-gray-500">{req.category ?? '—'}</td>
                        <td className="px-4 py-3 text-center">
                          {level ? (
                            <span
                              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: level.color_hex + '33',
                                color: level.color_hex,
                              }}
                            >
                              {level.name}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{req.criteria ?? '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingReq(req)
                                setShowModal(true)
                              }}
                              className="text-xs text-primary hover:underline"
                            >
                              ✏️ 編集
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(req.id)}
                              disabled={isPending}
                              className="text-xs text-gray-400 hover:text-red-500"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showModal && selectedSkill && (
        <SkillRequirementModal
          skillId={selectedSkill.id}
          skillName={selectedSkill.name}
          levels={levels}
          editing={editingReq}
          onClose={() => {
            setShowModal(false)
            setEditingReq(undefined)
          }}
        />
      )}
    </div>
  )
}
