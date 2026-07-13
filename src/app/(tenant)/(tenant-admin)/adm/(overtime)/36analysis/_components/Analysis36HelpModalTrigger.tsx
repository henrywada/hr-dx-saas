'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS, ANALYSIS_36_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const ANALYSIS_36_SR_DESCRIPTION = '36協定 遵守状況ダッシュボードの見方の説明です。'

/** 36協定 遵守状況ダッシュボード：画面の説明モーダル（本文は src/content/help/markdown/attendance/att-36analysis-guide.md） */
export function Analysis36HelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.ANALYSIS_36), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-400 transition-colors"
      >
        画面の説明
      </button>
      <HelpMarkdownModal
        open={open}
        onOpenChange={setOpen}
        title={ANALYSIS_36_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={ANALYSIS_36_SR_DESCRIPTION}
      />
    </>
  )
}
