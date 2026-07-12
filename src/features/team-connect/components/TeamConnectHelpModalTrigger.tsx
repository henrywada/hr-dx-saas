'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS, TEAM_CONNECT_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const TEAM_CONNECT_SR_DESCRIPTION =
  'チームコネクト画面（組織図・社内ディレクトリ）の使い方の説明です。'

/** チームコネクト画面：画面の説明モーダル（本文は src/content/help/markdown/organization/org-team-connect-guide.md） */
export function TeamConnectHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.ORG_TEAM_CONNECT), [])

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
        title={TEAM_CONNECT_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={TEAM_CONNECT_SR_DESCRIPTION}
      />
    </>
  )
}
