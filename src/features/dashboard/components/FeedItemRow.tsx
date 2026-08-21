'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import {
  ChevronRight,
  Check,
  Bell,
  MessageCircleWarning,
  Heart,
  ClipboardList,
  ClipboardCheck,
} from 'lucide-react'
import { markFeedItemRead } from '../feed/actions'
import type { FeedItem, FeedItemCategory } from '../feed/types'

const CATEGORY_ICON: Record<FeedItemCategory, typeof Bell> = {
  hr_announcement: Bell,
  consultation: MessageCircleWarning,
  kudos: Heart,
  questionnaire: ClipboardList,
  lifecycle: ClipboardCheck,
  health_check: Bell,
  e_learning: ClipboardList,
  one_on_one: Bell,
  career_discussion: Bell,
  overtime_compliance: MessageCircleWarning,
}

const CATEGORY_COLOR: Record<FeedItemCategory, string> = {
  hr_announcement: 'bg-blue-100 text-blue-600',
  consultation: 'bg-rose-100 text-rose-700',
  kudos: 'bg-amber-100 text-amber-700',
  questionnaire: 'bg-sky-100 text-sky-700',
  lifecycle: 'bg-amber-100 text-amber-700',
  health_check: 'bg-teal-100 text-teal-700',
  e_learning: 'bg-indigo-100 text-indigo-700',
  one_on_one: 'bg-purple-100 text-purple-700',
  career_discussion: 'bg-purple-100 text-purple-700',
  overtime_compliance: 'bg-red-100 text-red-700',
}

type Props = {
  item: FeedItem
}

export function FeedItemRow({ item }: Props) {
  const [isPending, startTransition] = useTransition()
  const Icon = CATEGORY_ICON[item.category]
  const canDismiss = item.kind === 'system_notice' && item.dismissible && !item.isRead

  const handleDismiss = () => {
    startTransition(async () => {
      await markFeedItemRead(item.dedupeKey)
    })
  }

  const body = (
    <div
      className={`flex items-start gap-3 p-4 sm:px-5 outline-none focus:bg-slate-50 ${
        item.isRead ? 'opacity-60' : ''
      } ${canDismiss ? 'pr-9 sm:pr-10' : ''}`}
    >
      <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${CATEGORY_COLOR[item.category]}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-xs font-semibold text-slate-800">{item.title}</p>
          {item.severity === 'critical' && (
            <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 leading-none">
              重要
            </span>
          )}
          {item.severity === 'warning' && (
            <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 leading-none">
              要対応
            </span>
          )}
        </div>
        {item.body && (
          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line">
            {item.body}
          </p>
        )}
        {item.dueDate && (
          <p className="text-[11px] text-slate-400 font-mono">期限: {item.dueDate}</p>
        )}
      </div>
      {item.href && (
        <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-slate-500 group-hover:text-blue-600 transition-colors mt-0.5">
          {item.actionLabel}
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </span>
      )}
    </div>
  )

  return (
    <li className="group relative hover:bg-slate-50/80 transition-colors">
      {item.href ? (
        <Link href={item.href} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
      {canDismiss && (
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isPending}
          className="absolute top-2.5 right-2.5 sm:right-3.5 p-1 rounded text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
          aria-label="既読にする"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      )}
    </li>
  )
}
