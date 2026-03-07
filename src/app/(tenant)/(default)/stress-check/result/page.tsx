import { getStressCheckResult, getActivePeriod } from '@/features/stress-check/queries';
import ProfileSummary from '@/features/stress-check/components/ProfileSummary';
import ResultChart from '@/features/stress-check/components/ResultChart';
import ConsentSwitch from '@/features/stress-check/components/ConsentSwitch';
import { getServerUser } from '@/lib/auth/server-user';
import { redirect } from 'next/navigation';
import { AlertCircle, Home } from 'lucide-react';

// Next.js 15+ 準拠の型定義
type Props = {
  params: Promise<{ [key: string]: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function StressCheckResultPage({ params, searchParams }: Props) {
  // 1. Props の解決
  await params;
  const sParams = await searchParams;

  // 2. 認証チェック
  const user = await getServerUser();
  if (!user) {
    redirect('/login');
  }

  // 3. period_id の決定（クエリパラメータ or アクティブ期間）
  let periodId = sParams.period_id as string | undefined;
  if (!periodId) {
    const activePeriod = await getActivePeriod();
    if (!activePeriod) {
      redirect('/top');
    }
    periodId = activePeriod.id;
  }

  // 4. 結果データの取得
  const result = await getStressCheckResult(periodId, user.id);

  if (!result) {
    return (
      <div className="max-w-3xl mx-auto py-16 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="bg-amber-100 p-6 rounded-full text-amber-600">
          <AlertCircle size={80} strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">結果データが見つかりません</h1>
        <p className="text-gray-600 text-lg">回答データの取得に失敗しました。管理者にお問い合わせください。</p>
        <a href="/top" className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg inline-block hover:bg-indigo-700 transition-colors">
          トップへ戻る
        </a>
      </div>
    );
  }

  // 5. 結果ページレイアウト（上から順に表示）
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* ① プロフィール要約（テキスト） */}
      <ProfileSummary result={result} />

      {/* ② 3分割レーダーチャート（厚労省準拠） */}
      <ResultChart result={result} />

      {/* ③ 同意トグル */}
      <ConsentSwitch
        periodId={periodId}
        initialConsent={result.consentToEmployer}
      />

      {/* フッター */}
      <div className="text-center space-y-3 pt-4 pb-8">
        <p className="text-xs text-gray-500 max-w-2xl mx-auto">
          ※ 本結果は法令に基づき厳重に管理されます。事業者への結果提供を希望しない場合は、上のスイッチをOFF（同意しない）に変更してからダッシュボードへお戻りください。
        </p>
        <a
          href="/top"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
        >
          <Home className="h-4 w-4" />
          ダッシュボードへ戻る
        </a>
      </div>
    </div>
  );
}
