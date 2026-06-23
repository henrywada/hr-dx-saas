'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-slate-700 space-y-4">
      <div className="p-4 bg-red-50 rounded-full">
        <AlertTriangle className="w-10 h-10 text-red-500" />
      </div>
      <h2 className="text-lg font-bold">データの読み込みに失敗しました</h2>
      <p className="text-sm text-slate-500 max-w-sm text-center">
        サーバーとの通信中にエラーが発生しました。時間を置いて再度お試しください。
      </p>
      <button
        onClick={() => reset()}
        className="flex items-center gap-2 mt-4 px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        再試行
      </button>
    </div>
  );
}
