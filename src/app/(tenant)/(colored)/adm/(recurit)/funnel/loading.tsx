export default function RecruitFunnelLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* パスバー */}
      <div className="-mx-6 -mt-6 border-b border-gray-200 bg-gray-100 px-6 py-2.5 h-9" />

      {/* ヘッダー */}
      <div className="pt-2 space-y-2">
        <div className="h-7 w-64 rounded bg-gray-200" />
        <div className="h-4 w-80 rounded bg-gray-100" />
      </div>

      {/* ファネルカード */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <div className="h-5 w-32 rounded bg-gray-200 mb-4" />
        <div className="flex gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-6 rounded bg-gray-100" />}
              <div className="w-20 h-20 rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      </div>

      {/* 中段 2カラム */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm h-52" />
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm h-52" />
      </div>

      {/* グラフ */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm h-64" />
    </div>
  )
}
