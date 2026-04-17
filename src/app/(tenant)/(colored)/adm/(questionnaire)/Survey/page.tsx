import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/auth/server-user';
import { APP_ROUTES } from '@/config/routes';
import { getQuestionnaires } from '@/features/questionnaire/queries';
import QuestionnaireListClient from '@/features/questionnaire/components/QuestionnaireListClient';

export const dynamic = 'force-dynamic';

export default async function SurveyManagementPage() {
  const user = await getServerUser();
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN);

  const data = await getQuestionnaires(user.tenant_id);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <QuestionnaireListClient
        tenantId={user.tenant_id}
        appRole={user.appRole ?? ''}
        initialData={data}
      />
    </div>
  );
}
