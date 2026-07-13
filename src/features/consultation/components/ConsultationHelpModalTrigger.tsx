'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS, CONSULTATION_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const CONSULTATION_SR_DESCRIPTION = '悩み・相談窓口画面（相談の送信・匿名相談）の使い方の説明です。'

/** 悩み・相談窓口画面：画面の説明モーダル（本文は src/content/help/markdown/consultation/con-consultation-guide.md） */
export function ConsultationHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.CONSULTATION), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-[#e2e6ec] bg-white px-3 py-1.5 text-xs text-[#24292f] hover:bg-[#f6f8fa] shrink-0"
      >
        画面の説明
      </button>
      <HelpMarkdownModal
        open={open}
        onOpenChange={setOpen}
        title={CONSULTATION_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={CONSULTATION_SR_DESCRIPTION}
      />
    </>
  )
}
