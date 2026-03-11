'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('GroupAnalysis Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="bg-red-50 p-4 rounded-full mb-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <h2 className="text-lg font-bold text-gray-700 mb-2">
        集団分析データの取得に失敗しました
      </h2>
      <p className="text-sm text-gray-500 mb-6 max-w-md text-center">
        分析データの読み込み中にエラーが発生しました。
        しばらくたってからもう一度お試しください。
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all shadow-sm"
      >
        再読み込み
      </button>
    </div>
  );
}
