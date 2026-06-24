import Link from 'next/link'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'

interface DashboardSectionCardStat {
  label: string
  value: string
}

interface DashboardSectionCardProps {
  icon: ReactNode
  iconClassName?: string
  title: string
  description: string
  stats: DashboardSectionCardStat[]
  href: string
}

/** サーベイ・ウェルビーイング / 学習・成長セクションで使うリンク付きカード */
export function DashboardSectionCard({
  icon,
  iconClassName = 'bg-[#fff3e6] text-[#FD7601]',
  title,
  description,
  stats,
  href,
}: DashboardSectionCardProps) {
  return (
    <Link
      href={href}
      className="flex h-full flex-col gap-2 rounded-lg border border-[#e2e6ec] bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-2">
        <div className={`shrink-0 rounded-md p-1.5 ${iconClassName}`}>{icon}</div>
        <h3 className="text-sm font-bold text-[#161b22]">{title}</h3>
        <Badge variant="primary" className="ml-auto px-2 py-0.5 text-[10px]">
          NEW
        </Badge>
      </div>
      <p className="text-xs leading-relaxed text-[#57606a]">{description}</p>
      <div className="mt-auto flex items-center gap-4 pt-2 text-xs text-[#57606a]">
        {stats.map(stat => (
          <span key={stat.label}>
            {stat.label} <span className="font-bold text-[#161b22]">{stat.value}</span>
          </span>
        ))}
      </div>
    </Link>
  )
}
