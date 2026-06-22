'use client'

import { useState, useMemo } from 'react'
import type { SaasEmployee } from '../types'

interface Props {
  employees: SaasEmployee[]
  tenantNames: string[]
}

export default function SaasEmployeeList({ employees, tenantNames }: Props) {
  const [selectedTenant, setSelectedTenant] = useState<string>('all')

  const filtered = useMemo(() => {
    if (selectedTenant === 'all') return employees
    return employees.filter(e => e.tenant_name === selectedTenant)
  }, [employees, selectedTenant])

  return (
    <div className="space-y-4">
      {/* 会社名ドロップダウン */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600 whitespace-nowrap">会社名</label>
        <select
          value={selectedTenant}
          onChange={e => setSelectedTenant(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#FD7601] focus:border-[#FD7601] outline-none min-w-[200px]"
        >
          <option value="all">全テナント</option>
          {tenantNames.map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-400">{filtered.length} 名</span>
      </div>

      {/* 従業員テーブル */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  従業員番号
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  氏名
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  メールアドレス
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  性別
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                  アプリロール
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                    従業員が登録されていません。
                  </td>
                </tr>
              ) : (
                filtered.map(emp => (
                  <tr key={emp.id} className="hover:bg-[#f6f8fa]/50 transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 tabular-nums">
                      {emp.employee_no ?? '—'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {emp.name}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {emp.email ?? '—'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-center text-sm text-gray-700">
                      {emp.sex ?? '—'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                      {emp.app_role_name ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
          全 {filtered.length} 件表示
        </div>
      </div>
    </div>
  )
}
