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
import PlanConfigTab from '@/features/plan-config/components/PlanConfigTab'
import TenantBackLink from '@/components/common/TenantBackLink'
import type { UiDashboardElement } from '@/features/dashboard-ui-visibility/types'
import type { PlanConfigRow } from '@/features/plan-config/types'
import type { PlanType } from '@/features/signup/types'

type TabType =
  | 'service_class'
  | 'service_category'
  | 'service'
  | 'app_role'
  | 'role_service'
  | 'tenant_service'
  | 'template_tenant'
  | 'dashboard_ui'
  | 'template_dashboard_ui'
  | 'plan_config'

type GroupType = 'master' | 'assignment' | 'template'

const groups: { key: GroupType; label: string; tabs: { key: TabType; label: string }[] }[] = [
  {
    key: 'master',
    label: 'マスタ',
    tabs: [
      { key: 'service_class', label: 'クラス' },
      { key: 'service_category', label: 'サービスカテゴリ' },
      { key: 'service', label: 'サービス' },
      { key: 'app_role', label: 'アプリロール登録' },
    ],
  },
  {
    key: 'assignment',
    label: '割当',
    tabs: [
      { key: 'role_service', label: 'ロール×サービス' },
      { key: 'tenant_service', label: 'テナント×サービス' },
      { key: 'dashboard_ui', label: 'ダッシュボード表示' },
    ],
  },
  {
    key: 'template',
    label: 'Planテンプレート',
    tabs: [
      { key: 'plan_config', label: 'プラン条件' },
      { key: 'template_tenant', label: 'テナント×サービス' },
      { key: 'template_dashboard_ui', label: 'ダッシュボード表示' },
    ],
  },
]

function groupOf(tab: TabType): GroupType {
  const found = groups.find(g => g.tabs.some(t => t.key === tab))
  return found?.key ?? 'master'
}

interface Props {
  initialClasses: any[]
  initialClassIndex: any[]
  initialCategories: any[]
  initialServices: any[]
  initialRoles: any[]
  initialRoleServices: any[]
  initialTenants: any[]
  initialTemplateTenants: any[]
  initialTenantServices: any[]
  initialUiDashboardElements: UiDashboardElement[]
  initialTenantUiDashboardElements: {
    tenant_id: string
    ui_dashboard_element_id: string
    is_visible: boolean
  }[]
  initialPlanConfigs: PlanConfigRow[]
  existingTenantCounts: Record<PlanType, number>
}

export default function SystemMasterTabs({
  initialClasses,
  initialClassIndex,
  initialCategories,
  initialServices,
  initialRoles,
  initialRoleServices,
  initialTenants,
  initialTemplateTenants,
  initialTenantServices,
  initialUiDashboardElements,
  initialTenantUiDashboardElements,
  initialPlanConfigs,
  existingTenantCounts,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('service_class')
  const activeGroup = groupOf(activeTab)
  const currentGroup = groups.find(g => g.key === activeGroup) ?? groups[0]

  const handleGroupChange = (groupKey: GroupType) => {
    const group = groups.find(g => g.key === groupKey)
    if (!group) return
    setActiveTab(group.tabs[0].key)
  }

  return (
    <div className="w-full px-4 py-6">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="システムマスタの大分類">
          {groups.map(group => (
            <button
              key={group.key}
              type="button"
              onClick={() => handleGroupChange(group.key)}
              className={`
                whitespace-nowrap border-b-2 py-3 px-1 text-sm font-semibold transition-colors
                ${
                  activeGroup === group.key
                    ? 'border-[#FD7601] text-[#FD7601]'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              {group.label}
            </button>
          ))}
        </nav>
        <TenantBackLink className="mb-3 shrink-0" />
      </div>

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="システムマスタの詳細">
        {currentGroup.tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
              ${
                activeTab === tab.key
                  ? 'bg-[#FD7601] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
            dashboardElements={initialUiDashboardElements}
            dashboardOverrides={initialTenantUiDashboardElements}
            menuServices={initialServices}
            menuCategories={initialCategories}
            menuClasses={initialClasses}
            menuClassIndex={initialClassIndex}
          />
        )}
        {activeTab === 'plan_config' && (
          <PlanConfigTab
            initialPlans={initialPlanConfigs}
            existingTenantCounts={existingTenantCounts}
          />
        )}
        {activeTab === 'template_tenant' && (
          <TenantServiceTab
            initialTenants={initialTemplateTenants}
            initialServices={initialServices}
            initialTenantServices={initialTenantServices}
            initialCategories={initialCategories}
            title="テンプレート用テナント管理"
            selectId="template-tenant-select"
            emptyLabel="テンプレート用テナントが存在しません"
            dashboardElements={initialUiDashboardElements}
            dashboardOverrides={initialTenantUiDashboardElements}
            menuServices={initialServices}
            menuCategories={initialCategories}
            menuClasses={initialClasses}
            menuClassIndex={initialClassIndex}
          />
        )}
        {activeTab === 'dashboard_ui' && (
          <TenantDashboardUiTab
            initialTenants={initialTenants}
            initialElements={initialUiDashboardElements}
            initialOverrides={initialTenantUiDashboardElements}
            initialTenantServices={initialTenantServices}
            menuServices={initialServices}
            menuCategories={initialCategories}
            menuClasses={initialClasses}
            menuClassIndex={initialClassIndex}
          />
        )}
        {activeTab === 'template_dashboard_ui' && (
          <TenantDashboardUiTab
            initialTenants={initialTemplateTenants}
            initialElements={initialUiDashboardElements}
            initialOverrides={initialTenantUiDashboardElements}
            initialTenantServices={initialTenantServices}
            menuServices={initialServices}
            menuCategories={initialCategories}
            menuClasses={initialClasses}
            menuClassIndex={initialClassIndex}
            title="テンプレート用ダッシュボード表示"
            description="オフにした要素は、このプランで新規申込したテナントの /top・/adm で非表示になります（サインアップ時にコピー）。"
            selectId="template-dashboard-ui-tenant-select"
            emptyLabel="テンプレート用テナントが存在しません"
          />
        )}
      </div>
    </div>
  )
}
