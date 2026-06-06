/** リファラル採用管理ページ ローディングスケルトン */
export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* ヘッダースケルトン */}
      <div className="h-8 bg-slate-200 rounded-lg w-48" />

      {/* サマリーカードスケルトン */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-xl" />
        ))}
      </div>

      {/* テーブルスケルトン */}
      <div className="h-64 bg-slate-200 rounded-xl" />
    </div>
  )
}
