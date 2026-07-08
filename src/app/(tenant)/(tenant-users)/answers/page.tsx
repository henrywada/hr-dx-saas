import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import {
  getAssignedQuestionnaires,
  getQuestionnaireForAnswer,
} from '@/features/questionnaire/queries'
import AnswersListClient from './AnswersListClient'
import AnswerFormClient from './AnswerFormClient'
import TenantBackLink from '@/components/common/TenantBackLink'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ id?: string }>
}

export default async function AnswersPage({ searchParams }: Props) {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const { id: assignmentId } = await searchParams

  // 回答フォームモード
  if (assignmentId) {
    const data = await getQuestionnaireForAnswer(assignmentId, user.employee_id)
    if (!data) redirect(APP_ROUTES.TENANT.SURVEY_ANSWERS)

    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-lg mx-auto">
          <AnswerFormClient
            assignmentId={assignmentId}
            detail={data.detail}
            existingAnswers={data.existingAnswers}
          />
        </div>
      </div>
    )
  }

  // 一覧モード
  const questionnaires = await getAssignedQuestionnaires(user.employee_id)

  return (
    <div className="min-h-screen bg-neutral-50 px-4 sm:px-6 py-5">
      <div className="max-w-lg mx-auto">
        {/* ページヘッダー */}
        <header className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-neutral-800 tracking-tight">
                アンケートに回答する
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                人事担当者から依頼されたアンケートを確認し、期限内に回答できます。
              </p>
            </div>
            <TenantBackLink />
          </div>
        </header>

        <AnswersListClient questionnaires={questionnaires} />
      </div>
    </div>
  )
}
