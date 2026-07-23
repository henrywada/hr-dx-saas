'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS, MYOU_COMPANIES_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const MYOU_COMPANIES_SR_DESCRIPTION = '施工会社（納入先）管理画面の使い方の説明です。'

/** 施工会社管理画面：画面の説明モーダル（本文は src/content/help/markdown/myou/myou-companies-guide.md） */
export function CompaniesHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.MYOU_COMPANIES), [])

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
        title={MYOU_COMPANIES_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={MYOU_COMPANIES_SR_DESCRIPTION}
      />
    </>
  )
}
