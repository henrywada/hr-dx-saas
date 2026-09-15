// 文書撮影画面のローディング状態
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
      <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
      <div className="h-10 animate-pulse rounded-md bg-gray-100" />
    </div>
  )
}
