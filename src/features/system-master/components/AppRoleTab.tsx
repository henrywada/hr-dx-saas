/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useSystemMaster } from '../hooks/useSystemMaster';

interface Props {
  initialRoles: any[];
}

export default function AppRoleTab({ initialRoles }: Props) {
  const { createAppRole, updateAppRole, deleteAppRole } = useSystemMaster();
  
  const [roles, setRoles] = useState<any[]>(initialRoles);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCode, setNewRoleCode] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRoles(initialRoles);
  }, [initialRoles]);

  // 新規登録
  const handleCreate = async () => {
    if (!newRoleName.trim() || !newRoleCode.trim()) {
      return alert('ロール名とコードの両方を入力してください');
    }
    setLoading(true);
    try {
      const result = await createAppRole({
        name: newRoleName,
        app_role: newRoleCode // ✅ カラム名を app_role に合わせる
      });
      if (result.success) {
        setNewRoleName('');
        setNewRoleCode('');
      }
    } catch (err: any) {
      alert(`登録エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 保存（更新）
  const handleSave = async (id: string) => {
    setLoading(true);
    try {
      const item = editData[id];
      const result = await updateAppRole(id, {
        name: item.name,
        app_role: item.app_role // ✅ カラム名を app_role に合わせる
      });
      if (result.success) {
        setEditingId(null);
      }
    } catch (err: any) {
      alert(`更新エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 削除
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ロール「${name}」を削除しますか？`)) return;
    setLoading(true);
    try {
      await deleteAppRole(id);
    } catch (err: any) {
      alert(`削除エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* 新規登録フォーム */}
      <div className="flex gap-2 items-center bg-gray-50 p-4 rounded-lg border">
        <input
          type="text"
          placeholder="ロール名 (例: 人事マネージャー)"
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
          className="border px-3 py-2 rounded w-64"
        />
        <input
          type="text"
          placeholder="コード (例: hr_manager)"
          value={newRoleCode}
          onChange={(e) => setNewRoleCode(e.target.value)}
          className="border px-3 py-2 rounded w-64"
        />
        <button
          onClick={handleCreate}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-bold"
        >
          新規登録
        </button>
      </div>

      {/* 一覧テーブル */}
      <div className="overflow-hidden border rounded-lg shadow-sm">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-3 border-b text-center text-sm font-bold text-gray-700 w-12 min-w-12">No</th>
              <th className="px-6 py-3 border-b text-left text-sm font-bold text-gray-700">ロール名</th>
              <th className="px-6 py-3 border-b text-left text-sm font-bold text-gray-700">コード (app_role)</th>
              <th className="px-6 py-3 border-b text-center text-sm font-bold text-gray-700 w-40">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {roles.map((role, rowIndex) => (
              <tr key={role.id} className="hover:bg-gray-50">
                <td className="px-3 py-4 text-center text-sm text-gray-600 tabular-nums">{rowIndex + 1}</td>
                <td className="px-6 py-4">
                  {editingId === role.id ? (
                    <input
                      className="border p-2 w-full rounded"
                      value={editData[role.id]?.name || ''}
                      onChange={(e) => setEditData({...editData, [role.id]: {...editData[role.id], name: e.target.value}})}
                    />
                  ) : role.name}
                </td>
                <td className="px-6 py-4 font-mono text-sm text-blue-600">
                  {editingId === role.id ? (
                    <input
                      className="border p-2 w-full rounded"
                      value={editData[role.id]?.app_role || ''}
                      onChange={(e) => setEditData({...editData, [role.id]: {...editData[role.id], app_role: e.target.value}})}
                    />
                  ) : role.app_role}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-4">
                    {editingId === role.id ? (
                      <>
                        <button onClick={() => handleSave(role.id)} className="text-blue-600 font-bold">保存</button>
                        <button onClick={() => setEditingId(null)} className="text-gray-500">取消</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => {setEditingId(role.id); setEditData({[role.id]: role});}} className="text-blue-500 text-xl">✏️</button>
                        <button onClick={() => handleDelete(role.id, role.name)} className="text-red-500 text-xl">🗑️</button>
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