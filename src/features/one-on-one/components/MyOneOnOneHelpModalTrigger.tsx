'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS, MY_ONE_ON_ONE_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const MY_ONE_ON_ONE_SR_DESCRIPTION =
  '私の1on1画面（受けた1on1の履歴・予定確認）の使い方の説明です。'

/** 私の1on1画面：画面の説明モーダル（本文は src/content/help/markdown/one-on-one/oo-my-history.md） */
export function MyOneOnOneHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.MY_ONE_ON_ONE), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 shrink-0"
      >
        画面の説明
      </button>
      <HelpMarkdownModal
        open={open}
        onOpenChange={setOpen}
        title={MY_ONE_ON_ONE_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={MY_ONE_ON_ONE_SR_DESCRIPTION}
      />
    </>
  )
}
