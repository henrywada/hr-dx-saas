import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type Props = {
  href: string
  title: string
  subtitle: string
  icon: LucideIcon
  /** 例: bg-sky-100 text-sky-700 */
  iconBoxClass: string
  /** 例: group-hover:text-sky-600 */
  titleHoverClass: string
}

/**
 * トップ「クイックアクセス」と同じタイル見た目（Link 版）
 */
export function QuickAccessCard({
  href,
  title,
  subtitle,
  icon: Icon,
  iconBoxClass,
  titleHoverClass,
}: Props) {
  return (
    <Link
      href={href}
      className="flex flex-col items-start p-5 bg-slate-50/50 hover:bg-white hover:shadow-md border shadow-sm border-slate-100 hover:border-indigo-100 rounded-xl transition-all duration-200 text-left group w-full outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
    >
      <div
        className={`p-2.5 rounded-lg mb-4 ${iconBoxClass} group-hover:scale-110 transition-transform duration-300 shadow-sm`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <span
        className={`font-bold text-sm text-slate-800 mb-1.5 transition-colors ${titleHoverClass}`}
      >
        {title}
      </span>
      <span className="text-xs font-medium text-slate-500 leading-relaxed">{subtitle}</span>
    </Link>
  )
}
