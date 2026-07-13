'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS, STRESS_MY_RESULT_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

const STRESS_MY_RESULT_SR_DESCRIPTION = 'ストレスチェック結果画面（本人向け）の見方の説明です。'

/** ストレスチェック結果画面（本人向け）：画面の説明モーダル（本文は src/content/help/markdown/stress/stress-my-result.md） */
export function StressResultHelpModalTrigger() {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.STRESS_MY_RESULT), [])

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
        title={STRESS_MY_RESULT_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={STRESS_MY_RESULT_SR_DESCRIPTION}
      />
    </>
  )
}
