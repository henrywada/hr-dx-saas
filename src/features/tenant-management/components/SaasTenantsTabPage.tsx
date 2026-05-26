'use client'

import { useState } from 'react'
import TenantManagementPage from './TenantManagementPage'
import SaasEmployeeList from './SaasEmployeeList'
import type { TenantWithManager, SaasEmployee } from '../types'

interface Props {
  initialTenants: TenantWithManager[]
  employees: SaasEmployee[]
}

export default function SaasTenantsTabPage({ initialTenants, employees }: Props) {
  const [activeTab, setActiveTab] = useState<'tenants' | 'employees'>('tenants')

  const tenantNames = Array.from(new Set(employees.map(e => e.tenant_name))).sort((a, b) =>
    a.localeCompare(b, 'ja')
  )

  return (
    <div className="space-y-6">
      {/* タブヘッダー */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tenants'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            テナント一覧
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'employees'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            従業員一覧
          </button>
        </nav>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'tenants' ? (
        <TenantManagementPage initialTenants={initialTenants} />
      ) : (
        <SaasEmployeeList employees={employees} tenantNames={tenantNames} />
      )}
    </div>
  )
}
