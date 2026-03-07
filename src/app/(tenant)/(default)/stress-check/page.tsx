import { getActivePeriod, getQuestions, checkExistingResponse } from '@/features/stress-check/queries';
import QuestionnaireForm from '@/features/stress-check/components/QuestionnaireForm';
import { getServerUser } from '@/lib/auth/server-user';
import { redirect } from 'next/navigation';
import { AlertCircle, CalendarOff } from 'lucide-react';

// Next.js 15+ 必須の型定義
type Props = {
  params: Promise<{ [key: string]: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function StressCheckPage({ params, searchParams }: Props) {
  // 1. Props の解決（Next.js 15+ の仕様）
  await params;
  const sParams = await searchParams;

  // 2. 認証チェック
  const user = await getServerUser();
  if (!user) {
    redirect('/login');
  }

  // 3. 実施期間の取得
  const period = await getActivePeriod();
  if (!period) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center space-y-6">
        <div className="bg-gray-100 p-6 rounded-full inline-block text-gray-500">
          <CalendarOff size={60} />
        </div>
        <h1 className="text-2xl font-bold">現在実施中のストレスチェックはありません</h1>
        <a href="/top" className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg inline-block">トップへ戻る</a>
      </div>
    );
  }

  // 4. 【ここが最重要：回答済みチェック】
  // CompletedMessage を表示するロジックを完全に排除しました。
  // 回答がある場合は、一切の画面を描画せず即座にリダイレクトさせます。
  const hasAnswered = await checkExistingResponse(period.id, user.id);
  if (hasAnswered) {
    redirect(`/stress-check/result?period_id=${period.id}`);
  }

  // 5. 質問データの取得（未回答の場合のみ到達）
  const domainGroups = await getQuestions(period.questionnaire_type);
  if (!domainGroups || domainGroups.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="text-xl font-bold mt-4">質問データが見つかりません</h1>
      </div>
    );
  }

  // 6. 正常な回答フォームを表示
  return <QuestionnaireForm period={period} domainGroups={domainGroups} />;
}
