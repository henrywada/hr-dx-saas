import Link from 'next/link'
import { ChevronRight, ExternalLink, type LucideIcon } from 'lucide-react'

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
  /** 指定時は右端を矢印のみではなく「{trailingLabel}」＋矢印にする */
  trailingLabel?: string | null
  /** 指定時はタイトル後に ExternalLink アイコンを表示（外部リンク表示） */
  showExternalLinkIcon?: boolean
  /** 指定時は右側の ChevronRight を非表示 */
  hideChevron?: boolean
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
  trailingLabel,
  showExternalLinkIcon = false,
  hideChevron = false,
}: Props) {
  return (
    <Link
      href={href}
      className="w-full text-left px-5 py-1.5 flex items-center justify-between gap-3 group hover:bg-slate-50/80 transition-colors outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 -mx-5 border-b border-slate-200 last:border-b-0"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className={`p-1.5 rounded-md shrink-0 ${iconBoxClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4
              className={`text-xs font-semibold transition-colors m-0 ${
                showExternalLinkIcon
                  ? 'text-blue-600! group-hover:text-blue-700!'
                  : `text-slate-800 ${titleHoverClass}`
              }`}
            >
              {title}
            </h4>
            {showExternalLinkIcon && (
              <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            )}
            {badgeLabel ? (
              <span
                className="relative inline-flex shrink-0 items-center rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm ring-1 ring-red-800/20 before:pointer-events-none before:absolute before:-left-1 before:top-1/2 before:-translate-y-1/2 before:border-y-4 before:border-r-[5px] before:border-l-0 before:border-solid before:border-y-transparent before:border-r-red-600 before:content-['']"
                aria-label={`承認待ち: ${badgeLabel}`}
              >
                {badgeLabel}
              </span>
            ) : null}
          </div>
          <p className="text-slate-500 text-xs mt-0.5 leading-tight">{subtitle}</p>
        </div>
      </div>
      {!hideChevron && (
        <>
          {trailingLabel ? (
            <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-slate-500 group-hover:text-indigo-500 transition-colors whitespace-nowrap">
              {trailingLabel}
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
          )}
        </>
      )}
    </Link>
  )
}
