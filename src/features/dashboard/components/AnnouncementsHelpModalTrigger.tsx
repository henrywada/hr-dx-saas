'use client'

import { useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { getHelpMarkdown, HELP_CONTENT_IDS, ANNOUNCEMENTS_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const ANNOUNCEMENTS_SR_DESCRIPTION =
  'お知らせ管理での登録の仕組みと、従業員トップ画面の「お知らせ」フィードにどの機能からどのように通知されるかの説明です。'

/** お知らせ管理：登録の仕組み・TOP画面フィードの仕組みの説明モーダル（本文は src/content/help/markdown/settings/set-announce.md） */
export function AnnouncementsHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.ANNOUNCEMENTS), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#57606a] bg-white border border-[#e2e6ec] rounded-lg hover:bg-[#f6f8fa] transition-colors"
      >
        <Info className="w-4 h-4" />
        詳細説明
      </button>
      <HelpMarkdownModal
        open={open}
        onOpenChange={setOpen}
        title={ANNOUNCEMENTS_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={ANNOUNCEMENTS_SR_DESCRIPTION}
      />
    </>
  )
}
