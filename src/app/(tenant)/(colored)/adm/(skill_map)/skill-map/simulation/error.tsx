'use client'
export default function Error({ error }: { error: Error }) {
  return <div className="p-6"><p className="text-red-600">エラー: {error.message}</p></div>
}
