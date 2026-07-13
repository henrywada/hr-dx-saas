'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS, REFERRAL_MY_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const REFERRAL_MY_SR_DESCRIPTION = 'マイ推薦一覧画面（推薦履歴・報奨金情報）の見方の説明です。'

/** マイ推薦一覧画面：画面の説明モーダル（本文は src/content/help/markdown/recruitment/rec-referral-my-guide.md） */
export function ReferralMyHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.REFERRAL_MY), [])

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
        title={REFERRAL_MY_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={REFERRAL_MY_SR_DESCRIPTION}
      />
    </>
  )
}
