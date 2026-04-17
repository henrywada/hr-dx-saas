import { ClipboardList } from 'lucide-react'
import { QuickAccessCard } from '@/app/(tenant)/(colored)/components/QuickAccess/QuickAccessCard'
import { APP_ROUTES } from '@/config/routes'
import type { AssignedQuestionnaire } from '@/features/questionnaire/types'

function deadlineSubtitle(deadlineDate: string | null): string {
  if (!deadlineDate) return '未回答'
  const d = new Date(deadlineDate)
  if (Number.isNaN(d.getTime())) return `期限: ${deadlineDate}`
  return `回答期限: ${d.toLocaleDateString('ja-JP')}`
}

type Props = {
  pending: AssignedQuestionnaire[]
}

/** 人事お知らせカード内: アサイン済み・未提出のアンケートへのカード型リンク */
export function PendingQuestionnaireNoticeCards({ pending }: Props) {
  if (pending.length === 0) return null

  return (
    <div className="px-6 pt-5 pb-0 space-y-3">
      {pending.map(q => (
        <QuickAccessCard
          key={q.assignment_id}
          href={`${APP_ROUTES.TENANT.SURVEY_ANSWERS}?id=${encodeURIComponent(q.assignment_id)}`}
          title={q.title}
          subtitle={deadlineSubtitle(q.deadline_date)}
          icon={ClipboardList}
          iconBoxClass="bg-sky-100 text-sky-700"
          titleHoverClass="group-hover:text-sky-700"
          trailingLabel="回答する"
        />
      ))}
    </div>
  )
}
