'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useCallback, useEffect, useState } from 'react'
import type { GlobalJobRoleDetail } from '../types'
import { loadGlobalJobRoleDetailAction } from '../actions'
import { GlobalSkillItemManager } from './GlobalSkillItemManager'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleId: string | null
}

/** 職種のスキルレベル・スキル項目を一覧ページ上のモーダルで保守する */
export function GlobalJobRoleDetailModal({ open, onOpenChange, roleId }: Props) {
  const [detail, setDetail] = useState<GlobalJobRoleDetail | null>(null)
  const [loading, setLoading] = useState(false)

  const loadDetail = useCallback(async () => {
    if (!roleId) return
    setLoading(true)
    try {
      const d = await loadGlobalJobRoleDetailAction(roleId)
      setDetail(d)
    } finally {
      setLoading(false)
    }
  }, [roleId])

  useEffect(() => {
    if (!open) {
      setDetail(null)
      return
    }
    if (!roleId) return
    void loadDetail()
  }, [open, roleId, loadDetail])

  const handleMutationSuccess = useCallback(() => {
    void loadDetail()
  }, [loadDetail])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 shadow-lg [&>button]:text-white [&>button]:hover:bg-white/15 [&>button]:hover:text-white [&>button]:focus-visible:ring-white/40"
        closeButtonClassName="text-white hover:bg-white/15 hover:text-white focus-visible:ring-white/40"
      >
        <DialogHeader className="shrink-0 rounded-t-xl border-0 bg-primary px-6 pb-4 pt-5 pr-14 text-white sm:px-8 sm:pb-5 sm:pt-6 sm:pr-16">
          <DialogTitle className="text-lg font-semibold text-white sm:text-xl">
            職種テンプレート詳細
          </DialogTitle>
          <DialogPrimitive.Description className="mt-1 text-sm leading-snug text-white/90">
            この職種のスキル項目と、割り当てるスキルレベルセットを編集します。セット本体の追加・変更は一覧の「+スキルレベルセット登録」から行えます。
          </DialogPrimitive.Description>
          {detail && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold"
                style={{
                  backgroundColor: detail.color_hex + '33',
                  color: detail.color_hex,
                  border: `1px solid ${detail.color_hex}88`,
                }}
              >
                {detail.name}
              </span>
              <span className="text-sm text-white/85">{detail.category_name ?? '—'}</span>
            </div>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 [scrollbar-gutter:stable]">
          {loading && !detail ? (
            <p className="text-center text-sm text-gray-500">読み込み中…</p>
          ) : !detail ? (
            <p className="text-center text-sm text-red-600">
              職種を読み込めませんでした。閉じてから再度お試しください。
            </p>
          ) : (
            <div className="space-y-8">
              <GlobalSkillItemManager
                jobRoleId={detail.id}
                items={detail.skillItems}
                skillLevelSets={detail.skillLevelSets}
                onMutationSuccess={handleMutationSuccess}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
