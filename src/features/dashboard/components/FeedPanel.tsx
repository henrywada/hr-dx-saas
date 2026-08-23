import Link from 'next/link'
import { Bell } from 'lucide-react'
import { FeedItemRow } from './FeedItemRow'
import { MarkAllReadButton } from './MarkAllReadButton'
import { APP_ROUTES } from '@/config/routes'
import type { FeedItem } from '../feed/types'

type Props = {
  items: FeedItem[]
  /** 「すべて見る」リンクを出すか（/notifications 自体では自己参照になるため false にする） */
  showViewAllLink?: boolean
  title?: string
  icon?: typeof Bell
  iconClassName?: string
  emptyMessage?: string
}

export function FeedPanel({
  items,
  showViewAllLink = true,
  title = 'お知らせ',
  icon: Icon = Bell,
  iconClassName = 'bg-blue-100 text-blue-600',
  emptyMessage = '現在お知らせはありません',
}: Props) {
  const unreadDismissibleKeys = items
    .filter(item => item.kind === 'system_notice' && item.dismissible && !item.isRead)
    .map(item => item.dedupeKey)

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-backwards">
      <div className="px-5 py-2 border-b border-[#ebebeb] flex items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-1.5 rounded-md shadow-inner shrink-0 ${iconClassName}`}>
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-slate-800">{title}</h3>
        </div>
        <MarkAllReadButton dedupeKeys={unreadDismissibleKeys} />
      </div>
      <div className="p-0 flex-1">
        {items.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Icon className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-400">{emptyMessage}</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#ebebeb]">
            {items.map(item => (
              <FeedItemRow key={item.dedupeKey} item={item} />
            ))}
          </ul>
        )}
      </div>
      {showViewAllLink && items.length > 0 && (
        <div className="px-5 py-2 border-t border-[#ebebeb] text-center bg-slate-50/50">
          <Link
            href={APP_ROUTES.TENANT.NOTIFICATIONS}
            className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            すべて見る
          </Link>
        </div>
      )}
    </div>
  )
}
