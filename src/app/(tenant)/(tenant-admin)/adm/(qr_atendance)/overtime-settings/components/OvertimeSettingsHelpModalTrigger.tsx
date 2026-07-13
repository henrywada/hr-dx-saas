'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS, ATT_OVERTIME_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const ATT_OVERTIME_SR_DESCRIPTION = '残業閾値設定画面の使い方の説明です。'

/** 残業閾値設定画面：画面の説明モーダル（本文は src/content/help/markdown/attendance/att-overtime.md） */
export function OvertimeSettingsHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.ATT_OVERTIME), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 shrink-0"
      >
        画面の説明
      </button>
      <HelpMarkdownModal
        open={open}
        onOpenChange={setOpen}
        title={ATT_OVERTIME_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={ATT_OVERTIME_SR_DESCRIPTION}
      />
    </>
  )
}
