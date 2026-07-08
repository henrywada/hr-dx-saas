'use client'

// page.tsx (src/app/(tenant)/(tenant-admin)/adm/(lifecycle)/lifecycle/page.tsx) から import される

import { useState } from 'react'
import type { LifecycleDashboardData, InstanceRow } from '../types'
import { InstanceList } from './InstanceList'
import { NewInstanceModal } from './NewInstanceModal'
import { TaskChecklistModal } from './TaskChecklistModal'
import { TemplateManager } from './TemplateManager'
import TenantBackLink from '@/components/common/TenantBackLink'

type Tab = 'onboarding' | 'offboarding' | 'templates'

interface Props {
  data: LifecycleDashboardData
  employees: { id: string; name: string; department_name: string | null }[]
}

export function LifecycleDashboard({ data, employees }: Props) {
  const [tab, setTab] = useState<Tab>('onboarding')
  const [showNewModal, setShowNewModal] = useState(false)
  const [newModalType, setNewModalType] = useState<'onboarding' | 'offboarding'>('onboarding')
  const [selectedInstance, setSelectedInstance] = useState<InstanceRow | null>(null)

  const allInstances = [...data.onboardingInstances, ...data.offboardingInstances]

  const handleSelectInstance = (id: string) => {
    setSelectedInstance(allInstances.find(i => i.id === id) ?? null)
  }

  const inProgressOnboarding = data.onboardingInstances.filter(
    i => i.status === 'in_progress'
  ).length
  const inProgressOffboarding = data.offboardingInstances.filter(
    i => i.status === 'in_progress'
  ).length

  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* パス */}
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600">
          /adm/lifecycle — 入退社ライフサイクルワークフロー
        </div>

        {/* ヘッダー */}
        <div className="bg-gray-200 border-b border-gray-300 px-6 py-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            入退社ライフサイクルワークフロー
          </h1>
          <div className="flex gap-2">
            <TenantBackLink />
            <button
              onClick={() => {
                setNewModalType('onboarding')
                setShowNewModal(true)
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 transition-opacity"
            >
              ＋ 入社フロー開始
            </button>
            <button
              onClick={() => {
                setNewModalType('offboarding')
                setShowNewModal(true)
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              ＋ 退社フロー開始
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* タブ（-mx-6 -mt-6 でページ最上部にブリード）*/}
          <div className="-mx-6 -mt-6 px-6 py-3.5 mb-6 border-b border-gray-200 bg-white flex gap-2">
            {[
              {
                key: 'onboarding' as Tab,
                label: `入社フロー (${data.onboardingInstances.length})`,
              },
              {
                key: 'offboarding' as Tab,
                label: `退社フロー (${data.offboardingInstances.length})`,
              },
              { key: 'templates' as Tab, label: 'テンプレート管理' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={
                  tab === t.key
                    ? 'rounded-full px-4 py-1.5 text-sm font-medium bg-primary text-white shadow-sm'
                    : 'rounded-full px-4 py-1.5 text-sm font-medium border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* サマリーバッジ（テンプレートタブ以外） */}
          {tab !== 'templates' && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">入社フロー進行中</p>
                <p className="text-3xl font-bold text-gray-900">{inProgressOnboarding}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">退社フロー進行中</p>
                <p className="text-3xl font-bold text-gray-900">{inProgressOffboarding}</p>
              </div>
            </div>
          )}

          {/* タブコンテンツ */}
          {tab === 'onboarding' && (
            <InstanceList
              instances={data.onboardingInstances}
              onSelectInstance={handleSelectInstance}
            />
          )}
          {tab === 'offboarding' && (
            <InstanceList
              instances={data.offboardingInstances}
              onSelectInstance={handleSelectInstance}
            />
          )}
          {tab === 'templates' && <TemplateManager templates={data.templates} />}
        </div>
      </div>

      {showNewModal && (
        <NewInstanceModal
          lifecycleType={newModalType}
          employees={employees}
          templates={data.templates.filter(t => t.lifecycle_type === newModalType)}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {selectedInstance && (
        <TaskChecklistModal
          instance={selectedInstance}
          employees={employees}
          onClose={() => setSelectedInstance(null)}
        />
      )}
    </div>
  )
}
