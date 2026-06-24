import type { ReactNode } from 'react'

interface DashboardSectionGroupCardProps {
  icon: ReactNode
  title: string
  children: ReactNode
}

/** サーベイ・ウェルビーイング / 学習・成長セクションの外枠カード。内部に DashboardSectionCard を2列グリッドで並べる。 */
export function DashboardSectionGroupCard({
  icon,
  title,
  children,
}: DashboardSectionGroupCardProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#e2e6ec] bg-white shadow-xs">
      <h2 className="flex items-center gap-2 border-b border-[#e2e6ec] bg-[#f6f8fa] px-5 py-3 text-base font-bold text-[#161b22]">
        {icon}
        {title}
      </h2>
      <div className="relative p-5">
        <div
          aria-hidden
          className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-[#e2e6ec] sm:block"
        />
        <div className="grid grid-cols-1 gap-x-12 gap-y-5 sm:grid-cols-2 [&>*:nth-child(n+3)]:border-t [&>*:nth-child(n+3)]:border-[#e2e6ec] [&>*:nth-child(n+3)]:pt-4">
          {children}
        </div>
      </div>
    </div>
  )
}
