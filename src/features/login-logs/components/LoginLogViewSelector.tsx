'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { LogView } from '../params'

const OPTIONS: { value: LogView; label: string }[] = [
  { value: 'sessions', label: 'Log in/out' },
  { value: 'pages', label: 'ページ閲覧' },
]

interface LoginLogViewSelectorProps {
  view: LogView
}

export function LoginLogViewSelector({ view }: LoginLogViewSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = (next: LogView) => {
    // ym / tenant など他のクエリを保持したまま view のみ更新する（既定は URL から省略）
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'sessions') params.delete('view')
    else params.set('view', next)
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div role="radiogroup" aria-label="表示種別" className="flex items-center gap-4">
      {OPTIONS.map(o => (
        <label key={o.value} className="flex items-center gap-1.5 text-sm text-[#24292f] cursor-pointer">
          <input
            type="radio"
            name="login-log-view"
            value={o.value}
            checked={view === o.value}
            onChange={() => handleChange(o.value)}
            className="accent-primary"
          />
          {o.label}
        </label>
      ))}
    </div>
  )
}
