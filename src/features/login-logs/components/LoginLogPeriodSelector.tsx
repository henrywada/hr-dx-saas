'use client'

import { usePathname, useRouter } from 'next/navigation'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

const ALL_VALUE = 'all'

interface LoginLogPeriodSelectorProps {
  /** 選択中の年月（YYYY-MM）。null は「全て」 */
  yearMonth: string | null
}

export function LoginLogPeriodSelector({ yearMonth }: LoginLogPeriodSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()

  const now = new Date()
  const curY = now.getFullYear()
  const curM = now.getMonth() + 1

  const options: { value: string; label: string }[] = [{ value: ALL_VALUE, label: '全て' }]
  for (let i = 0; i < 24; i++) {
    const d = new Date(curY, curM - 1 - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    options.push({ value: `${y}-${pad2(m)}`, label: `${y}年${m}月` })
  }

  const value = yearMonth ?? ALL_VALUE

  return (
    <select
      value={value}
      onChange={e => {
        const v = e.target.value
        router.push(v === ALL_VALUE ? pathname : `${pathname}?ym=${v}`)
      }}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[9rem]"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
