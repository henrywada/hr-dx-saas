import Link from 'next/link'
import { ChevronRight, type LucideIcon } from 'lucide-react'

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
      className="w-full bg-white border border-slate-200 hover:border-indigo-300 text-left p-5 rounded-xl shadow-sm hover:shadow-md hover:bg-indigo-50/30 transition-all group flex items-center justify-between outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-2.5 rounded-lg ${iconBoxClass} group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3
            className={`text-slate-800 font-bold mb-0.5 transition-colors ${titleHoverClass}`}
          >
            {title}
          </h3>
          <p className="text-slate-500 text-xs">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
    </Link>
  )
}
