/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useSystemMaster } from '../hooks/useSystemMaster';
import { Check } from 'lucide-react';

interface Props {
  initialTenants: any[];
  initialServices: any[];
  initialTenantServices: any[];
  initialCategories: any[];
}

export default function TenantServiceTab({
  initialTenants,
  initialServices,
  initialTenantServices,
  initialCategories
}: Props) {
  const { toggleTenantService } = useSystemMaster();
  const [tenants, setTenants] = useState<any[]>(initialTenants);
  const [services, setServices] = useState<any[]>(initialServices);
  const [tenantServices, setTenantServices] = useState<any[]>(initialTenantServices);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // カテゴリIDから名前を引くマップ
  const categoryMap = new Map<string, string>();
  initialCategories.forEach((cat: any) => {
    categoryMap.set(cat.id, cat.name);
  });

  useEffect(() => {
    setTenants(initialTenants);
    setServices(initialServices);
    setTenantServices(initialTenantServices);
    // 初回ロード時やテナント一覧が更新された時に、未選択なら最初のテナントを選択する
    if (initialTenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(initialTenants[0].id);
    }
  }, [initialTenants, initialServices, initialTenantServices, selectedTenantId]);

  const handleToggle = async (serviceId: string, currentEnabled: boolean) => {
    if (loading || !selectedTenantId) return;
    setLoading(true);

    try {
      const result = await toggleTenantService(selectedTenantId, serviceId, !currentEnabled);

      if (!result.success) {
        alert(`更新に失敗しました: ${result.error}`);
      }
    } catch (error: any) {
      alert(`エラーが発生しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isEnabled = (serviceId: string) => {
    return tenantServices.some(
      (ts) => ts.tenant_id === selectedTenantId && ts.service_id === serviceId
    );
  };

  // SaaS 管理専用サービスは一覧から除外（getServices と同じ並び）
  const displayServices = services.filter(s => s.target_audience !== 'saas_adm');

  return (
    <div className="space-y-6">
      {/* テナント選択 */}
      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm max-w-2xl">
        <div className="mb-4">
          <h2 className="text-lg font-medium text-gray-900">テナント×サービス管理</h2>
        </div>
        <label htmlFor="tenant-select" className="sr-only">
          対象のテナントを選択
        </label>
        <select
          id="tenant-select"
          value={selectedTenantId}
          onChange={(e) => setSelectedTenantId(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-50"
        >
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
          {tenants.length === 0 && (
            <option value="">テナントが存在しません</option>
          )}
        </select>
      </div>

      {/* サービス一覧（縦並び） */}
      {selectedTenantId ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-12 min-w-12">
                  No
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  対象(Audience)
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  カテゴリー
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  サービス名
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  パス
                </th>
                <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-32">
                  有効 / 無効
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {displayServices.map((service, rowIndex) => {
                const enabled = isEnabled(service.id);
                return (
                  <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-600 tabular-nums">
                      {rowIndex + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                        {service.target_audience ?? 'all_users'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {categoryMap.get(service.service_category_id) || '未設定'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {service.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2.5 py-1 rounded bg-gray-100 text-xs text-gray-600 font-mono">
                        {service.route_path || '設定なし'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleToggle(service.id, enabled)}
                        disabled={loading}
                        className={`
                          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                          ${enabled ? 'bg-blue-600' : 'bg-gray-200'}
                          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        role="switch"
                        aria-checked={enabled}
                      >
                        <span
                          aria-hidden="true"
                          className={`
                            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                            transition duration-200 ease-in-out
                            ${enabled ? 'translate-x-5' : 'translate-x-0'}
                          `}
                        >
                          {enabled && (
                            <Check className="absolute inset-0 h-full w-full text-blue-600 p-1" />
                          )}
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {services.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    サービスが登録されていません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center text-sm text-gray-500">
          設定を行うテナントを選択してください。
        </div>
      )}
    </div>
  );
}
