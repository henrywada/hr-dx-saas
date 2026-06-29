import { KudosReactionButton } from './KudosReactionButton'
import type { KudosFeedItem } from '../types'

interface Props {
  items: KudosFeedItem[]
}

function formatCreatedAt(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function KudosFeed({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 text-sm text-slate-500">
        まだ感謝・称賛の投稿はありません。最初の一言を送ってみましょう。
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div
          key={item.id}
          className={`bg-white rounded-lg border shadow-xs p-5 ${
            item.isRelatedToMe ? 'border-amber-300' : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span className="font-semibold text-slate-900">{item.sender_name}</span>
                <span>→</span>
                <span className="font-semibold text-slate-900">
                  {item.recipients.map(r => r.employee_name).join('、')}
                </span>
                {item.value_tag && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                    {item.value_tag}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {item.message}
              </p>
              <p className="text-[11px] text-slate-400">{formatCreatedAt(item.created_at)}</p>
            </div>
            <KudosReactionButton
              kudosId={item.id}
              initialCount={item.reactionCount}
              initialHasReacted={item.hasReactedByMe}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
