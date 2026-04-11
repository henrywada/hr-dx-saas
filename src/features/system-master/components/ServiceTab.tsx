/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useSystemMaster } from '../hooks/useSystemMaster';

interface Props {
  initialServices: any[];
  categories: any[];
}

export default function ServiceTab({ initialServices, categories }: Props) {
  const { updateService, createService, deleteService, generateAiAdvice } = useSystemMaster();
  
  const [services, setServices] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  
  // モーダル用状態（詳細変更）
  const [modalServiceId, setModalServiceId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    // Propsの変更に合わせてstateを同期し、デフォルト値を適用する
    setServices((initialServices || []).map((s: any) => ({
      ...s,
      description: s.description ?? '',
      target_audience: s.target_audience ?? 'all_users',
    })));
  }, [initialServices]);

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
      } else {
        alert(`保存エラー: ${JSON.stringify(result.error)}`);
      }
    } catch (err: any) {
      alert(`通信エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 詳細変更（モーダル保存）
  const handleSaveModal = async () => {
    if (!modalServiceId) return;
    setLoading(true);
    try {
      const result = await updateService(modalServiceId, {
        title: String(modalTitle),
        description: String(modalDescription),
      });
      if (result.success) {
        setModalServiceId(null);
      } else {
        alert(`保存エラー: ${JSON.stringify(result.error)}`);
      }
    } catch (err: any) {
      alert(`通信エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAiAdvice = async () => {
    if (!modalServiceId) return;
    setIsAiLoading(true);
    try {
      const svc = services.find(s => s.id === modalServiceId);
      const cat = categories.find(c => c.id === svc?.service_category_id);
      
      const result = await generateAiAdvice(
        svc?.name || '',
        cat?.name || '',
        modalTitle,
        modalDescription
      );
      
      if (result.success && result.data) {
        setModalTitle(result.data.title);
        setModalDescription(result.data.description);
      } else {
        alert(`AIアドバイスの取得に失敗しました。`);
      }
    } catch (err: any) {
      alert(`AIエラー: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const openModal = (id: string) => {
    const svc = services.find(s => s.id === id);
    if (!svc) return;
    setModalTitle(svc.title || '');
    setModalDescription(svc.description || '');
    setModalServiceId(id);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`サービス「${name}」を削除しますか？`)) return;
    setLoading(true);
    try {
      await deleteService(id);
    } catch (err: any) {
      alert(`削除エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (id: string, field: string, value: any) => {
    setEditData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const categoryIdForRow = (row: any) =>
    editingId === row.id && editData[row.id]
      ? editData[row.id].service_category_id ?? row.service_category_id
      : row.service_category_id;

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
              <th className="px-4 py-3 border-b text-sm font-bold w-16 text-center">No</th>
              <th className="px-4 py-3 border-b text-sm font-bold w-48">カテゴリ</th>
              <th className="px-4 py-3 border-b text-sm font-bold w-20 text-center">順序</th>
              <th className="px-4 py-3 border-b text-sm font-bold w-96">name</th>
              <th className="px-4 py-3 border-b text-sm font-bold w-32">対象(Audience)</th>
              <th className="px-4 py-3 border-b text-sm font-bold">タイトル</th>
              <th className="px-4 py-3 border-b text-sm font-bold">ルート</th>
              <th className="px-4 py-3 border-b text-sm font-bold w-24 text-center">ステータス</th>
              <th className="px-4 py-3 border-b text-sm font-bold w-48 text-center">操作</th>
            </tr>
          </thead>
          {services.map((item, index) => {
            const isEditing = editingId === item.id;
            const data = isEditing ? editData[item.id] : item;
            const prev = index > 0 ? services[index - 1] : null;
            const currCat = categoryIdForRow(item);
            const prevCat = prev ? categoryIdForRow(prev) : null;
            const isCategoryStart = index === 0 || currCat !== prevCat;

            return (
              <tbody key={item.id} className="border-b">
                <tr
                  className={
                    isCategoryStart
                      ? 'bg-green-50 hover:bg-green-100/70'
                      : 'hover:bg-gray-50'
                  }
                >
                  <td className="px-4 py-2 text-center align-middle">{index + 1}</td>
                  <td className="px-4 py-2 align-middle">
                    {isEditing ? (
                      <select value={data.service_category_id || ''} onChange={(e) => handleChange(item.id, 'service_category_id', e.target.value)} className="w-full border p-1 rounded text-sm">
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    ) : (categories.find(c => c.id === item.service_category_id)?.name || '-')}
                  </td>
                  <td className="px-4 py-2 text-center align-middle">
                    {isEditing ? (
                      <input type="number" value={data.sort_order || 0} onChange={(e) => handleChange(item.id, 'sort_order', e.target.value)} className="w-full border p-1 rounded text-center" />
                    ) : item.sort_order}
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
                  <td className="px-4 py-2 align-middle text-center">
                    {isEditing ? (
                      <input type="text" value={data.title || ''} onChange={(e) => handleChange(item.id, 'title', e.target.value)} className="w-full border p-1 rounded text-sm text-left" />
                    ) : (String(item.title ?? '').trim() ? '●' : '-')}
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
                          <button onClick={() => {setEditingId(null);}} className="text-gray-500 hover:underline text-sm">取消</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(item)} className="text-blue-500 text-lg hover:scale-110 transition-transform" title="編集">✏️</button>
                          <button onClick={() => openModal(item.id)} className="text-indigo-600 text-xs border border-indigo-200 px-3 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors font-bold">詳細変更</button>
                          <button onClick={() => handleDelete(item.id, item.name)} className="text-red-500 text-lg hover:scale-110 transition-transform" title="削除">🗑️</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            );
          })}
        </table>
      </div>

      {/* 詳細変更モーダル */}
      {modalServiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">
                『{services.find(s => s.id === modalServiceId)?.name}』の詳細変更
              </h3>
              <button 
                onClick={() => setModalServiceId(null)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  タイトル
                </label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="ユーザーに表示されるサービスのキャッチフレーズ..."
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  説明 (description)
                </label>
                <textarea
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  placeholder="サービスの詳しい機能や目的を入力..."
                  className="w-full border border-gray-300 rounded-lg p-3 min-h-[160px] text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleAiAdvice}
                  disabled={isAiLoading || loading}
                  className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-sm rounded-lg hover:opacity-90 transition-opacity shadow-sm ${
                    isAiLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span className="text-base">✨</span>
                  {isAiLoading ? 'AI考え中...' : 'AIアドバイスで自動生成'}
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setModalServiceId(null)}
                disabled={loading || isAiLoading}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveModal}
                disabled={loading || isAiLoading}
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 min-w-[100px]"
              >
                {loading ? '保存中...' : '保存して閉じる'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}