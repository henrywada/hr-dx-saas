'use client'

interface Props {
  total: number
  current: number
  completedIds: Set<string>
  slideIds: string[]
}

export function SlideProgressBar({ total, current, completedIds, slideIds }: Props) {
  const pct = total === 0 ? 0 : Math.round((completedIds.size / total) * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {current + 1} / {total}
        </span>
        <span>{pct}% 完了</span>
      </div>

      <div className="flex gap-1">
        {slideIds.map((id, idx) => {
          const isCompleted = completedIds.has(id)
          const isCurrent = idx === current
          return (
            <div
              key={id}
              className={`h-2 flex-1 rounded-full transition-colors ${
                isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}
