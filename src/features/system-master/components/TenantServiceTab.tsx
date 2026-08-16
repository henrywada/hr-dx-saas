/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSystemMaster } from '../hooks/useSystemMaster'
import { Check } from 'lucide-react'
import { DashboardPreviewButton } from '@/features/dashboard-ui-visibility/components/DashboardPreviewModal'
import type { UiDashboardElement } from '@/features/dashboard-ui-visibility/types'
import type {
  PreviewCategory,
  PreviewClass,
  PreviewClassIndex,
  PreviewService,
} from '@/features/dashboard-ui-visibility/visibility'

/** テナント×サービス一覧で絞り込める対象（saas_adm は一覧対象外） */
type AudienceFilter = 'all' | 'all_users' | 'adm'

const AUDIENCE_RADIO_OPTIONS: { value: AudienceFilter; label: string }[] = [
  { value: 'all', label: '全て' },
  { value: 'all_users', label: 'all_users' },
  { value: 'adm', label: 'adm' },
]

interface Props {
  initialTenants: any[]
  initialServices: any[]
  initialTenantServices: any[]
  initialCategories: any[]
  /** カード見出し（未指定時は契約テナント向け） */
  title?: string
  /** セレクトの id（タブが複数ある場合の重複回避） */
  selectId?: string
  /** 対象が0件のときのセレクト表示 */
  emptyLabel?: string
  dashboardElements?: UiDashboardElement[]
  dashboardOverrides?: {
    tenant_id: string
    ui_dashboard_element_id: string
    is_visible: boolean
  }[]
  menuServices?: PreviewService[]
  menuCategories?: PreviewCategory[]
  menuClasses?: PreviewClass[]
  menuClassIndex?: PreviewClassIndex[]
}

