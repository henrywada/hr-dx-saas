'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Fragment, useState, useTransition } from 'react'
import { Copy } from 'lucide-react'
import type { GlobalSkillLevelSetWithLevels } from '@/features/global-skill-templates/types'
import { importFromGlobalSkillLevelSet } from '../actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Props = {
  skillLevelSets: GlobalSkillLevelSetWithLevels[]
  onClose: () => void
}

function sortLevels<T extends { sort_order: number; created_at: string; name: string }>(
  levels: T[]
): T[] {
  return [...levels].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime() ||
      a.name.localeCompare(b.name, 'ja')
  )
}

/** テンプレート取り込み（SaaS「スキルの定義」と同型の Dialog + テーブル） */
export function TenantCopyFromTemplateModal({ skillLevelSets, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const sortedSets = [...skillLevelSets].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  function handleCopy(setId: string) {
    startTransition(async () => {
      const res = await importFromGlobalSkillLevelSet(setId)
      if ('error' in res) {
        setError(res.error)
        return
      }
      setCopiedIds(prev => new Set([...prev, setId]))
      setError(null)
    })
  }

  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className="flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-6xl flex-col gap-0 overflow-hidden rounded-xl border border-neutral-200 bg-white p-0 shadow-lg"
        closeButtonClassName="text-white hover:bg-white/15 hover:text-white focus-visible:ring-white/40"
      >
        <DialogHeader className="shrink-0 rounded-t-xl border-0 bg-primary px-6 pb-4 pt-5 pr-14 text-white sm:px-8 sm:pb-5 sm:pt-6 sm:pr-16">
          <DialogTitle className="text-lg font-semibold text-white sm:text-xl">
            スキルの定義
          </DialogTitle>
          <DialogPrimitive.Description className="mt-1 text-sm leading-snug text-white/90">
            SaaS テンプレートのスキル名・区分・レベル・詳細説明を、自テナントのスキル・レベルに取り込みます。
          </DialogPrimitive.Description>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 [scrollbar-gutter:stable]">
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {sortedSets.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">
              テンプレートがまだ登録されていません
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-800">
                        スキル名
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-800 whitespace-nowrap">
                        区分
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-800">
                        レベル
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold text-gray-800">
                        詳細説明
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 text-center font-semibold text-gray-800">
                        取り込み
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSets.map(set => {
                      const levels = sortLevels(set.levels)
                      return (
                        <Fragment key={set.id}>
                          <tr className="border-b border-gray-100 bg-gray-50/80">
                            <td className="px-3 py-2 align-top">
                              <span className="font-medium text-gray-900">{set.name}</span>
                            </td>
                            <td className="px-3 py-2 align-top text-gray-700">
                              {set.category ?? '—'}
                            </td>
                            <td className="px-3 py-2 align-top text-gray-400">—</td>
                            <td className="px-3 py-2 align-top text-gray-400">—</td>
                            <td className="px-3 py-2 text-center align-top">
                              {copiedIds.has(set.id) ? (
                                <span className="text-xs font-medium text-green-600">
                                  ✓ 取り込み済
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(set.id)}
                                  disabled={isPending}
                                  aria-label={`${set.name} をテナントに取り込む`}
                                  title="取り込み"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 text-primary shadow-sm transition hover:bg-primary hover:text-white hover:shadow-md disabled:opacity-50"
                                >
                                  <Copy className="h-4 w-4" strokeWidth={2} />
                                </button>
                              )}
                            </td>
                          </tr>
                          {levels.map(lv => (
                            <tr key={lv.id} className="border-b border-gray-100 bg-white">
                              <td className="px-3 py-2 align-top" />
                              <td className="px-3 py-2 align-top text-gray-400">—</td>
                              <td className="px-3 py-2 align-top">
                                <span
                                  className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
                                  style={{
                                    backgroundColor: `${lv.color_hex}33`,
                                    color: lv.color_hex,
                                    border: `1px solid ${lv.color_hex}88`,
                                  }}
                                >
                                  {lv.name}
                                </span>
                              </td>
                              <td className="min-w-[280px] max-w-2xl px-3 py-2 align-top text-xs leading-relaxed text-gray-600">
                                {lv.criteria?.trim() ? lv.criteria : '—'}
                              </td>
                              <td className="px-3 py-2 align-top" />
                            </tr>
                          ))}
                          {levels.length === 0 && (
                            <tr className="border-b border-gray-100 bg-white">
                              <td className="px-3 py-1.5 text-xs text-gray-400" colSpan={5}>
                                （レベル未定義）
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
