'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { APP_ROUTES } from '@/config/routes'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function addMonths(y: number, m: number, delta: number) {
  const d = new Date(y, m - 1 + delta, 1)
  return { y: d.getFullYear(), m: d.getMonth() + 1 }
}

type MonthSelectorProps = {
  year: number
  month: number
}

export function MonthSelector({ year, month }: MonthSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const fallbackBase = APP_ROUTES.TENANT.ADMIN_ATTENDANCE_DASHBOARD

  const go = (y: number, m: number) => {
    // 現在のパスを優先（locale やルート変更でも勤怠ダッシュに留まる）
    const base =
      pathname && pathname.includes('/adm/attendance/dashboard')
        ? pathname
        : fallbackBase
    router.push(`${base}?year=${y}&month=${m}`)
  }

  const prev = addMonths(year, month, -1)
  const next = addMonths(year, month, 1)

  const options: { y: number; m: number; label: string }[] = []
  const now = new Date()
  const curY = now.getFullYear()
  const curM = now.getMonth() + 1
  for (let i = 0; i < 36; i++) {
    const t = addMonths(curY, curM, -24 + i)
    options.push({
      y: t.y,
      m: t.m,
      label: `${t.y}年${t.m}月`,
    })
  }

  const value = `${year}-${pad2(month)}`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="!px-2"
        aria-label="前月"
        onClick={() => go(prev.y, prev.m)}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <select
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[9rem]"
        value={value}
        onChange={(e) => {
          const [y, m] = e.target.value.split('-').map(Number)
          go(y, m)
        }}
      >
        {options.map((o) => (
          <option key={`${o.y}-${o.m}`} value={`${o.y}-${pad2(o.m)}`}>
            {o.label}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="!px-2"
        aria-label="次月"
        onClick={() => go(next.y, next.m)}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  )
}
