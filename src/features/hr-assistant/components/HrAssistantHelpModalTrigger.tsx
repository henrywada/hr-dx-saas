'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS, HR_ASSISTANT_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const HR_ASSISTANT_SR_DESCRIPTION =
  'AI人事アシスタント画面（人事情報集・AI相談）の使い方の説明です。'

/** AI人事アシスタント画面：画面の説明モーダル（本文は src/content/help/markdown/ai-agent/ai-hr-assistant-guide.md） */
export function HrAssistantHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.HR_ASSISTANT), [])

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
        title={HR_ASSISTANT_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={HR_ASSISTANT_SR_DESCRIPTION}
      />
    </>
  )
}
