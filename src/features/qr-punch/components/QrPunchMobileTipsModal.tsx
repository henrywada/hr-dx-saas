'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS, ATT_QR_DISPLAY_TITLE } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'
import { cn } from '@/lib/utils'

const ATT_QR_SR_DESCRIPTION = 'QR 打刻時のカメラ・端末設定に関する注意事項です。'

/** QR 打刻画面：スマホ設定の説明（本文は src/content/help/markdown/attendance/att-qr.md） */
export function QrPunchMobileTipsModalTrigger({
  className,
  label = 'スマホの注意点',
}: {
  className?: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.ATT_QR), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'min-h-10 max-w-[88px] shrink-0 rounded-xl border border-white/40 bg-white/10 px-2 text-center text-[11px] font-bold leading-tight text-white sm:max-w-none sm:px-3 sm:text-xs',
          className,
        )}
      >
        {label}
      </button>
      <HelpMarkdownModal
        open={open}
        onOpenChange={setOpen}
        title={ATT_QR_DISPLAY_TITLE}
        markdown={markdown}
        srDescription={ATT_QR_SR_DESCRIPTION}
      />
    </>
  )
}
