'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS, ADMIN_ONE_ON_ONE_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const ADMIN_ONE_ON_ONE_SR_DESCRIPTION = '1on1支援ダッシュボード（管理職向け）の使い方の説明です。'

/** 1on1支援ダッシュボード：画面の説明モーダル（本文は src/content/help/markdown/one-on-one/oo-admin-dashboard-guide.md） */
export function AdminOneOnOneHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.ADMIN_ONE_ON_ONE), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        画面の説明
      </button>
      <HelpMarkdownModal
        open={open}
        onOpenChange={setOpen}
        title={ADMIN_ONE_ON_ONE_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={ADMIN_ONE_ON_ONE_SR_DESCRIPTION}
      />
    </>
  )
}