export default function TenantServiceTab({
  initialTenants,
  initialServices,
  initialTenantServices,
  initialCategories,
  title = 'テナント×サービス管理',
  selectId = 'tenant-select',
  emptyLabel = 'テナントが存在しません',
  dashboardElements = [],
  dashboardOverrides = [],
  menuServices = [],
  menuCategories = [],
  menuClasses = [],
  menuClassIndex = [],
}: Props) {
  const router = useRouter()
  const { toggleTenantService, bulkSetTenantServices } = useSystemMaster()
  const headerCheckboxRef = useRef<HTMLInputElement>(null)
  const [tenants, setTenants] = useState<any[]>(initialTenants)
  const [services, setServices] = useState<any[]>(initialServices)
  const [tenantServices, setTenantServices] = useState<any[]>(initialTenantServices)
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  // 初期表示は「全て」（all_users + adm）
  const [selectedAudience, setSelectedAudience] = useState<AudienceFilter>('all')

  // カテゴリIDから名前を引くマップ
  const categoryMap = new Map<string, string>()
  initialCategories.forEach((cat: any) => {
    categoryMap.set(cat.id, cat.name)
  })

  useEffect(() => {
    setTenants(initialTenants)
    setServices(initialServices)
    setTenantServices(initialTenantServices)
    // 初回ロード時やテナント一覧が更新された時に、未選択なら最初のテナントを選択する
    if (initialTenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(initialTenants[0].id)
    }
  }, [initialTenants, initialServices, initialTenantServices, selectedTenantId])

  const handleToggle = async (serviceId: string, currentEnabled: boolean) => {
    if (loading || !selectedTenantId) return
    setLoading(true)

    try {
      const result = await toggleTenantService(selectedTenantId, serviceId, !currentEnabled)

      if (!result.success) {
        alert(`更新に失敗しました: ${result.error}`)
        return
      }
      const nextEnabled = !currentEnabled
      setTenantServices(prev => {
        if (nextEnabled) {
          if (prev.some(ts => ts.tenant_id === selectedTenantId && ts.service_id === serviceId)) {
            return prev
          }
          return [...prev, { tenant_id: selectedTenantId, service_id: serviceId }]
        }
        return prev.filter(
          ts => !(ts.tenant_id === selectedTenantId && ts.service_id === serviceId)
        )
      })
      router.refresh()
    } catch (error: any) {
      alert(`エラーが発生しました: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const isEnabled = (serviceId: string) => {
    return tenantServices.some(
      ts => ts.tenant_id === selectedTenantId && ts.service_id === serviceId
    )
  }

  // SaaS 管理専用は除外し、選択された対象(AUDIENCE)で絞り込み
  const displayServices = useMemo(
    () =>
      services.filter(s => {
        if (s.target_audience === 'saas_adm') return false
        if (selectedAudience === 'all') return true
        const audience = s.target_audience ?? 'all_users'
        return audience === selectedAudience
      }),
    [services, selectedAudience]
  )
  const allRowsEnabled = displayServices.length > 0 && displayServices.every(s => isEnabled(s.id))
  const noRowsEnabled = displayServices.length === 0 || displayServices.every(s => !isEnabled(s.id))

  useEffect(() => {
    const el = headerCheckboxRef.current
    if (!el) return
    el.indeterminate = !allRowsEnabled && !noRowsEnabled && displayServices.length > 0
  }, [allRowsEnabled, noRowsEnabled, displayServices.length])

  const handleBulkToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const wantOn = e.target.checked
    if (loading || !selectedTenantId || displayServices.length === 0) return
    setLoading(true)
    try {
      const ids = displayServices.map(s => s.id)
      const result = await bulkSetTenantServices(selectedTenantId, ids, wantOn)
      if (!result.success) {
        alert(`更新に失敗しました: ${result.error}`)
        return
      }
      setTenantServices(prev => {
        if (wantOn) {
          const keys = new Set(prev.map(ts => `${ts.tenant_id}:${ts.service_id}`))
          const next = [...prev]
          for (const s of displayServices) {
            const k = `${selectedTenantId}:${s.id}`
            if (!keys.has(k)) {
              next.push({ tenant_id: selectedTenantId, service_id: s.id })
              keys.add(k)
            }
          }
          return next
        }
        const idSet = new Set(displayServices.map(s => s.id))
        return prev.filter(ts => !(ts.tenant_id === selectedTenantId && idSet.has(ts.service_id)))
      })
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      alert(`エラーが発生しました: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ gap: 'var(--space-3)' }} className="flex flex-col">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* テナント選択 */}
        <div className="bg-white p-5 rounded-md border border-gray-200 shadow-xs h-full">
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2 className="text-lg font-medium text-gray-900">{title}</h2>
            <DashboardPreviewButton
              tenantName={tenants.find(t => t.id === selectedTenantId)?.name ?? '未選択'}
              elements={dashboardElements}
              contractedServiceIds={
                new Set(
                  tenantServices
                    .filter(ts => ts.tenant_id === selectedTenantId)
                    .map(ts => ts.service_id)
                    .filter(Boolean)
                )
              }
              hiddenElementIds={
                new Set(
                  dashboardOverrides
                    .filter(o => o.tenant_id === selectedTenantId && o.is_visible === false)
                    .map(o => o.ui_dashboard_element_id)
                )
              }
              disabled={!selectedTenantId}
              services={menuServices.length > 0 ? menuServices : services}
              categories={menuCategories.length > 0 ? menuCategories : initialCategories}
              classes={menuClasses}
              classIndex={menuClassIndex}
            />
          </div>
          <label htmlFor={selectId} className="sr-only">
            対象のテナントを選択
          </label>
          <select
            id={selectId}
            value={selectedTenantId}
            onChange={e => setSelectedTenantId(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-[#FD7601] focus:border-[#FD7601] sm:text-xs rounded-md bg-gray-50"
          >
            {tenants.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            {tenants.length === 0 && <option value="">{emptyLabel}</option>}
          </select>
        </div>

        {/* 対象(AUDIENCE)で一覧を絞り込み */}
        <div className="bg-white p-5 rounded-md border border-gray-200 shadow-xs h-full">
          <h2 className="mb-4 text-lg font-medium text-gray-900">対象(AUDIENCE)</h2>
          <fieldset className="flex flex-wrap items-center gap-4 border-0 p-0">
            <legend className="sr-only">対象(AUDIENCE)で絞り込み</legend>
            {AUDIENCE_RADIO_OPTIONS.map(option => (
              <label key={option.value} className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name={`${selectId}-audience`}
                  value={option.value}
                  checked={selectedAudience === option.value}
                  onChange={() => setSelectedAudience(option.value)}
                  className="h-4 w-4 border-gray-300 text-[#FD7601] focus:ring-[#FD7601]"
                />
                <span className="text-xs font-medium text-gray-700">{option.label}</span>
              </label>
            ))}
          </fieldset>
        </div>
      </div>

      {/* サービス一覧（縦並び） */}
      {selectedTenantId ? (
        <div className="bg-white rounded-xl border border-[#e2e6ec] overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-[#f6f8fa] border-b border-[#e2e6ec]">
                <th
                  scope="col"
                  className="px-4 py-1 text-center text-xs font-semibold text-[#24292f] uppercase tracking-wider w-12 min-w-12"
                >
                  No
                </th>
                <th
                  scope="col"
                  className="px-4 py-1 text-left text-xs font-semibold text-[#24292f] uppercase tracking-wider"
                >
                  対象(Audience)
                </th>
                <th
                  scope="col"
                  className="px-4 py-1 text-left text-xs font-semibold text-[#24292f] uppercase tracking-wider"
                >
                  カテゴリー
                </th>
                <th
                  scope="col"
                  className="px-4 py-1 text-left text-xs font-semibold text-[#24292f] uppercase tracking-wider"
                >
                  サービス名
                </th>
                <th
                  scope="col"
                  className="px-4 py-1 text-left text-xs font-semibold text-[#24292f] uppercase tracking-wider"
                >
                  パス
                </th>
                <th
                  scope="col"
                  className="px-4 py-1 text-center text-xs font-semibold text-[#24292f] uppercase tracking-wider w-36"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span>有効 / 無効</span>
                    <label className="flex cursor-pointer items-center gap-1.5 font-normal normal-case tracking-normal">
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        checked={allRowsEnabled}
                        onChange={handleBulkToggle}
                        disabled={loading || displayServices.length === 0}
                        className="h-4 w-4 rounded border-gray-300 text-[#FD7601] focus:ring-[#FD7601] disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="表示中のサービスをすべて有効または無効にする"
                      />
                      <span className="text-[11px] font-medium text-gray-600">すべて</span>
                    </label>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {displayServices.map((service, rowIndex) => {
                const enabled = isEnabled(service.id)
                return (
                  <tr
                    key={service.id}
                    className="bg-white hover:bg-[#f6f8fa] border-b border-[#e2e6ec] transition-colors"
                  >
                    <td className="px-4 py-1 whitespace-nowrap text-center text-xs text-gray-600 tabular-nums">
                      {rowIndex + 1}
                    </td>
                    <td className="px-4 py-1 whitespace-nowrap text-xs text-gray-700">
                      <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-[#f6f8fa] text-[#FD7601] border border-[#e2e6ec]">
                        {service.target_audience ?? 'all_users'}
                      </span>
                    </td>
                    <td className="px-4 py-1 whitespace-nowrap text-xs text-gray-700">
                      {categoryMap.get(service.service_category_id) || '未設定'}
                    </td>
                    <td className="px-4 py-1 whitespace-nowrap text-sm font-medium text-[#24292f]">
                      {service.name}
                    </td>
                    <td className="px-4 py-1 whitespace-nowrap text-xs text-gray-500">
                      <span className="px-2.5 py-1 rounded bg-gray-100 text-xs text-gray-600 font-mono">
                        {service.route_path || '設定なし'}
                      </span>
                    </td>
                    <td className="px-4 py-1 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleToggle(service.id, enabled)}
                        disabled={loading}
                        className={`
                          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#FD7601] focus:ring-offset-2
                          ${enabled ? 'bg-[#FD7601]' : 'bg-gray-200'}
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
                            <Check className="absolute inset-0 h-full w-full text-[#FD7601] p-1" />
                          )}
                        </span>
                      </button>
                    </td>
                  </tr>
                )
              })}
              {displayServices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-500">
                    {services.filter(s => s.target_audience !== 'saas_adm').length === 0
                      ? 'サービスが登録されていません。'
                      : '選択した対象(AUDIENCE)に該当するサービスがありません。'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-50 p-6 rounded-md border border-gray-200 text-center text-xs text-gray-500">
          設定を行うテナントを選択してください。
        </div>
      )}
    </div>
  )
}
