'use client'

import { useMemo, useState } from 'react'
import {
  getHelpMarkdown,
  HELP_CONTENT_IDS,
  SKILL_JOURNEY_CONSULT_DISPLAY_TITLE,
} from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const SKILL_JOURNEY_CONSULT_SR_DESCRIPTION =
  '上司への相談画面（育成ジャーニー）の使い方の説明です。'

/** 上司への相談画面：画面の説明モーダル（本文は src/content/help/markdown/career/car-journey-consult-guide.md） */
export function SkillJourneyConsultHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.SKILL_JOURNEY_CONSULT), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 shrink-0"
      >
        画面の説明
      </button>
      <HelpMarkdownModal
        open={open}
        onOpenChange={setOpen}
        title={SKILL_JOURNEY_CONSULT_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={SKILL_JOURNEY_CONSULT_SR_DESCRIPTION}
      />
    </>
  )
}
