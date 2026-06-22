'use client'

interface KpiSummaryCardProps {
  label: string
  value: string
  sub?: string
  status?: 'normal' | 'warning' | 'danger' | 'info'
  icon?: React.ReactNode
}

const STATUS_COLORS: Record<string, string> = {
  normal: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
  info: 'text-[#FD7601]',
}

export function KpiSummaryCard({
  label,
  value,
  sub,
  status = 'normal',
  icon,
}: KpiSummaryCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-gray-500">{icon}</span>}
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${STATUS_COLORS[status] ?? STATUS_COLORS.info}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
