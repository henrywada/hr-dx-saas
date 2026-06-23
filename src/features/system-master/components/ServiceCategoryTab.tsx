/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useSystemMaster } from '../hooks/useSystemMaster'

interface Props {
  initialCategories: any[]
}

export default function ServiceCategoryTab({ initialCategories }: Props) {
  const { createServiceCategory, updateServiceCategory, deleteServiceCategory } = useSystemMaster()

  // プロパティとして受け取ったデータをそのまま使用 (revalidatePath で更新されるため)
  // 変更直後にUIを同期させるために useState を使うが、propsが変わったら追従させる
  const [categories, setCategories] = useState<any[]>(initialCategories)
  const [newName, setNewName] = useState('')
  const [newSortOrder, setNewSortOrder] = useState<number | string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setCategories(initialCategories)
  }, [initialCategories])

  // 新規登録
  const handleCreate = async () => {
    if (!newName.trim()) return alert('カテゴリ名を入力してください')
    setLoading(true)
    try {
      const result = await createServiceCategory({
        name: newName,
        sort_order: newSortOrder === '' ? categories.length + 1 : Number(newSortOrder),
      })
      if (result.success) {
        setNewName('')
        setNewSortOrder('')
        // revalidatePath により自動で props が更新されます
      }
    } catch (err: any) {
      alert(`登録エラー: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 更新
  const handleSave = async (id: string) => {
    setLoading(true)
    try {
      const result = await updateServiceCategory(id, editData[id])
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
    if (
      !confirm(
        `カテゴリ「${name}」を削除してもよろしいですか？\n※このカテゴリに紐づくサービスがある場合、エラーになる可能性があります。`
      )
    ) {
      return
    }
    setLoading(true)
    try {
      const result = await deleteServiceCategory(id)
      if (result.success) {
        // revalidatePath で props 更新
      }
    } catch (err: any) {
      alert(`削除エラー: ${err.message}\n(サービスが紐づいている可能性があります)`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ gap: 'var(--space-3)' }} className="flex flex-col">
      {/* 新規追加フォーム */}
      <div
        style={{
          gap: 'var(--space-2)',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-sm)',
        }}
        className="flex items-center bg-gray-50 border border-gray-200"
      >
        <input
          type="number"
          placeholder="表示順 (任意)"
          value={newSortOrder}
          onChange={e => setNewSortOrder(e.target.value)}
          style={{ padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-sm)' }}
          className="border border-gray-200 w-32 sm:w-40 focus:ring-2 focus:ring-[#FD7601] outline-none text-xs"
        />
        <input
          type="text"
          placeholder="新しいカテゴリ名を入力"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          style={{ padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-sm)' }}
          className="border border-gray-200 flex-1 focus:ring-2 focus:ring-[#FD7601] outline-none text-xs"
        />
        <button
          onClick={handleCreate}
          disabled={loading}
          style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)' }}
          className="bg-[#FD7601] text-white hover:bg-orange-700 disabled:opacity-50 font-medium text-xs"
        >
          {loading ? '登録中...' : '新規登録'}
        </button>
      </div>

      {/* 一覧 */}
      <div
        style={{ borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)' }}
        className="overflow-hidden border border-gray-200"
      >
        <table className="min-w-full bg-white">
          <thead
            style={{ borderBottomColor: 'var(--color-border)' }}
            className="bg-gray-50 border-b"
          >
            <tr>
              <th
                style={{ padding: `var(--space-2) var(--space-2)` }}
                className="text-center text-xs font-semibold text-gray-700 w-12 min-w-12"
              >
                No
              </th>
              <th
                style={{ padding: `var(--space-2) var(--space-3)` }}
                className="text-left text-xs font-semibold text-gray-700 w-32"
              >
                表示順
              </th>
              <th
                style={{ padding: `var(--space-2) var(--space-3)` }}
                className="text-left text-xs font-semibold text-gray-700"
              >
                カテゴリ名
              </th>
              <th
                style={{ padding: `var(--space-2) var(--space-3)` }}
                className="text-center text-xs font-semibold text-gray-700 w-40"
              >
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.map((cat, rowIndex) => (
              <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                <td
                  style={{ padding: `var(--space-2) var(--space-2)` }}
                  className="text-center text-xs text-gray-600 tabular-nums"
                >
                  {rowIndex + 1}
                </td>
                <td style={{ padding: `var(--space-2) var(--space-3)` }}>
                  {editingId === cat.id ? (
                    <input
                      type="number"
                      style={{
                        padding: `var(--space-1) var(--space-2)`,
                        borderRadius: 'var(--radius-sm)',
                      }}
                      className="border border-gray-200 w-full focus:ring-2 focus:ring-[#FD7601] outline-none text-xs"
                      value={editData[cat.id]?.sort_order ?? ''}
                      onChange={e =>
                        setEditData({
                          ...editData,
                          [cat.id]: { ...editData[cat.id], sort_order: Number(e.target.value) },
                        })
                      }
                    />
                  ) : (
                    <span className="text-gray-800 text-xs">{cat.sort_order}</span>
                  )}
                </td>
                <td style={{ padding: `var(--space-2) var(--space-3)` }}>
                  {editingId === cat.id ? (
                    <input
                      style={{
                        padding: `var(--space-1) var(--space-2)`,
                        borderRadius: 'var(--radius-sm)',
                      }}
                      className="border border-gray-200 w-full focus:ring-2 focus:ring-[#FD7601] outline-none text-xs"
                      value={editData[cat.id]?.name || ''}
                      onChange={e =>
                        setEditData({
                          ...editData,
                          [cat.id]: { ...editData[cat.id], name: e.target.value },
                        })
                      }
                    />
                  ) : (
                    <span className="text-gray-800 text-xs">{cat.name}</span>
                  )}
                </td>
                <td style={{ padding: `var(--space-2) var(--space-3)` }} className="text-center">
                  <div style={{ gap: 'var(--space-3)' }} className="flex justify-center">
                    {editingId === cat.id ? (
                      <>
                        <button
                          onClick={() => handleSave(cat.id)}
                          className="text-[#FD7601] font-bold hover:underline text-xs"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-500 hover:underline text-xs"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(cat.id)
                            setEditData({ [cat.id]: cat })
                          }}
                          className="text-[#FD7601] hover:text-orange-700 text-sm"
                          title="編集"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="text-red-500 hover:text-red-700 text-sm"
                          title="削除"
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
