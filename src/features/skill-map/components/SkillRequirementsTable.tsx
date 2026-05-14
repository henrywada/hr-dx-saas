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
      <div className="flex gap-2 flex-wrap">
        {skills.map(skill => (
          <button
            key={skill.id}
            onClick={() => handleSkillChange(skill.id)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${skill.id === selectedSkillId ? 'text-white font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
                className="px-2 py-0.5 rounded-full text-xs mr-2"
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
              onClick={() => {
                setEditingReq(undefined)
                setShowModal(true)
              }}
              className="bg-primary text-white px-3 py-1.5 rounded text-sm"
            >
              ＋ 要件を追加
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border-b border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
                    要件名
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
                    カテゴリ
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-center font-medium text-gray-700">
                    スキルレベル
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left font-medium text-gray-700">
                    達成基準
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-center font-medium text-gray-700">
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
                  requirements.map(req => {
                    const level = levels.find(l => l.id === req.level_id)
                    return (
                      <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{req.name}</td>
                        <td className="px-4 py-3 text-gray-500">{req.category ?? '—'}</td>
                        <td className="px-4 py-3 text-center">
                          {level ? (
                            <span
                              className="px-2.5 py-0.5 rounded-full text-xs font-medium"
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
                        <td className="px-4 py-3 text-gray-500 text-xs">{req.criteria ?? '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setEditingReq(req)
                                setShowModal(true)
                              }}
                              className="text-xs text-primary hover:underline"
                            >
                              ✏️ 編集
                            </button>
                            <button
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
