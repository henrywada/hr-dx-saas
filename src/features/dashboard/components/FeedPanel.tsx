import { Bell } from 'lucide-react'
import { FeedItemRow } from './FeedItemRow'
import type { FeedItem } from '../feed/types'

type Props = {
  items: FeedItem[]
}

export function FeedPanel({ items }: Props) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-backwards">
      <div className="px-5 py-2 border-b border-[#ebebeb] flex items-center gap-3 bg-slate-50/50">
        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md shadow-inner">
          <Bell className="w-4 h-4" />
        </div>
        <h3 className="font-bold text-sm text-slate-800">お知らせ</h3>
      </div>
      <div className="p-0 flex-1">
        {items.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Bell className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-400">現在お知らせはありません</p>
          </div>
        ) : (
          <ul className="divide-y divide-[#ebebeb]">
            {items.map(item => (
              <FeedItemRow key={item.dedupeKey} item={item} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
