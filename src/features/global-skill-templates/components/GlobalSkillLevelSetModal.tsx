'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useCallback, useEffect, useState } from 'react'
import type { GlobalSkillLevelSetWithLevels } from '../types'
import { loadGlobalSkillLevelSetsAction } from '../actions'
import { GlobalSkillLevelSetWorkspace } from './GlobalSkillLevelSetWorkspace'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** スキルレベルセット登録モーダル（職種・業種と非連動の共通マスタ） */
export function GlobalSkillLevelSetModal({ open, onOpenChange }: Props) {
  const [sets, setSets] = useState<GlobalSkillLevelSetWithLevels[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await loadGlobalSkillLevelSetsAction()
      setSets(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setSets([])
      return
    }
    void reload()
  }, [open, reload])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 shadow-lg [&>button]:text-white [&>button]:hover:bg-white/15 [&>button]:hover:text-white [&>button]:focus-visible:ring-white/40"
        closeButtonClassName="text-white hover:bg-white/15 hover:text-white focus-visible:ring-white/40"
      >
        <DialogHeader className="shrink-0 rounded-t-xl border-0 bg-primary px-6 pb-4 pt-5 pr-14 text-white sm:px-8 sm:pb-5 sm:pt-6 sm:pr-16">
          <DialogTitle className="text-lg font-semibold text-white sm:text-xl">
            スキルレベルセット登録
          </DialogTitle>
          <DialogPrimitive.Description className="mt-1 text-sm leading-snug text-white/90">
            スキルレベルセット名をキーに、セット内のレベルとコメントを登録・編集します。変更は保存後すぐにテナント側の取り込みに反映されます。職種との紐付けは行いません。
          </DialogPrimitive.Description>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 [scrollbar-gutter:stable]">
          {loading && sets.length === 0 ? (
            <p className="text-center text-sm text-gray-500">読み込み中…</p>
          ) : (
            <GlobalSkillLevelSetWorkspace skillLevelSets={sets} onMutationSuccess={reload} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
