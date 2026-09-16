// 文書撮影画面のローディング状態
export default function Loading() {
  return (
    <div className="capture-form-shell -mx-[24px] flex w-[calc(100%+48px)] min-w-0 flex-col gap-4 px-3 py-6 md:mx-auto md:w-full md:max-w-md md:px-6">
      <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
      <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
      <div className="h-10 animate-pulse rounded-md bg-gray-100" />
    </div>
  )
}
