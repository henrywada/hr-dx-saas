import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth/server-user';
import { APP_ROUTES } from '@/config/routes';
import {
  getAssignedQuestionnaires,
  getQuestionnaireForAnswer,
} from '@/features/questionnaire/queries';
import AnswersListClient from './AnswersListClient';
import AnswerFormClient from './AnswerFormClient';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function AnswersPage({ searchParams }: Props) {
  const user = await getServerUser();
  if (!user?.tenant_id || !user.employee_id) redirect(APP_ROUTES.AUTH.LOGIN);

  const { id: assignmentId } = await searchParams;

  // 回答フォームモード
  if (assignmentId) {
    const data = await getQuestionnaireForAnswer(assignmentId, user.employee_id);
    if (!data) redirect(APP_ROUTES.TENANT.SURVEY_ANSWERS);

    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-lg mx-auto px-4 py-6">
          <AnswerFormClient
            assignmentId={assignmentId}
            detail={data.detail}
            existingAnswers={data.existingAnswers}
          />
        </div>
      </div>
    );
  }

  // 一覧モード
  const questionnaires = await getAssignedQuestionnaires(user.employee_id);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* ページヘッダー */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-neutral-800">アンケートに回答する</h1>
          <p className="text-sm text-neutral-500 mt-1">
            担当者から依頼されたアンケートを確認・回答できます。
          </p>
        </div>

        <AnswersListClient questionnaires={questionnaires} />
      </div>
    </div>
  );
}
