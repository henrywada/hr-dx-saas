'use client';

import { useState, useTransition } from 'react';
import TraceabilitySearchForm from '../components/TraceabilitySearchForm';
import TraceabilityResults from '../components/TraceabilityResults';
import { getProductTrace } from '@/features/myou/actions';
import { PackageSearch, ArrowRight, History, ShieldCheck } from 'lucide-react';

export default function TraceabilityPage() {
  const [isPending, startTransition] = useTransition();
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = (serial: string) => {
    setSearched(true);
    startTransition(async () => {
      const data = await getProductTrace(serial);
      setSearchResult(data);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヒーローヘッダー */}
      <div className="bg-gradient-to-br from-indigo-900 via-blue-800 to-blue-700 text-white shadow-xl relative overflow-hidden mb-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
          <div className="flex flex-col items-center text-center space-y-6">
            <nav className="flex items-center space-x-2 text-blue-200 text-xs font-bold uppercase tracking-widest bg-white/10 px-4 py-1.5 rounded-full">
              <span>製品トレーサビリティ</span>
              <ArrowRight className="h-3 w-3" />
              <span className="text-white">トレース照会</span>
            </nav>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center">
              <PackageSearch className="h-10 w-10 md:h-12 md:w-12 mr-4 text-blue-300" />
              流通経路上での照会
            </h1>
            <p className="max-w-2xl text-lg text-blue-100/80 leading-relaxed font-medium">
              シリアル番号を入力またはQRコードをスキャンして、製品が「いつ」「どこで」「誰に」
              届いたのか、製造から現在地までの流通データを即座に照会。
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl pt-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col items-center">
                 <ShieldCheck className="h-6 w-6 text-green-400 mb-2" />
                 <span className="text-[10px] text-blue-200 font-bold uppercase">正規ルート</span>
                 <p className="text-sm font-bold mt-1">即時判定</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex flex-col items-center">
                 <History className="h-6 w-6 text-yellow-400 mb-2" />
                 <span className="text-[10px] text-blue-200 font-bold uppercase">全履歴</span>
                 <p className="text-sm font-bold mt-1">時系列表示</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 hidden md:flex flex-col items-center">
                 <PackageSearch className="h-6 w-6 text-blue-300 mb-2" />
                 <span className="text-[10px] text-blue-200 font-bold uppercase">スキャン</span>
                 <p className="text-sm font-bold mt-1">簡単入力</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 hidden md:flex flex-col items-center">
                 <ShieldCheck className="h-6 w-6 text-indigo-300 mb-2" />
                 <span className="text-[10px] text-blue-200 font-bold uppercase">データ保証</span>
                 <p className="text-sm font-bold mt-1">変更不可ログ</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 検索フォーム */}
        <TraceabilitySearchForm onSearch={handleSearch} isPending={isPending} />

        {/* 検索結果 */}
        <TraceabilityResults data={searchResult} searched={searched && !isPending} />

        {/* ガイド・補足 */}
        {!searched && (
          <div className="mt-16 bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-2/3 space-y-4 text-center md:text-left">
              <h3 className="text-xl font-black text-gray-900">どのように動作しますか？</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                各製品には固有のシリアル番号が割り振られています。施工管理者が現場で納入登録（QRスキャン）
                を行うと、その瞬間にGPS情報（オプション）とタイムスタンプがブロックチェーン（データベース）
                に記録され、後からいつでもこの画面で流通経路の透明性を確認できるようになります。
              </p>
              <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
                 <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">1. 製造</span>
                 <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">2. 在庫</span>
                 <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">3. 出荷</span>
                 <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">4. 納入</span>
                 <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">5. 施工完了</span>
              </div>
            </div>
            <div className="md:w-1/4 mt-8 md:mt-0 flex items-center justify-center">
               <div className="relative">
                 <div className="absolute inset-0 bg-blue-600 rounded-full blur-2xl opacity-20"></div>
                 <ShieldCheck className="h-24 w-24 text-blue-600 relative z-10" />
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
