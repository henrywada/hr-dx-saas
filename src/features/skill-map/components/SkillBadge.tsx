'use client'

import type { TenantSkill } from '../types'

type Props = {
  skill: TenantSkill
  size?: 'sm' | 'md'
}

export function SkillBadge({ skill, size = 'md' }: Props) {
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${padding}`}
      style={{
        backgroundColor: skill.color_hex + '33',
        border: `1px solid ${skill.color_hex}88`,
        color: skill.color_hex,
      }}
    >
      {skill.name}
    </span>
  )
}
