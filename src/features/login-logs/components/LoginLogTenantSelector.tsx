'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const ALL_VALUE = 'all'

interface LoginLogTenantSelectorProps {
  /** 選択中のテナントID。null は「全て」 */
  tenantId: string | null
  options: { id: string; name: string }[]
}

export function LoginLogTenantSelector({ tenantId, options }: LoginLogTenantSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return (
    <select
      value={tenantId ?? ALL_VALUE}
      onChange={e => {
        const v = e.target.value
        // ym など他のクエリを保持したまま tenant のみ更新する
        const params = new URLSearchParams(searchParams.toString())
        if (v === ALL_VALUE) params.delete('tenant')
        else params.set('tenant', v)
        const qs = params.toString()
        router.push(qs ? `${pathname}?${qs}` : pathname)
      }}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[12rem] max-w-xs"
    >
      <option value={ALL_VALUE}>全て</option>
      {options.map(o => (
        <option key={o.id} value={o.id}>
          {o.name || '(名称未設定)'}
        </option>
      ))}
    </select>
  )
}
