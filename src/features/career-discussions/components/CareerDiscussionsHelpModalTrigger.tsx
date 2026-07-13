'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS, CAREER_DISCUSSIONS_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const CAREER_DISCUSSIONS_SR_DESCRIPTION =
  'キャリア面談画面（本人向け履歴・上長向け予約・記録）の使い方の説明です。'

/** キャリア面談画面：画面の説明モーダル（本文は src/content/help/markdown/career/car-career-discussions-guide.md） */
export function CareerDiscussionsHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.CAREER_DISCUSSIONS), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 shrink-0"
      >
        画面の説明
      </button>
      <HelpMarkdownModal
        open={open}
        onOpenChange={setOpen}
        title={CAREER_DISCUSSIONS_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={CAREER_DISCUSSIONS_SR_DESCRIPTION}
      />
    </>
  )
}
