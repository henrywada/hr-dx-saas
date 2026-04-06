export default function Loading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-pulse">
      {/* ヘッダー */}
      <div>
        <div className="h-8 bg-slate-200 rounded-lg w-72" />
        <div className="h-4 bg-slate-100 rounded w-96 mt-2" />
      </div>

      {/* セレクター */}
      <div className="h-10 bg-slate-200 rounded-lg w-48" />

      {/* KPI カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 h-32" />
        ))}
      </div>

      {/* グラフ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 h-80" />

      {/* テーブル */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 h-64" />
    </div>
  )
}
