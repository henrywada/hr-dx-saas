'use client'

import { useState } from 'react'
import type { GlobalSkillLevelSetWithLevels } from '@/features/global-skill-templates/types'
import { TenantCopyFromTemplateModal } from '@/features/skill-map/components/TenantCopyFromTemplateModal'

type Props = {
  skillLevelSets: GlobalSkillLevelSetWithLevels[]
}

/** スキル・レベル管理タブ: 個別レベルマスタ見出し右 — テンプレートよりコピー + モーダル */
export function SkillTempCopyTemplateButton({ skillLevelSets }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-linear-to-br from-primary to-[#0040cc] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_-4px_rgba(0,85,255,0.55)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:shadow-[0_8px_22px_-6px_rgba(0,85,255,0.6)] active:translate-y-0"
      >
        <span className="text-base leading-none" aria-hidden>
          ＋
        </span>
        <span>テンプレートよりコピー</span>
      </button>

      {open && (
        <TenantCopyFromTemplateModal
          skillLevelSets={skillLevelSets}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
