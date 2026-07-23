'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS, MYOU_INVENTORY_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const MYOU_INVENTORY_SR_DESCRIPTION = '在庫一覧画面の使い方の説明です。'

/** 在庫一覧画面：画面の説明モーダル（本文は src/content/help/markdown/myou/myou-inventory-guide.md） */
export function InventoryHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.MYOU_INVENTORY), [])

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
        title={MYOU_INVENTORY_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={MYOU_INVENTORY_SR_DESCRIPTION}
      />
    </>
  )
}
