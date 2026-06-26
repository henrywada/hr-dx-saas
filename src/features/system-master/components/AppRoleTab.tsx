/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useSystemMaster } from '../hooks/useSystemMaster'

interface Props {
  initialRoles: any[]
}

export default function AppRoleTab({ initialRoles }: Props) {
  const { createAppRole, updateAppRole, deleteAppRole } = useSystemMaster()

  const [roles, setRoles] = useState<any[]>(initialRoles)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleCode, setNewRoleCode] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setRoles(initialRoles)
  }, [initialRoles])

  // 新規登録
  const handleCreate = async () => {
    if (!newRoleName.trim() || !newRoleCode.trim()) {
      return alert('ロール名とコードの両方を入力してください')
    }
    setLoading(true)
    try {
      const result = await createAppRole({
        name: newRoleName,
        app_role: newRoleCode, // ✅ カラム名を app_role に合わせる
      })
      if (result.success) {
        setNewRoleName('')
        setNewRoleCode('')
      }
    } catch (err: any) {
      alert(`登録エラー: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 保存（更新）
  const handleSave = async (id: string) => {
    setLoading(true)
    try {
      const item = editData[id]
      const result = await updateAppRole(id, {
        name: item.name,
        app_role: item.app_role, // ✅ カラム名を app_role に合わせる
      })
      if (result.success) {
        setEditingId(null)
      }
    } catch (err: any) {
      alert(`更新エラー: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 削除
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ロール「${name}」を削除しますか？`)) return
    setLoading(true)
    try {
      await deleteAppRole(id)
    } catch (err: any) {
      alert(`削除エラー: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 w-full">
      {/* 新規登録フォーム */}
      <div
        style={{
          gap: 'var(--space-2)',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-sm)',
        }}
        className="flex items-center bg-gray-50 border border-gray-200"
      >
        <input
          type="text"
          placeholder="ロール名 (例: 人事マネージャー)"
          value={newRoleName}
          onChange={e => setNewRoleName(e.target.value)}
          className="border px-3 py-1.5 rounded w-64"
        />
        <input
          type="text"
          placeholder="コード (例: hr_manager)"
          value={newRoleCode}
          onChange={e => setNewRoleCode(e.target.value)}
          className="border px-3 py-1.5 rounded w-64"
        />
        <button
          onClick={handleCreate}
          disabled={loading}
          className="bg-[#FD7601] text-white px-6 py-1.5 rounded hover:bg-[#FD7601] disabled:opacity-50 font-bold"
        >
          新規登録
        </button>
      </div>

      {/* 一覧テーブル */}
      <div className="overflow-hidden border border-[#e2e6ec] rounded-xl">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-[#f6f8fa] border-b border-[#e2e6ec]">
              <th className="px-4 py-1 text-center text-xs font-semibold text-[#24292f] uppercase tracking-wider w-12 min-w-12">
                No
              </th>
              <th className="px-4 py-1 text-left text-xs font-semibold text-[#24292f] uppercase tracking-wider">
                ロール名
              </th>
              <th className="px-4 py-1 text-left text-xs font-semibold text-[#24292f] uppercase tracking-wider">
                コード (app_role)
              </th>
              <th className="px-4 py-1 text-center text-xs font-semibold text-[#24292f] uppercase tracking-wider w-40">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role, rowIndex) => (
              <tr
                key={role.id}
                className="bg-white hover:bg-[#f6f8fa] border-b border-[#e2e6ec] transition-colors"
              >
                <td className="px-4 py-1 text-center text-xs text-gray-600 tabular-nums">
                  {rowIndex + 1}
                </td>
                <td className="px-4 py-1 text-sm text-[#24292f]">
                  {editingId === role.id ? (
                    <input
                      className="border p-1 w-full rounded text-xs"
                      value={editData[role.id]?.name || ''}
                      onChange={e =>
                        setEditData({
                          ...editData,
                          [role.id]: { ...editData[role.id], name: e.target.value },
                        })
                      }
                    />
                  ) : (
                    role.name
                  )}
                </td>
                <td className="px-4 py-1 font-mono text-xs text-[#FD7601]">
                  {editingId === role.id ? (
                    <input
                      className="border p-1 w-full rounded text-xs"
                      value={editData[role.id]?.app_role || ''}
                      onChange={e =>
                        setEditData({
                          ...editData,
                          [role.id]: { ...editData[role.id], app_role: e.target.value },
                        })
                      }
                    />
                  ) : (
                    role.app_role
                  )}
                </td>
                <td className="px-4 py-1 text-center">
                  <div className="flex justify-center gap-3">
                    {editingId === role.id ? (
                      <>
                        <button
                          onClick={() => handleSave(role.id)}
                          className="text-[#FD7601] font-bold text-xs"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-500 text-xs"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(role.id)
                            setEditData({ [role.id]: role })
                          }}
                          className="text-[#FD7601] text-lg hover:scale-110 transition-transform"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(role.id, role.name)}
                          className="text-red-500 text-lg hover:scale-110 transition-transform"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
