/** 推薦詳細ページ ローディングスケルトン */
export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* 戻るリンク + タイトルスケルトン */}
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded w-32" />
        <div className="h-8 bg-slate-200 rounded-lg w-64" />
      </div>

      {/* 2カラム情報スケルトン */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-48 bg-slate-200 rounded-xl" />
        <div className="space-y-4">
          <div className="h-28 bg-slate-200 rounded-xl" />
          <div className="h-16 bg-slate-200 rounded-xl" />
        </div>
      </div>

      {/* ステータス更新フォームスケルトン */}
      <div className="h-48 bg-slate-200 rounded-xl" />
    </div>
  )
}
