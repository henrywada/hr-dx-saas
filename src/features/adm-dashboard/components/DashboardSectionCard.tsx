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

/** DashboardSectionGroupCard 内に並べる1項目分のリンク付きコンテンツ（自身は枠を持たない） */
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
      className="-m-2 flex items-start gap-2 rounded-md p-2 transition-colors hover:bg-[#f6f8fa]"
    >
      <div className={`shrink-0 rounded-md p-1.5 ${iconClassName}`}>{icon}</div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-[#161b22]">{title}</h3>
          <Badge variant="primary" className="ml-auto px-2 py-0.5 text-[10px]">
            NEW
          </Badge>
        </div>
        <p className="text-xs leading-relaxed text-[#57606a]">{description}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {stats.map(stat => (
            <span
              key={stat.label}
              className={`inline-flex items-center gap-1.5 rounded-md border border-white/60 px-2.5 py-1 text-xs font-medium shadow-sm ${iconClassName}`}
            >
              {stat.label}
              <span className="font-bold text-[#161b22]">{stat.value}</span>
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}
