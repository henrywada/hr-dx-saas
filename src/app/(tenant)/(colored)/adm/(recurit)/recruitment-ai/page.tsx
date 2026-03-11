import { getServerUser } from '@/lib/auth/server-user';
import { redirect } from 'next/navigation';
import { APP_ROUTES } from '@/config/routes';
import { AiJobForm } from '@/features/recruitment-ai/components/AiJobForm';
import { TipsModal } from '@/features/recruitment-ai/components/TipsModal';

export default async function RecruitmentAiPage() {
  const user = await getServerUser();
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            スカウト採用の募集文メーカー
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
            3つの質問に答えるだけ。あなたの会社の「リアルな魅力」が伝わる求人原稿・スカウト文・面接ガイドをAIが瞬時に作成します。
          </p>
        </div>
        <div className="shrink-0">
          <TipsModal />
        </div>
      </div>

      <AiJobForm planType={user.planType} />
    </div>
  );
}
