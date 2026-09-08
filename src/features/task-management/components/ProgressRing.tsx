interface ProgressRingProps {
  /** 進捗率（0-100）。範囲外の値は0-100にクランプして表示する */
  progress: number
  /** リングの直径（px）。デフォルトは目標カード・目標詳細ヘッダーで使う想定の56px */
  size?: number
}

/** 円形の進捗リング。SVGの二重円で表現し、中央に進捗率(%)を表示する */
export function ProgressRing({ progress, size = 56 }: ProgressRingProps) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, Math.round(progress)))
  const offset = circumference * (1 - clamped / 100)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e2e6ec"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#FD7601"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-slate-900 text-[11px] font-semibold"
      >
        {clamped}%
      </text>
    </svg>
  )
}
