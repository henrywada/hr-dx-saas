'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

export default function StressCheckError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto py-16 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="bg-red-100 p-6 rounded-full text-red-600">
        <AlertCircle size={80} strokeWidth={1.5} />
      </div>
      <h1 className="text-3xl font-extrabold text-gray-900">エラーが発生しました</h1>
      <p className="text-gray-600 max-w-lg text-lg">
        ストレスチェックの読み込み中にエラーが発生しました。もう一度お試しください。
      </p>
      <button
        onClick={reset}
        className="mt-4 inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-md"
      >
        <RefreshCw className="h-5 w-5" />
        再読み込み
      </button>
    </div>
  );
}
