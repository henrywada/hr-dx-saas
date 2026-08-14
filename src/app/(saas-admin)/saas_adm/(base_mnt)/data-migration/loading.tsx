/** データ移行ウィザードのローディングスケルトン */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1200px] animate-pulse space-y-4 px-4 py-6 sm:px-6">
      <div className="h-8 w-64 rounded-lg bg-slate-200" />
      <div className="h-28 rounded-lg bg-slate-200" />
      <div className="h-48 rounded-lg bg-slate-200" />
      <div className="h-40 rounded-lg bg-slate-200" />
    </div>
  )
}
