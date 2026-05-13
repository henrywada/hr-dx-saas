type Props = {
  coverage: number
  label?: string
  showPercentage?: boolean
}

export function SkillCoverageBar({ coverage, label, showPercentage = true }: Props) {
  const color = coverage >= 80 ? '#16a34a' : coverage >= 50 ? '#ca8a04' : '#dc2626'
  return (
    <div className="flex items-center gap-2 min-w-24">
      {label && <span className="text-xs text-gray-500 shrink-0">{label}</span>}
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          role="progressbar"
          aria-valuenow={coverage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label ?? 'スキル充足率'}
          className="h-2 rounded-full transition-all"
          style={{ width: `${coverage}%`, backgroundColor: color }}
        />
      </div>
      {showPercentage && (
        <span className="text-xs font-medium w-8 text-right" style={{ color }}>
          {coverage}%
        </span>
      )}
    </div>
  )
}
