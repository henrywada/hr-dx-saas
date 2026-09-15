// アルバム画面のローディング状態（サムネイルグリッドのスケルトン）
export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-md bg-gray-100" />
        ))}
      </div>
    </div>
  )
}
