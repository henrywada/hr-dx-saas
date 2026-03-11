'use client';

export default function TenantsLoading() {
  return (
    <main className="flex-1 w-full min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8 space-y-6 animate-pulse">
        {/* ヘッダースケルトン */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gray-200 rounded-xl" />
            <div>
              <div className="h-6 w-48 bg-gray-200 rounded" />
              <div className="h-4 w-64 bg-gray-100 rounded mt-1.5" />
            </div>
          </div>
          <div className="h-10 w-40 bg-gray-200 rounded-lg" />
        </div>

        {/* 検索バースケルトン */}
        <div className="h-10 w-80 bg-gray-100 rounded-lg" />

        {/* テーブルスケルトン */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4">
            <div className="flex gap-8">
              {[120, 80, 100, 100, 160, 80, 80].map((w, i) => (
                <div key={i} className="h-3 bg-gray-200 rounded" style={{ width: w }} />
              ))}
            </div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-6 py-4 border-t border-gray-100">
              <div className="flex gap-8 items-center">
                {[140, 80, 60, 100, 180, 80, 60].map((w, j) => (
                  <div key={j} className="h-4 bg-gray-100 rounded" style={{ width: w }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
