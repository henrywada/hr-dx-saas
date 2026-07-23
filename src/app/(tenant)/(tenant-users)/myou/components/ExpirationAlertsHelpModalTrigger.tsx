'use client'

import { useMemo, useState } from 'react'
import {
  getHelpMarkdown,
  HELP_CONTENT_IDS,
  MYOU_EXPIRATION_ALERTS_DISPLAY_TITLE,
} from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const MYOU_EXPIRATION_ALERTS_SR_DESCRIPTION = '有効期限監視・アラート管理画面の使い方の説明です。'

/** 有効期限監視画面：画面の説明モーダル（本文は src/content/help/markdown/myou/myou-expiration-alerts-guide.md） */
export function ExpirationAlertsHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.MYOU_EXPIRATION_ALERTS), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-white/40 bg-white/95 px-3 py-1.5 text-xs text-[#24292f] hover:bg-white shrink-0"
      >
        画面の説明
      </button>
      <HelpMarkdownModal
        open={open}
        onOpenChange={setOpen}
        title={MYOU_EXPIRATION_ALERTS_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={MYOU_EXPIRATION_ALERTS_SR_DESCRIPTION}
      />
    </>
  )
}
