'use client'

interface DifferentiationPanelProps {
  points: string[]
  summary: string
}

export function DifferentiationPanel({ points, summary }: DifferentiationPanelProps) {
  return (
    <div className="rounded-lg border border-accent-teal/30 bg-accent-teal/5 p-5">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">差別化ポイント</h3>
      <p className="mb-4 text-xs text-gray-500 italic">{summary}</p>
      <ul className="space-y-2">
        {points.map((point, idx) => (
          <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-teal text-white text-[10px] font-bold">
              {idx + 1}
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
