export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* ヘッダースケルトン */}
      <div className="pl-5">
        <div className="h-8 w-72 bg-gray-200 rounded-lg" />
        <div className="h-4 w-48 bg-gray-100 rounded mt-2" />
      </div>

      {/* 期間バー スケルトン */}
      <div className="h-14 bg-gray-100 rounded-2xl" />

      {/* サマリーカード スケルトン */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 pt-6 h-32">
            <div className="flex justify-between mb-4">
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-10 w-10 bg-gray-100 rounded-xl" />
            </div>
            <div className="h-8 w-24 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      {/* グラフ スケルトン */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 h-80">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        <div className="h-64 bg-gray-50 rounded-xl" />
      </div>
    </div>
  );
}
