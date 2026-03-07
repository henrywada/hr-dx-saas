'use client';

import { useState, useEffect } from 'react';
import { useSystemMaster } from '../hooks/useSystemMaster';

export default function ServiceCategoryTab() {
  const { createServiceCategory, updateServiceCategory, deleteServiceCategory } = useSystemMaster();

  const [categories, setCategories] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const res = await fetch('/api/system-master/categories');
    const data = await res.json();
    setCategories(data || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 新規登録
  const handleCreate = async () => {
    if (!newName.trim()) return alert('カテゴリ名を入力してください');
    setLoading(true);
    try {
      const result = await createServiceCategory({
        name: newName,
        sort_order: categories.length + 1
      });
      if (result.success) {
        setNewName('');
        await fetchData();
      }
    } catch (err: any) {
      alert(`登録エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 更新
  const handleSave = async (id: string) => {
    setLoading(true);
    try {
      const result = await updateServiceCategory(id, editData[id]);
      if (result.success) {
        setEditingId(null);
        await fetchData();
      }
    } catch (err: any) {
      alert(`更新エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 削除
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`カテゴリ「${name}」を削除してもよろしいですか？\n※このカテゴリに紐づくサービスがある場合、エラーになる可能性があります。`)) {
      return;
    }
    setLoading(true);
    try {
      const result = await deleteServiceCategory(id);
      if (result.success) {
        await fetchData();
      }
    } catch (err: any) {
      alert(`削除エラー: ${err.message}\n(サービスが紐づいている可能性があります)`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 新規追加フォーム: w-64 から w-[512px] (約2倍) に変更 */}
      <div className="flex gap-2 items-center bg-gray-50 p-4 rounded-lg border">
        <input
          type="text"
          placeholder="新しいカテゴリ名を入力"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="border px-3 py-2 rounded w-[512px] focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button
          onClick={handleCreate}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? '登録中...' : '新規登録'}
        </button>
      </div>

      {/* 一覧 */}
      <div className="overflow-hidden border rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 border-b text-left text-sm font-semibold text-gray-700">カテゴリ名</th>
              <th className="px-6 py-3 border-b text-center text-sm font-semibold text-gray-700 w-40">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  {editingId === cat.id ? (
                    <input
                      className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      value={editData[cat.id]?.name || ''}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          [cat.id]: { ...editData[cat.id], name: e.target.value }
                        })
                      }
                    />
                  ) : (
                    <span className="text-gray-800">{cat.name}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-4">
                    {editingId === cat.id ? (
                      <>
                        <button onClick={() => handleSave(cat.id)} className="text-blue-600 font-bold hover:underline">保存</button>
                        <button onClick={() => setEditingId(null)} className="text-gray-500 hover:underline">取消</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(cat.id);
                            setEditData({ [cat.id]: cat });
                          }}
                          className="text-blue-500 hover:text-blue-700 text-xl"
                          title="編集"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="text-red-500 hover:text-red-700 text-xl"
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
  );
}