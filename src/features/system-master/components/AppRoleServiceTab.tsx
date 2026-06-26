/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSystemMaster } from '../hooks/useSystemMaster'

interface Props {
  initialRoles: any[]
  initialServices: any[]
  initialRoleServices: any[]
}

export default function AppRoleServiceTab({
  initialRoles,
  initialServices,
  initialRoleServices,
}: Props) {
  const router = useRouter()
  const { toggleAppRoleService, bulkSetAppRoleServiceColumn } = useSystemMaster()
  const headerCheckboxRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const allCheckboxRef = useRef<HTMLInputElement | null>(null)
  const [roles, setRoles] = useState<any[]>(initialRoles)
  const [services, setServices] = useState<any[]>(initialServices)
  const [roleServices, setRoleServices] = useState<any[]>(initialRoleServices)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setRoles(initialRoles)
    setServices(initialServices)
    setRoleServices(initialRoleServices)
  }, [initialRoles, initialServices, initialRoleServices])

  const admServices = useMemo(
    () => services.filter(service => service.target_audience === 'adm'),
    [services]
  )

  // 従業員ロール（app_role=employee）はこのマトリクスでは列を表示しない
  const matrixRoles = useMemo(() => roles.filter(r => r.app_role !== 'employee'), [roles])

  const isCellEnabled = (roleId: string, serviceId: string) =>
    roleServices.some(rs => rs.app_role_id === roleId && rs.service_id === serviceId)

  const columnAllEnabled = (roleId: string) =>
    admServices.length > 0 && admServices.every(s => isCellEnabled(roleId, s.id))
  const columnNoneEnabled = (roleId: string) =>
    admServices.length === 0 || admServices.every(s => !isCellEnabled(roleId, s.id))

  const allMatrixEnabled = () =>
    matrixRoles.length > 0 &&
    admServices.length > 0 &&
    matrixRoles.every(role => admServices.every(s => isCellEnabled(role.id, s.id)))
  const noneMatrixEnabled = () =>
    matrixRoles.length === 0 ||
    admServices.length === 0 ||
    matrixRoles.every(role => admServices.every(s => !isCellEnabled(role.id, s.id)))

  useEffect(() => {
    matrixRoles.forEach(role => {
      const el = headerCheckboxRefs.current[role.id]
      if (!el) return
      const all =
        admServices.length > 0 &&
        admServices.every(s =>
          roleServices.some(rs => rs.app_role_id === role.id && rs.service_id === s.id)
        )
      const none =
        admServices.length === 0 ||
        admServices.every(
          s => !roleServices.some(rs => rs.app_role_id === role.id && rs.service_id === s.id)
        )
      el.indeterminate = !all && !none && admServices.length > 0
    })

    // 全選択チェックボックスの状態を更新
    const allEl = allCheckboxRef.current
    if (!allEl) return
    const all = allMatrixEnabled()
    const none = noneMatrixEnabled()
    allEl.checked = all
    allEl.indeterminate = !all && !none
  }, [matrixRoles, admServices, roleServices])

  const handleBulkColumn = async (roleId: string, wantOn: boolean) => {
    if (loading || admServices.length === 0) return
    setLoading(true)
    try {
      const serviceIds = admServices.map(s => s.id)
      const result = await bulkSetAppRoleServiceColumn(roleId, serviceIds, wantOn)
      if (!result.success) {
        alert(`更新に失敗しました: ${result.error}`)
        return
      }
      setRoleServices(prev => {
        if (wantOn) {
          const keys = new Set(prev.map(rs => `${rs.app_role_id}:${rs.service_id}`))
          const next = [...prev]
          for (const s of admServices) {
            const k = `${roleId}:${s.id}`
            if (!keys.has(k)) {
              next.push({ app_role_id: roleId, service_id: s.id })
              keys.add(k)
            }
          }
          return next
        }
        const idSet = new Set(admServices.map(s => s.id))
        return prev.filter(rs => !(rs.app_role_id === roleId && idSet.has(rs.service_id)))
      })
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      alert(`エラーが発生しました: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkAll = async (wantOn: boolean) => {
    if (loading || matrixRoles.length === 0 || admServices.length === 0) return
    setLoading(true)
    try {
      const promises = matrixRoles.map(role => {
        const serviceIds = admServices.map(s => s.id)
        return bulkSetAppRoleServiceColumn(role.id, serviceIds, wantOn)
      })
      const results = await Promise.all(promises)
      const hasError = results.some(r => !r.success)
      if (hasError) {
        alert('一部の更新に失敗しました')
        return
      }
      setRoleServices(prev => {
        if (wantOn) {
          const keys = new Set(prev.map(rs => `${rs.app_role_id}:${rs.service_id}`))
          const next = [...prev]
          for (const role of matrixRoles) {
            for (const s of admServices) {
              const k = `${role.id}:${s.id}`
              if (!keys.has(k)) {
                next.push({ app_role_id: role.id, service_id: s.id })
                keys.add(k)
              }
            }
          }
          return next
        }
        const roleIdSet = new Set(matrixRoles.map(r => r.id))
        const serviceIdSet = new Set(admServices.map(s => s.id))
        return prev.filter(
          rs => !(roleIdSet.has(rs.app_role_id) && serviceIdSet.has(rs.service_id))
        )
      })
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      alert(`エラーが発生しました: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (roleId: string, serviceId: string, currentEnabled: boolean) => {
    if (loading) return
    setLoading(true)

    try {
      const result = await toggleAppRoleService(roleId, serviceId, !currentEnabled)

      if (!result.success) {
        alert(`更新に失敗しました: ${result.error}`)
      }
    } catch (error: any) {
      alert(`エラーが発生しました: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 w-full">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">ロール × サービス 権限マトリクス</h3>
        {loading && <span className="text-[#FD7601] animate-pulse font-bold">更新中...</span>}
      </div>

      <div className="overflow-x-auto border border-[#e2e6ec] rounded-xl">
        <table className="min-w-full bg-white border-collapse">
          <thead>
            <tr className="bg-[#f6f8fa] border-b border-[#e2e6ec]">
              <th className="px-2 py-1 border-[#e2e6ec] text-center text-xs font-semibold text-[#24292f] uppercase tracking-wider bg-[#f6f8fa] sticky left-0 z-20 w-12 min-w-12">
                <div className="flex flex-col items-center gap-1">
                  <input
                    ref={allCheckboxRef}
                    type="checkbox"
                    checked={allMatrixEnabled()}
                    onChange={e => handleBulkAll(e.target.checked)}
                    disabled={loading || matrixRoles.length === 0 || admServices.length === 0}
                    className="h-4 w-4 rounded border-gray-300 text-[#FD7601] focus:ring-[#FD7601] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="全てのロール×サービス権限を有効または無効にする"
                    title="全て"
                  />
                  <span className="leading-tight text-[10px]">すべて</span>
                </div>
              </th>
              <th className="px-4 py-1 border-[#e2e6ec] text-left text-xs font-semibold text-[#24292f] uppercase tracking-wider bg-[#f6f8fa] sticky left-12 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                サービス \ ロール
              </th>

              {/* target_audience 列（ロール列の左側） */}
              <th className="px-4 py-1 border-[#e2e6ec] text-center text-xs font-semibold text-[#24292f] uppercase tracking-wider min-w-[140px]">
                対象 (Audience)
              </th>

              {matrixRoles.map(role => (
                <th
                  key={role.id}
                  className="px-4 py-1 border-[#e2e6ec] text-center text-xs font-semibold text-[#24292f] uppercase tracking-wider min-w-[120px]"
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <input
                      ref={el => {
                        headerCheckboxRefs.current[role.id] = el
                      }}
                      type="checkbox"
                      checked={columnAllEnabled(role.id)}
                      onChange={e => handleBulkColumn(role.id, e.target.checked)}
                      disabled={loading || admServices.length === 0}
                      className="h-4 w-4 rounded border-gray-300 text-[#FD7601] focus:ring-[#FD7601] disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`「${role.name}」列の権限をすべて有効または無効にする`}
                    />
                    <span className="leading-tight">{role.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {admServices.map((service, rowIndex) => (
              <tr
                key={service.id}
                className="bg-white hover:bg-[#f6f8fa] border-b border-[#e2e6ec] transition-colors"
              >
                <td className="px-2 py-1 border-[#e2e6ec] text-center text-xs text-gray-600 tabular-nums bg-white sticky left-0 z-20">
                  {rowIndex + 1}
                </td>
                <td className="px-4 py-1 border-[#e2e6ec] text-sm font-medium text-[#24292f] bg-white sticky left-12 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  {service.name}
                </td>

                {/* ここに target_audience を表示（null の場合は all_users を表示） */}
                <td className="px-4 py-1 border-[#e2e6ec] text-center">
                  <span className="inline-block px-2 py-1 text-xs font-mono bg-gray-100 rounded">
                    {service.target_audience ?? 'all_users'}
                  </span>
                </td>

                {matrixRoles.map(role => {
                  const isEnabled = isCellEnabled(role.id, service.id)

                  return (
                    <td
                      key={`${role.id}-${service.id}`}
                      className="px-4 py-1 border-[#e2e6ec] text-center"
                    >
                      <div className="flex justify-center items-center h-full">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          disabled={loading}
                          onChange={() => handleToggle(role.id, service.id, isEnabled)}
                          className="w-4 h-4 cursor-pointer accent-blue-600 transition-transform active:scale-90 disabled:opacity-30"
                        />
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500 italic">※チェックを入れると即座に権限が反映されます。</p>
    </div>
  )
}
