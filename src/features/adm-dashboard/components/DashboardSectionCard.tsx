import Link from 'next/link'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { AdmHrKpiLink } from './AdmHrKpiLink'

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
  /** 横断KPIページの該当セクションへ（重複KPIの詳細分析導線） */
  kpiSection?: 'recruit' | 'retention' | 'productivity' | 'engagement' | 'development'
}

/** DashboardSectionGroupCard 内に並べる1項目分のリンク付きコンテンツ（自身は枠を持たない） */
export function DashboardSectionCard({
  icon,
  iconClassName = 'bg-[#fff3e6] text-[#FD7601]',
  title,
  description,
  stats,
  href,
  kpiSection,
}: DashboardSectionCardProps) {
  return (
    <div className="-m-2 flex items-start gap-2 rounded-md p-2 transition-colors hover:bg-[#f6f8fa]">
      <Link href={href} className={`shrink-0 rounded-md p-1.5 ${iconClassName}`}>
        {icon}
      </Link>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <Link href={href} className="text-sm font-bold text-[#161b22] hover:underline">
            {title}
          </Link>
          <Badge variant="primary" className="ml-auto px-2 py-0.5 text-[10px]">
            NEW
          </Badge>
        </div>
        <Link href={href} className="text-xs leading-relaxed text-[#57606a] hover:underline">
          {description}
        </Link>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {stats.map(stat => (
            <Link
              key={stat.label}
              href={href}
              className={`inline-flex items-center gap-1.5 rounded-md border border-white/60 px-2.5 py-1 text-xs font-medium shadow-sm transition-opacity hover:opacity-90 ${iconClassName}`}
            >
              {stat.label}
              <span className="font-bold text-[#161b22]">{stat.value}</span>
            </Link>
          ))}
          {kpiSection ? (
            <span className="inline-flex items-center rounded-md border border-[#e2e6ec] bg-white px-2 py-1">
              <AdmHrKpiLink section={kpiSection} />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
