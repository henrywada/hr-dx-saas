export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* ヘッダー */}
      <div className="pl-5">
        <div className="h-8 w-80 bg-gray-200 rounded-lg" />
        <div className="h-4 w-56 bg-gray-100 rounded mt-2" />
      </div>

      {/* 期間バー */}
      <div className="h-14 bg-gray-100 rounded-2xl" />

      {/* プライバシーアラート */}
      <div className="h-16 bg-amber-50/50 rounded-2xl" />

      {/* サマリーカード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 pt-6 h-32">
            <div className="flex justify-between mb-4">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-10 w-10 bg-gray-100 rounded-xl" />
            </div>
            <div className="h-8 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* レーダーチャート */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="h-5 w-56 bg-gray-200 rounded mb-4" />
        <div className="h-96 bg-gray-50 rounded-xl" />
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="h-5 w-48 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-50 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
