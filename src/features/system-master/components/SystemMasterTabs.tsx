/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import ServiceClassTab from './ServiceClassTab'
import ServiceCategoryTab from './ServiceCategoryTab'
import ServiceTab from './ServiceTab'
import AppRoleTab from './AppRoleTab'
import AppRoleServiceTab from './AppRoleServiceTab'
import TenantServiceTab from './TenantServiceTab'
import TenantDashboardUiTab from '@/features/dashboard-ui-visibility/components/TenantDashboardUiTab'
import TenantBackLink from '@/components/common/TenantBackLink'
import type { UiDashboardElement } from '@/features/dashboard-ui-visibility/types'

type TabType =
  | 'service_class'
  | 'service_category'
  | 'service'
  | 'app_role'
  | 'role_service'
  | 'tenant_service'
  | 'dashboard_ui'

const tabs: { key: TabType; label: string }[] = [
  { key: 'service_class', label: 'クラス' },
  { key: 'service_category', label: 'サービスカテゴリ' },
  { key: 'service', label: 'サービス' },
  { key: 'app_role', label: 'アプリロール' },
  { key: 'role_service', label: 'ロール×サービス' },
  { key: 'tenant_service', label: 'テナント×サービス' },
  { key: 'dashboard_ui', label: 'ダッシュボード表示' },
]

interface Props {
  initialClasses: any[]
  initialClassIndex: any[]
  initialCategories: any[]
  initialServices: any[]
  initialRoles: any[]
  initialRoleServices: any[]
  initialTenants: any[]
  initialTenantServices: any[]
  initialUiDashboardElements: UiDashboardElement[]
  initialTenantUiDashboardElements: {
    tenant_id: string
    ui_dashboard_element_id: string
    is_visible: boolean
  }[]
}

export default function SystemMasterTabs({
  initialClasses,
  initialClassIndex,
  initialCategories,
  initialServices,
  initialRoles,
  initialRoleServices,
  initialTenants,
  initialTenantServices,
  initialUiDashboardElements,
  initialTenantUiDashboardElements,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('service_class')

  return (
    // max-w-4xl などの制限を外し、w-full で横いっぱいに広げます
    <div className="w-full px-4 py-6">
      <div className="mb-8 flex items-end justify-between gap-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                ${
                  activeTab === tab.key
                    ? 'border-[#FD7601] text-[#FD7601]'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <TenantBackLink className="mb-4 shrink-0" />
      </div>

      {/* コンテンツエリアも横幅いっぱいに */}
      <div className="w-full animate-in fade-in duration-500">
        {activeTab === 'service_class' && <ServiceClassTab initialClasses={initialClasses} />}
        {activeTab === 'service_category' && (
          <ServiceCategoryTab
            initialCategories={initialCategories}
            initialClasses={initialClasses}
            initialClassIndex={initialClassIndex}
          />
        )}
        {activeTab === 'service' && (
          <ServiceTab
            initialServices={initialServices}
            categories={initialCategories}
            classes={initialClasses}
            classIndex={initialClassIndex}
          />
        )}
        {activeTab === 'app_role' && <AppRoleTab initialRoles={initialRoles} />}
        {activeTab === 'role_service' && (
          <AppRoleServiceTab
            initialRoles={initialRoles}
            initialServices={initialServices}
            initialRoleServices={initialRoleServices}
          />
        )}
        {activeTab === 'tenant_service' && (
          <TenantServiceTab
            initialTenants={initialTenants}
            initialServices={initialServices}
            initialTenantServices={initialTenantServices}
            initialCategories={initialCategories}
          />
        )}
        {activeTab === 'dashboard_ui' && (
          <TenantDashboardUiTab
            initialTenants={initialTenants}
            initialElements={initialUiDashboardElements}
            initialOverrides={initialTenantUiDashboardElements}
          />
        )}
      </div>
    </div>
  )
}
