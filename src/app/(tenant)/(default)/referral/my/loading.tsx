/** マイ推薦一覧ページ ローディングスケルトン */
export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded w-32" />
        <div className="h-8 bg-slate-200 rounded-lg w-48" />
      </div>
      <div className="h-48 bg-slate-200 rounded-xl" />
      <div className="h-32 bg-slate-200 rounded-xl" />
    </div>
  )
}
