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
  /** 指定時はタイトル横に赤い吹き出し風バッジ（承認待ちの注意喚起など） */
  badgeLabel?: string | null
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
  badgeLabel,
}: Props) {
  return (
    <Link
      href={href}
      className="w-full bg-white border border-slate-200 hover:border-indigo-300 text-left p-5 rounded-xl shadow-sm hover:shadow-md hover:bg-indigo-50/30 transition-all group flex items-center justify-between outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div
          className={`p-2.5 rounded-lg shrink-0 ${iconBoxClass} group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h3
              className={`text-slate-800 font-bold transition-colors ${titleHoverClass}`}
            >
              {title}
            </h3>
            {badgeLabel ? (
              <span
                className="relative ml-1 inline-flex shrink-0 items-center rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm ring-1 ring-red-800/20 before:pointer-events-none before:absolute before:left-[-6px] before:top-1/2 before:-translate-y-1/2 before:border-y-[5px] before:border-r-[6px] before:border-l-0 before:border-solid before:border-y-transparent before:border-r-red-600 before:content-['']"
                aria-label={`承認待ち: ${badgeLabel}`}
              >
                {badgeLabel}
              </span>
            ) : null}
          </div>
          <p className="text-slate-500 text-xs">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
    </Link>
  )
}
