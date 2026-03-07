'use client';

import { useState, useEffect } from 'react';
import { useSystemMaster } from '../hooks/useSystemMaster';

export default function ServiceTab() {
  const { updateService, createService, deleteService } = useSystemMaster();
  
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  
  // 詳細編集（description）用の状態
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [descriptionDrafts, setDescriptionDrafts] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      const response = await fetch('/api/system-master/services');
      const data = await response.json();
      const servicesList = data?.services ?? data ?? [];
      setServices(servicesList.map((s: any) => ({
        ...s,
        description: s.description ?? '',
        target_audience: s.target_audience ?? 'all_users',
      })));
      setCategories(data?.categories ?? []);
    } catch (error) {
      console.error('データ取得エラー:', error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddNew = () => {
    const newId = 'new-' + Date.now();
    const newItem = {
      id: newId,
      name: '',
      target_audience: 'all_users',
      title: '',
      description: '',
      route_path: '',
      release_status: '下書き',
      service_category_id: categories[0]?.id || '',
      sort_order: services.length + 1,
      isNew: true
    };
    setServices([newItem, ...services]);
    setEditingId(newId);
    setEditData({ [newId]: newItem });
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditData({ [item.id]: { ...item } });
  };

  const handleSave = async (id: string) => {
    const item = editData[id];
    setLoading(true);
    try {
      const payload = {
        name: String(item.name || ''),
        target_audience: String(item.target_audience || 'all_users'),
        title: String(item.title || ''),
        route_path: String(item.route_path || ''),
        release_status: String(item.release_status || '下書き'),
        service_category_id: String(item.service_category_id),
        sort_order: Number(item.sort_order) || 0
      };
      let result;
      if (item.isNew) {
        result = await createService({ ...payload, description: item.description || '' });
      } else {
        result = await updateService(id, payload);
      }
      if (result.success) {
        setEditingId(null);
        await fetchData();
      } else {
        alert(`保存エラー: ${JSON.stringify(result.error)}`);
      }
    } catch (err: any) {
      alert(`通信エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 説明（description）のみを保存する
  const handleSaveDescription = async (id: string) => {
    setLoading(true);
    try {
      const desc = descriptionDrafts[id] ?? '';
      const result = await updateService(id, { description: String(desc) });
      if (result.success) {
        setExpandedId(null);
        await fetchData();
      } else {
        alert(`説明の保存に失敗しました: ${JSON.stringify(result.error)}`);
      }
    } catch (err: any) {
      alert(`保存エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`サービス「${name}」を削除しますか？`)) return;
    setLoading(true);
    try {
      const result = await deleteService(id);
      if (result.success) await fetchData();
    } catch (err: any) {
      alert(`削除エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (id: string, field: string, value: any) => {
    setEditData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      const svc = services.find(s => s.id === id);
      setDescriptionDrafts(prev => ({ ...prev, [id]: svc?.description ?? '' }));
      setExpandedId(id);
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">サービス一覧</h3>
        <button onClick={handleAddNew} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold">+ 新規追加</button>
      </div>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="min-w-full bg-white border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 border-b text-sm font-bold w-20 text-center">順序</th>
              <th className="px-4 py-3 border-b text-sm font-bold w-96">カテゴリ</th>
              <th className="px-4 py-3 border-b text-sm font-bold">name</th>
              <th className="px-4 py-3 border-b text-sm font-bold w-32">対象(Audience)</th>
              <th className="px-4 py-3 border-b text-sm font-bold">タイトル</th>
              <th className="px-4 py-3 border-b text-sm font-bold">ルート</th>
              <th className="px-4 py-3 border-b text-sm font-bold w-24 text-center">ステータス</th>
              <th className="px-4 py-3 border-b text-sm font-bold w-48 text-center">操作</th>
            </tr>
          </thead>
          {services.map((item) => {
            const isEditing = editingId === item.id;
            const data = isEditing ? editData[item.id] : item;
            const isExpanded = expandedId === item.id;

            return (
              <tbody key={item.id} className="border-b">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-center align-middle">
                    {isEditing ? (
                      <input type="number" value={data.sort_order || 0} onChange={(e) => handleChange(item.id, 'sort_order', e.target.value)} className="w-full border p-1 rounded text-center" />
                    ) : item.sort_order}
                  </td>
                  <td className="px-4 py-2 align-middle">
                    {isEditing ? (
                      <select value={data.service_category_id || ''} onChange={(e) => handleChange(item.id, 'service_category_id', e.target.value)} className="w-full border p-1 rounded text-sm">
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    ) : (categories.find(c => c.id === item.service_category_id)?.name || '-')}
                  </td>
                  <td className="px-4 py-2 align-middle">
                    {isEditing ? (
                      <input type="text" value={data.name || ''} onChange={(e) => handleChange(item.id, 'name', e.target.value)} className="w-full border p-1 rounded text-sm" />
                    ) : item.name}
                  </td>
                  <td className="px-4 py-2 align-middle">
                    {isEditing ? (
                      <select value={data.target_audience || 'all_users'} onChange={(e) => handleChange(item.id, 'target_audience', e.target.value)} className="w-full border p-1 rounded text-sm">
                        <option value="all_users">all_users</option>
                        <option value="adm">adm</option>
                        <option value="saas_adm">saas_adm</option>
                      </select>
                    ) : (
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{item.target_audience}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-middle">
                    {isEditing ? (
                      <input type="text" value={data.title || ''} onChange={(e) => handleChange(item.id, 'title', e.target.value)} className="w-full border p-1 rounded text-sm" />
                    ) : item.title}
                  </td>
                  <td className="px-4 py-2 align-middle">
                    {isEditing ? (
                      <input type="text" value={data.route_path || ''} onChange={(e) => handleChange(item.id, 'route_path', e.target.value)} className="w-full border p-1 rounded text-sm" />
                    ) : item.route_path}
                  </td>
                  <td className="px-4 py-2 text-center align-middle">
                    {isEditing ? (
                      <select value={data.release_status || '下書き'} onChange={(e) => handleChange(item.id, 'release_status', e.target.value)} className="border p-1 rounded text-sm">
                        <option value="下書き">下書き</option>
                        <option value="公開">公開</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.release_status === '公開' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{item.release_status}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center align-middle">
                    <div className="flex justify-center gap-3 items-center">
                      {isEditing ? (
                        <>
                          <button onClick={() => handleSave(item.id)} disabled={loading} className="text-blue-600 font-bold hover:underline text-sm">{loading ? '...' : '保存'}</button>
                          <button onClick={() => {setEditingId(null); fetchData();}} className="text-gray-500 hover:underline text-sm">取消</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(item)} className="text-blue-500 text-lg hover:scale-110 transition-transform" title="編集">✏️</button>
                          <button onClick={() => toggleExpand(item.id)} className="text-indigo-600 text-xs border px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors">詳細編集</button>
                          <button onClick={() => handleDelete(item.id, item.name)} className="text-red-500 text-lg hover:scale-110 transition-transform" title="削除">🗑️</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>

                {/* 詳細編集エリア（description） */}
                {isExpanded && (
                  <tr className="bg-indigo-50/30">
                    <td colSpan={8} className="px-6 py-4 border-t border-indigo-100">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-indigo-700">説明 (description) の編集</label>
                          <button 
                            onClick={() => handleSaveDescription(item.id)} 
                            disabled={loading} 
                            className="px-4 py-1 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                          >
                            {loading ? '保存中...' : '説明を保存'}
                          </button>
                        </div>
                        <textarea
                          className="w-full border border-indigo-200 rounded p-3 min-h-[80px] text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                          placeholder="サービスの詳細説明を入力してください..."
                          value={descriptionDrafts[item.id] ?? ''}
                          onChange={(e) => setDescriptionDrafts({...descriptionDrafts, [item.id]: e.target.value})}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}