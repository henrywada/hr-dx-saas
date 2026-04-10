/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useSystemMaster } from '../hooks/useSystemMaster';

interface Props {
  initialRoles: any[];
  initialServices: any[];
  initialRoleServices: any[];
}

export default function AppRoleServiceTab({
  initialRoles,
  initialServices,
  initialRoleServices
}: Props) {
  const { toggleAppRoleService } = useSystemMaster();
  const [roles, setRoles] = useState<any[]>(initialRoles);
  const [services, setServices] = useState<any[]>(initialServices);
  const [roleServices, setRoleServices] = useState<any[]>(initialRoleServices);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRoles(initialRoles);
    setServices(initialServices);
    setRoleServices(initialRoleServices);
  }, [initialRoles, initialServices, initialRoleServices]);

  const admServices = services.filter(service => service.target_audience === 'adm');

  const handleToggle = async (roleId: string, serviceId: string, currentEnabled: boolean) => {
    if (loading) return;
    setLoading(true);

    try {
      const result = await toggleAppRoleService(roleId, serviceId, !currentEnabled);

      if (!result.success) {
        alert(`更新に失敗しました: ${result.error}`);
      }
    } catch (error: any) {
      alert(`エラーが発生しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">ロール × サービス 権限マトリクス</h3>
        {loading && <span className="text-blue-600 animate-pulse font-bold">更新中...</span>}
      </div>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="min-w-full bg-white border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-3 border text-center text-sm font-bold text-gray-700 bg-gray-100 sticky left-0 z-20 w-12 min-w-12">
                No
              </th>
              <th className="px-4 py-3 border text-left text-sm font-bold text-gray-700 bg-gray-100 sticky left-12 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                サービス \ ロール
              </th>

              {/* target_audience 列：従業員カラム（roles[0]）の前に表示されるよう、roles の map の前に配置 */}
              <th className="px-4 py-3 border text-center text-sm font-bold text-gray-700 min-w-[140px]">
                対象 (Audience)
              </th>

              {roles.map(role => (
                <th key={role.id} className="px-4 py-3 border text-center text-sm font-bold text-gray-700 min-w-[120px]">
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {admServices.map((service, rowIndex) => (
              <tr key={service.id} className="hover:bg-gray-50">
                <td className="px-2 py-3 border text-center text-sm text-gray-600 tabular-nums bg-white sticky left-0 z-20">
                  {rowIndex + 1}
                </td>
                <td className="px-4 py-3 border font-medium text-gray-800 bg-white sticky left-12 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  {service.name}
                </td>

                {/* ここに target_audience を表示（null の場合は all_users を表示） */}
                <td className="px-4 py-3 border text-center">
                  <span className="inline-block px-2 py-1 text-xs font-mono bg-gray-100 rounded">
                    {service.target_audience ?? 'all_users'}
                  </span>
                </td>

                {roles.map(role => {
                  const isEnabled = roleServices.some(
                    rs => rs.app_role_id === role.id && rs.service_id === service.id
                  );

                  return (
                    <td key={`${role.id}-${service.id}`} className="px-4 py-3 border text-center">
                      <div className="flex justify-center items-center h-full">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          disabled={loading}
                          onChange={() => handleToggle(role.id, service.id, isEnabled)}
                          className="w-6 h-6 cursor-pointer accent-blue-600 transition-transform active:scale-90 disabled:opacity-30"
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500 italic">※チェックを入れると即座に権限が反映されます。</p>
    </div>
  );
}