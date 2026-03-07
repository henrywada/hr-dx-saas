'use client';

import { useState } from 'react';
import ServiceCategoryTab from './ServiceCategoryTab';
import ServiceTab from './ServiceTab';
import AppRoleTab from './AppRoleTab';
import AppRoleServiceTab from './AppRoleServiceTab';

type TabType = 'service_category' | 'service' | 'app_role' | 'role_service';

const tabs: { key: TabType; label: string }[] = [
  { key: 'service_category', label: 'サービスカテゴリ' },
  { key: 'service', label: 'サービス' },
  { key: 'app_role', label: 'アプリロール' },
  { key: 'role_service', label: 'ロール×サービス' },
];

export default function SystemMasterTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('service_category');

  return (
    // max-w-4xl などの制限を外し、w-full で横いっぱいに広げます
    <div className="w-full px-4 py-6">
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                ${activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* コンテンツエリアも横幅いっぱいに */}
      <div className="w-full animate-in fade-in duration-500">
        {activeTab === 'service_category' && <ServiceCategoryTab />}
        {activeTab === 'service' && <ServiceTab />}
        {activeTab === 'app_role' && <AppRoleTab />}
        {activeTab === 'role_service' && <AppRoleServiceTab />}
      </div>
    </div>
  );
}