// 文書ホルダー一覧のローディング状態
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
      <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
      <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
      <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
    </div>
  )
}
