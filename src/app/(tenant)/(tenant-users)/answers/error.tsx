'use client';

export default function AnswersError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white rounded-xl border border-red-200 p-6 text-center space-y-3 shadow-sm">
        <p className="text-3xl">⚠️</p>
        <p className="text-sm font-medium text-red-700">読み込みに失敗しました</p>
        <p className="text-xs text-red-400">{error.message}</p>
        <button
          onClick={reset}
          className="text-sm text-primary hover:underline"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
