import React from 'react';
import { getServerUser } from '@/lib/auth/server-user';
import { redirect } from 'next/navigation';
import { APP_ROUTES } from '@/config/routes';
import { getRecruitmentAiLogs } from '@/features/recruitment-ai/actions';
import { Card, Button } from '@/components/ui';
import { Lock, History, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { AiHistoryList } from '@/features/recruitment-ai/components/AiHistoryList';

export default async function RecruitmentAiLogPage() {
  const user = await getServerUser();
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN);
  }

  // 権限チェック
  const isPro = user.planType === 'pro' || user.planType === 'enterprise';

  // Proプランの場合のみログデータを取得
  let logs = [];
  if (isPro) {
    const res = await getRecruitmentAiLogs();
    if (res.success && res.data) {
      logs = res.data;
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-[calc(100vh-100px)]">
      
      {/* ── Header ── */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-purple-500" />
            スカウト採用の募集アーカイブ
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            過去にAIで生成した魅力的なキャッチコピーや求人原稿データを一覧で確認・再利用できます。
          </p>
        </div>
        <div className="shrink-0 pb-1">
          <Link href="/adm/recruitment-ai">
            <Button variant="outline" className="text-sm border-slate-300 hover:bg-slate-50 w-full md:w-auto">
              募集文メーカー <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Content ── */}
      {isPro ? (
        // パターンA: Pro以上 (履歴一覧)
        <AiHistoryList logs={logs} />
      ) : (
        // パターンB: Pro未満 (Paywall)
        <div className="pt-8">
          <Card className="p-10 md:p-14 text-center flex flex-col items-center justify-center border-dashed border-2 bg-gradient-to-br from-slate-50 to-white relative overflow-hidden shadow-sm">
            
            {/* 背景の装飾 */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-purple-100 rounded-full blur-[80px] opacity-60 -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-100 rounded-full blur-[80px] opacity-60 -ml-20 -mb-20 pointer-events-none"></div>

            <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center shadow-inner mb-8 relative border border-white">
              <Lock className="w-10 h-10 text-slate-400" />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4 relative">
              過去の生成データをフル活用しませんか？
            </h2>
            <p className="text-slate-600 max-w-xl mb-10 leading-relaxed relative">
              履歴管理（アーカイブ機能）のご利用は、<strong className="text-purple-600 font-bold border-b-2 border-purple-200">Proプラン以上</strong> の限定機能です。<br />
              <span className="mt-2 block text-sm">
                プランをアップグレードすると、過去にAIが生成した最高のキャッチコピーやスカウト文をいつでも引き出してコピー＆ペーストで再利用できるようになります。
              </span>
            </p>
            
            <Button className="!bg-gradient-to-r !from-purple-600 !to-indigo-600 hover:!from-purple-700 hover:!to-indigo-700 shadow-xl shadow-purple-200/50 px-8 py-6 text-lg rounded-xl flex items-center justify-center gap-2 relative transition-transform hover:-translate-y-1">
              <Sparkles className="w-5 h-5 text-purple-200" />
              Proプランへアップグレード
            </Button>

            <p className="text-xs text-slate-400 mt-6 relative tracking-wide">
              ※ 現在の無料プランでは、データ自体はセキュアに保護されており外部からはアクセスできません。
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
