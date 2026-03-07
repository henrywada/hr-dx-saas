'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function TenantsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Tenants page error:', error);
  }, [error]);

  return (
    <main className="flex-1 w-full min-h-screen bg-white flex items-center justify-center">
      <div className="text-center px-6 max-w-md">
        <div className="mx-auto flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          テナント管理ページの読み込みに失敗しました
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {error.message || '予期せぬエラーが発生しました。しばらく経ってから再度お試しください。'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          再試行
        </button>
      </div>
    </main>
  );
}
