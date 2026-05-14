'use client'

import { useState, useTransition } from 'react'
import type { SkillLevel, SkillRequirement } from '../types'
import { createSkillRequirement, updateSkillRequirement } from '../actions'

type Props = {
  skillId: string
  skillName: string
  levels: SkillLevel[]
  editing?: SkillRequirement
  onClose: () => void
}

const CATEGORIES = ['技術', '知識', '資格', '経験']

export function SkillRequirementModal({ skillId, skillName, levels, editing, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(editing?.name ?? '')
  const [category, setCategory] = useState(editing?.category ?? '')
  const [levelId, setLevelId] = useState(editing?.level_id ?? '')
  const [criteria, setCriteria] = useState(editing?.criteria ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    if (!name.trim()) return
    startTransition(async () => {
      const res = editing
        ? await updateSkillRequirement({ id: editing.id, name: name.trim(), category: category || null, levelId: levelId || null, criteria: criteria || null })
        : await createSkillRequirement({ skillId, name: name.trim(), category: category || undefined, levelId: levelId || undefined, criteria: criteria || undefined })
      if ('error' in res) { setError(res.error); return }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">{editing ? '要件を編集' : '要件を追加'}</h2>
            <p className="text-sm text-gray-500">{skillName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">要件名 <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="例：Python、旋盤基本操作、フォークリフト免許"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">カテゴリ</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="">未選択</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">スキルレベル</label>
              <select value={levelId} onChange={(e) => setLevelId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="">未選択</option>
                {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">達成基準・メモ</label>
            <textarea value={criteria} onChange={(e) => setCriteria(e.target.value)}
              placeholder="例：実務経験3年以上、社内検定合格..." rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700">キャンセル</button>
            <button onClick={handleSave} disabled={isPending || !name.trim()}
              className="px-4 py-2 bg-primary text-white rounded text-sm font-medium disabled:opacity-50">保存</button>
          </div>
        </div>
      </div>
    </div>
  )
}
