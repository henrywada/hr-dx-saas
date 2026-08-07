/** 配信アーカイブ一覧 ローディングスケルトン */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1920px] animate-pulse space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <div className="h-8 w-56 rounded-lg bg-slate-200" />
      <div className="h-96 rounded-lg bg-slate-200" />
    </div>
  )
}
