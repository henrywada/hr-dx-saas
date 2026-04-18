'use client';

export default function SurveyManagementError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="p-6 max-w-[92rem] mx-auto w-full">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-3">
        <p className="text-sm font-medium text-red-700">データの読み込みに失敗しました</p>
        <p className="text-xs text-red-500">{error.message}</p>
        <button
          onClick={reset}
          className="mt-2 text-sm text-primary hover:underline"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
