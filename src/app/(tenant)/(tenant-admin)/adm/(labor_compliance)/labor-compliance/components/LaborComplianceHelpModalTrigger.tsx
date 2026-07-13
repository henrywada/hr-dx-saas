'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS, LABOR_COMPLIANCE_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const LABOR_COMPLIANCE_SR_DESCRIPTION = '労務コンプライアンスダッシュボードの見方の説明です。'

/** 労務コンプライアンスダッシュボード：画面の説明モーダル（本文は src/content/help/markdown/labor-compliance/lc-dashboard-guide.md） */
export function LaborComplianceHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.LABOR_COMPLIANCE), [])

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
        title={LABOR_COMPLIANCE_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={LABOR_COMPLIANCE_SR_DESCRIPTION}
      />
    </>
  )
}
