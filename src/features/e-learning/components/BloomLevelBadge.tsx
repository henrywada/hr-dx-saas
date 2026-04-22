import type { BloomLevel } from '../types'
import { BLOOM_LEVEL_LABELS, BLOOM_LEVEL_COLORS } from '../constants'

interface Props {
  level: BloomLevel
  size?: 'sm' | 'md'
}

export function BloomLevelBadge({ level, size = 'md' }: Props) {
  const colors = BLOOM_LEVEL_COLORS[level]
  const label = BLOOM_LEVEL_LABELS[level]
  const textSize = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${textSize} ${colors.bg} ${colors.text} ${colors.border}`}
    >
      <span className="text-xs">🎯</span>
      {label}
    </span>
  )
}
