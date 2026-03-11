'use client';

import React, { useEffect } from 'react';
import { Card, Button } from '@/components/ui';

export default function MarketAnalysisError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // コンソールへのエラー出力など（必要に応じて）
    console.error('Market Analysis Page Error:', error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center p-6">
      <Card variant="accent-orange" className="w-full max-w-lg">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-accent-orange bg-red-50 rounded-full p-2 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900 mb-2">エラーが発生しました</h2>
          <p className="text-sm text-gray-600 mb-6">
            ダッシュボードの読み込み中に予期せぬエラーが発生しました。<br />
            {error.message || 'しばらくしてからもう一度お試しください。'}
          </p>
          <div className="flex justify-center flex-col sm:flex-row gap-3">
            <Button variant="primary" onClick={() => reset()}>
              再試行する
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/adm'}>
              ダッシュボードに戻る
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
