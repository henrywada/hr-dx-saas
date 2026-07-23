'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS, MYOU_TRACEABILITY_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const MYOU_TRACEABILITY_SR_DESCRIPTION =
  'トレーサビリティ検索（流通経路上での照会）画面の使い方の説明です。'

/** トレーサビリティ検索画面：画面の説明モーダル（本文は src/content/help/markdown/myou/myou-traceability-guide.md） */
export function TraceabilityHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.MYOU_TRACEABILITY), [])

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
        title={MYOU_TRACEABILITY_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={MYOU_TRACEABILITY_SR_DESCRIPTION}
      />
    </>
  )
}
