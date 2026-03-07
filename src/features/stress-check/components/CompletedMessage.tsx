'use client';

import { CheckCircle2 } from 'lucide-react';

interface CompletedMessageProps {
  periodTitle: string;
}

export default function CompletedMessage({ periodTitle }: CompletedMessageProps) {
  return (
    <div className="max-w-3xl mx-auto py-16 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="bg-green-100 p-6 rounded-full text-green-600">
        <CheckCircle2 size={80} strokeWidth={1.5} />
      </div>
      <h1 className="text-3xl font-extrabold text-gray-900">回答済みです</h1>
      <p className="text-gray-600 max-w-lg text-lg leading-relaxed">
        「{periodTitle}」のストレスチェックはすでに回答済みです。
        結果は後日ご連絡いたします。
      </p>
      <button
        className="mt-8 px-8 py-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-base font-medium shadow-sm"
        onClick={() => window.location.href = '/top'}
      >
        ダッシュボードへ戻る
      </button>
    </div>
  );
}
