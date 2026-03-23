import { Loader2 } from 'lucide-react'

/** ナビゲーション時のローディング（App Router） */
export default function OvertimeSettingsLoading() {
  return (
    <div className="p-6 flex justify-center items-center min-h-[40vh]">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="読み込み中" />
    </div>
  )
}
