/** ログイン履歴（全テナント） ローディングスケルトン */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1600px] animate-pulse space-y-4">
      <div className="h-8 w-72 rounded-lg bg-slate-200" />
      <div className="h-16 rounded-xl bg-slate-200" />
      <div className="h-96 rounded-xl bg-slate-200" />
    </div>
  )
}
