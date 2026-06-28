import Link from 'next/link'
import { ExternalLink, MessageCircleWarning } from 'lucide-react'

type Props = {
  count: number
  href: string
}

/** トップ「お知らせ」内、未対応の相談がある対応者（上司・人事・産業医等）向けの新着通知 */
export function ConsultationPendingNotice({ count, href }: Props) {
  if (count <= 0) return null

  return (
    <Link
      href={href}
      className="w-full text-left px-4 sm:px-5 py-1.5 flex items-center justify-between gap-3 group hover:bg-slate-50/80 transition-colors outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 border-b border-slate-200"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="p-1.5 rounded-md shrink-0 bg-rose-100 text-rose-700">
          <MessageCircleWarning className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="text-xs font-semibold text-blue-600! group-hover:text-blue-700! transition-colors m-0">
              対応が必要な相談があります
            </h4>
            <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span
              className="relative inline-flex shrink-0 items-center rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm ring-1 ring-red-800/20"
              aria-label={`未対応の相談: ${count}件`}
            >
              {count > 99 ? '99+件' : `${count}件`}
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5 leading-tight">
            悩み・相談窓口に新着の相談が届いています
          </p>
        </div>
      </div>
    </Link>
  )
}
