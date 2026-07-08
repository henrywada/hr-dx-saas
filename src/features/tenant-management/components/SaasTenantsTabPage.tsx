'use client'

import { useState } from 'react'
import TenantManagementPage from './TenantManagementPage'
import SaasEmployeeList from './SaasEmployeeList'
import type { TenantWithManager, SaasEmployee } from '../types'
import TenantBackLink from '@/components/common/TenantBackLink'

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
      <div className="flex items-center justify-between border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'tenants'
                ? 'border-[#FD7601] text-[#FD7601]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            テナント一覧
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'employees'
                ? 'border-[#FD7601] text-[#FD7601]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            従業員一覧
          </button>
        </nav>
        <TenantBackLink className="mb-3 shrink-0" />
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
