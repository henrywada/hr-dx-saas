'use client'

import { useState, useTransition } from 'react'
import type { TenantSkill } from '../types'
import { createTenantSkill, updateTenantSkill, deleteTenantSkill } from '../actions'
import { ImportFromTemplateModal } from './ImportFromTemplateModal'
import type { GlobalJobCategory, GlobalJobRole } from '@/features/global-skill-templates/types'

type Props = {
  skills: TenantSkill[]
  templateCategories: GlobalJobCategory[]
  templateRoles: GlobalJobRole[]
}

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
]

export function TenantSkillManager({ skills, templateCategories, templateRoles }: Props) {
  const [isPending, startTransition] = useTransition()
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  function handleCreate() {
    if (!newName.trim()) return
    startTransition(async () => {
      const res = await createTenantSkill({ name: newName.trim(), colorHex: newColor })
      if ('error' in res) {
        setError(res.error)
        return
      }
      setNewName('')
      setError(null)
    })
  }

  function handleUpdate() {
    if (!editId || !editName.trim()) return
    startTransition(async () => {
      const res = await updateTenantSkill({
        id: editId,
        name: editName.trim(),
        colorHex: editColor,
      })
      if ('error' in res) {
        setError(res.error)
        return
      }
      setEditId(null)
      setError(null)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('この技能を削除しますか？割り当てデータも削除されます。')) return
    startTransition(async () => {
      const res = await deleteTenantSkill(id)
      if ('error' in res) setError(res.error)
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">技能マスタ管理</h3>
      <button
        onClick={() => setShowImport(true)}
        className="text-xs text-primary border border-primary px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors"
      >
        📥 テンプレートから取り込む
      </button>
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="技能名（例：旋盤工）"
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm flex-1 min-w-[160px]"
        />
        <div className="flex gap-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              className="w-6 h-6 rounded-full border-2 transition-all"
              style={{
                backgroundColor: c,
                borderColor: newColor === c ? '#374151' : 'transparent',
              }}
            />
          ))}
        </div>
        <button
          onClick={handleCreate}
          disabled={isPending || !newName.trim()}
          className="bg-primary text-white px-3 py-1.5 rounded text-sm disabled:opacity-50"
        >
          ＋ 追加
        </button>
      </div>

      <div className="space-y-2">
        {skills.map(skill => (
          <div
            key={skill.id}
            className="flex items-center gap-2 p-2 border border-gray-200 rounded"
          >
            {editId === skill.id ? (
              <>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                />
                <div className="flex gap-1">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      className="w-5 h-5 rounded-full border-2"
                      style={{
                        backgroundColor: c,
                        borderColor: editColor === c ? '#374151' : 'transparent',
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleUpdate}
                  disabled={isPending}
                  className="text-xs text-primary font-medium"
                >
                  保存
                </button>
                <button onClick={() => setEditId(null)} className="text-xs text-gray-500">
                  キャンセル
                </button>
              </>
            ) : (
              <>
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: skill.color_hex + '33',
                    color: skill.color_hex,
                    border: `1px solid ${skill.color_hex}88`,
                  }}
                >
                  {skill.name}
                </span>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => {
                      setEditId(skill.id)
                      setEditName(skill.name)
                      setEditColor(skill.color_hex)
                    }}
                    className="text-xs text-gray-500 hover:text-primary"
                  >
                    ✏️ 編集
                  </button>
                  <button
                    onClick={() => handleDelete(skill.id)}
                    className="text-xs text-gray-500 hover:text-red-500"
                  >
                    ✕ 削除
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {showImport && (
        <ImportFromTemplateModal
          categories={templateCategories}
          roles={templateRoles}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
