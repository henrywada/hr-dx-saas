import Link from 'next/link'
import { ClipboardList, ChevronRight } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import type { AssignedQuestionnaire } from '@/features/questionnaire/types'

function periodSubtitle(start: string | null, end: string | null): string | null {
  if (!start && !end) return null
  if (start && end) return `実施期間：${start} ～ ${end}`
  if (start) return `実施期間：${start} ～`
  return null
}

type Props = {
  pending: AssignedQuestionnaire[]
}

export function PendingQuestionnaireNoticeCards({ pending }: Props) {
  if (pending.length === 0) return null

  return (
    <ul className="divide-y divide-[#ebebeb]">
      {pending.map(q => (
        <li key={q.assignment_id} className="group hover:bg-slate-50/80 transition-colors">
          <Link
            href={`${APP_ROUTES.TENANT.SURVEY_ANSWERS}?id=${encodeURIComponent(q.assignment_id)}`}
            className="flex items-start gap-4 p-5 sm:px-6 outline-none focus:bg-slate-50"
          >
            <div className="p-2 bg-sky-100 text-sky-700 rounded-lg shrink-0 mt-0.5">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-semibold text-slate-800 group-hover:text-sky-700 transition-colors">
                {q.title}
              </p>
              {periodSubtitle(q.period_start_date, q.period_end_date) && (
                <p className="text-xs text-slate-500">
                  {periodSubtitle(q.period_start_date, q.period_end_date)}
                </p>
              )}
              {q.hr_message && (
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line line-clamp-3">
                  {q.hr_message}
                </p>
              )}
            </div>
            <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-slate-400 group-hover:text-sky-600 transition-colors mt-0.5">
              回答する
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
