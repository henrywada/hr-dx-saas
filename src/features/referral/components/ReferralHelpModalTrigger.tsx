'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS, REFERRAL_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const REFERRAL_SR_DESCRIPTION = '社員紹介採用画面（求人一覧・推薦フォーム）の使い方の説明です。'

/** 社員紹介採用画面：画面の説明モーダル（本文は src/content/help/markdown/recruitment/rec-referral-guide.md） */
export function ReferralHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.REFERRAL), [])

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
        title={REFERRAL_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={REFERRAL_SR_DESCRIPTION}
      />
    </>
  )
}
