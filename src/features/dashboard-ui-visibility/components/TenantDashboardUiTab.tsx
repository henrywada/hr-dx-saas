'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import {
  setTenantUiElementVisibility,
  bulkSetTenantUiElementVisibility,
} from '@/features/dashboard-ui-visibility/actions'
import type { UiDashboardElement } from '@/features/dashboard-ui-visibility/types'

interface Props {
  initialTenants: { id: string; name: string }[]
  initialElements: UiDashboardElement[]
  /** tenant_id + ui_dashboard_element_id で is_visible=false の行 */
  initialOverrides: {
    tenant_id: string
    ui_dashboard_element_id: string
    is_visible: boolean
  }[]
}

const SCREEN_LABEL: Record<string, string> = {
  top: '一般画面 (/top)',
  adm: '管理画面 (/adm)',
}

export default function TenantDashboardUiTab({
  initialTenants,
  initialElements,
  initialOverrides,
}: Props) {
  const router = useRouter()
  const headerCheckboxRef = useRef<HTMLInputElement>(null)
  const [tenants] = useState(initialTenants)
  const [elements] = useState(initialElements)
  const [overrides, setOverrides] = useState(initialOverrides)
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialTenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(initialTenants[0].id)
    }
  }, [initialTenants, selectedTenantId])

  const isVisible = (elementId: string) => {
    const row = overrides.find(
      o => o.tenant_id === selectedTenantId && o.ui_dashboard_element_id === elementId
    )
    return row?.is_visible !== false
  }

  const allRowsVisible = elements.length > 0 && elements.every(el => isVisible(el.id))
  const noRowsVisible = elements.length === 0 || elements.every(el => !isVisible(el.id))

  useEffect(() => {
    const el = headerCheckboxRef.current
    if (!el) return
    el.indeterminate = !allRowsVisible && !noRowsVisible && elements.length > 0
  }, [allRowsVisible, noRowsVisible, elements.length, overrides, selectedTenantId])

  const handleToggle = async (elementId: string, currentlyVisible: boolean) => {
    if (loading || !selectedTenantId) return
    setLoading(true)
    const nextVisible = !currentlyVisible
    try {
      const result = await setTenantUiElementVisibility(
        selectedTenantId,
        elementId,
        nextVisible
      )
      if (!result.success) {
        alert(`更新に失敗しました: ${result.error}`)
        return
      }
      setOverrides(prev => {
        if (nextVisible) {
          return prev.filter(
            o =>
              !(
                o.tenant_id === selectedTenantId &&
                o.ui_dashboard_element_id === elementId
              )
          )
        }
        const exists = prev.some(
          o =>
            o.tenant_id === selectedTenantId && o.ui_dashboard_element_id === elementId
        )
        if (exists) {
          return prev.map(o =>
            o.tenant_id === selectedTenantId && o.ui_dashboard_element_id === elementId
              ? { ...o, is_visible: false }
              : o
          )
        }
        return [
          ...prev,
          {
            tenant_id: selectedTenantId,
            ui_dashboard_element_id: elementId,
            is_visible: false,
          },
        ]
      })
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      alert(`エラーが発生しました: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const wantVisible = e.target.checked
    if (loading || !selectedTenantId || elements.length === 0) return
    setLoading(true)
    try {
      const ids = elements.map(el => el.id)
      const result = await bulkSetTenantUiElementVisibility(
        selectedTenantId,
        ids,
        wantVisible
      )
      if (!result.success) {
        alert(`更新に失敗しました: ${result.error}`)
        return
      }
      setOverrides(prev => {
        if (wantVisible) {
          const idSet = new Set(ids)
          return prev.filter(
            o =>
              !(
                o.tenant_id === selectedTenantId &&
                idSet.has(o.ui_dashboard_element_id)
              )
          )
        }
        return [
          ...prev.filter(o => o.tenant_id !== selectedTenantId),
          ...ids.map(id => ({
            tenant_id: selectedTenantId,
            ui_dashboard_element_id: id,
            is_visible: false,
          })),
        ]
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
      <div className="bg-white p-5 rounded-md border border-gray-200 shadow-xs max-w-2xl">
        <div className="mb-4">
          <h2 className="text-lg font-medium text-gray-900">ダッシュボード表示制御</h2>
          <p className="mt-1 text-xs text-gray-500">
            オフにすると該当テナントの /top・/adm で要素が非表示になります（行なし＝表示）。
            service 紐付けがある要素は、契約（テナント×サービス）も必要です。
          </p>
        </div>
        <label htmlFor="dashboard-ui-tenant-select" className="sr-only">
          対象のテナントを選択
        </label>
        <select
          id="dashboard-ui-tenant-select"
          value={selectedTenantId}
          onChange={e => setSelectedTenantId(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-[#FD7601] focus:border-[#FD7601] sm:text-xs rounded-md bg-gray-50"
        >
          {tenants.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
          {tenants.length === 0 && <option value="">テナントが存在しません</option>}
        </select>
      </div>

      {selectedTenantId ? (
        <div className="bg-white rounded-xl border border-[#e2e6ec] overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-[#f6f8fa] border-b border-[#e2e6ec]">
                <th className="px-4 py-1 text-center text-xs font-semibold text-[#24292f] uppercase tracking-wider w-12">
                  No
                </th>
                <th className="px-4 py-1 text-left text-xs font-semibold text-[#24292f] uppercase tracking-wider">
                  画面
                </th>
                <th className="px-4 py-1 text-left text-xs font-semibold text-[#24292f] uppercase tracking-wider">
                  種別
                </th>
                <th className="px-4 py-1 text-left text-xs font-semibold text-[#24292f] uppercase tracking-wider">
                  表示名
                </th>
                <th className="px-4 py-1 text-left text-xs font-semibold text-[#24292f] uppercase tracking-wider">
                  element_key
                </th>
                <th className="px-4 py-1 text-center text-xs font-semibold text-[#24292f] uppercase tracking-wider w-36">
                  <div className="flex flex-col items-center gap-2">
                    <span>表示 / 非表示</span>
                    <label className="flex cursor-pointer items-center gap-1.5 font-normal normal-case tracking-normal">
                      <input
                        ref={headerCheckboxRef}
                        type="checkbox"
                        checked={allRowsVisible}
                        onChange={handleBulkToggle}
                        disabled={loading || elements.length === 0}
                        className="h-4 w-4 rounded border-gray-300 text-[#FD7601] focus:ring-[#FD7601] disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="表示中の要素をすべて表示または非表示にする"
                      />
                      <span className="text-[11px] font-medium text-gray-600">すべて</span>
                    </label>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {elements.map((el, rowIndex) => {
                const visible = isVisible(el.id)
                return (
                  <tr
                    key={el.id}
                    className="bg-white hover:bg-[#f6f8fa] border-b border-[#e2e6ec] transition-colors"
                  >
                    <td className="px-4 py-1 whitespace-nowrap text-center text-xs text-gray-600 tabular-nums">
                      {rowIndex + 1}
                    </td>
                    <td className="px-4 py-1 whitespace-nowrap text-xs text-gray-700">
                      {SCREEN_LABEL[el.screen] ?? el.screen}
                    </td>
                    <td className="px-4 py-1 whitespace-nowrap text-xs text-gray-700">
                      <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-[#f6f8fa] text-[#FD7601] border border-[#e2e6ec]">
                        {el.element_type}
                      </span>
                    </td>
                    <td className="px-4 py-1 whitespace-nowrap text-sm font-medium text-[#24292f]">
                      {el.label}
                    </td>
                    <td className="px-4 py-1 whitespace-nowrap text-xs text-gray-500 font-mono">
                      {el.element_key}
                    </td>
                    <td className="px-4 py-1 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleToggle(el.id, visible)}
                        disabled={loading}
                        className={`
                          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#FD7601] focus:ring-offset-2
                          ${visible ? 'bg-[#FD7601]' : 'bg-gray-200'}
                          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        role="switch"
                        aria-checked={visible}
                        aria-label={`${el.label}の表示切替`}
                      >
                        <span
                          aria-hidden="true"
                          className={`
                            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                            transition duration-200 ease-in-out
                            ${visible ? 'translate-x-5' : 'translate-x-0'}
                          `}
                        >
                          {visible && (
                            <Check className="absolute inset-0 h-full w-full text-[#FD7601] p-1" />
                          )}
                        </span>
                      </button>
                    </td>
                  </tr>
                )
              })}
              {elements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-500">
                    ダッシュボード要素マスタがありません。マイグレーションを適用してください。
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
