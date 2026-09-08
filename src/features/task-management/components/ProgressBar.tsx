interface ProgressBarProps {
  /** 進捗率（0-100）。範囲外の値は0-100にクランプして表示する */
  progress: number
}

/** 横長の進捗バー。マイルストーン一覧など、複数行を縦に並べる箇所で使う */
export function ProgressBar({ progress }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)))

  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 flex-1 rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-1.5 rounded-full bg-[#FD7601] transition-[width] duration-(--duration-normal) ease-(--ease-out-quart)"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[10px] text-slate-500">{clamped}%</span>
    </div>
  )
}
