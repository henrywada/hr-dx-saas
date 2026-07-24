'use client'

import { useState } from 'react'
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import MyouBackLink from './MyouBackLink'
import DocPreviewModal, { type DocPreviewKind } from './DocPreviewModal'

const OVERVIEW_IMG = '/myou/manual/img/製品トレーサビリティ管理の全体像.png'
const QUICK_PDF = '/myou/manual/pdf/簡単操作マニュアル.pdf'

type PreviewState = {
  title: string
  src: string
  kind: DocPreviewKind
} | null

/** 資料一覧（本の目次風） */
export default function DocIndexClient() {
  const [preview, setPreview] = useState<PreviewState>(null)

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-blue-700">資料一覧</h1>
          <p className="mt-1 text-sm text-gray-500">目次</p>
        </div>
        <MyouBackLink className="shrink-0 self-start" />
      </div>

      <nav
        aria-label="資料目次"
        className="space-y-0 divide-y divide-gray-200 border-y border-gray-200"
      >
        <div className="flex items-center justify-between gap-4 py-4">
          <p className="text-sm text-gray-900 sm:text-base">
            <span className="mr-2 text-gray-400" aria-hidden>
              ◆
            </span>
            製品トレーサビリティ管理の全体像
          </p>
          <button
            type="button"
            onClick={() =>
              setPreview({
                title: '製品トレーサビリティ管理の全体像',
                src: OVERVIEW_IMG,
                kind: 'image',
              })
            }
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            開く
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 py-4">
          <p className="text-sm text-gray-900 sm:text-base">
            <span className="mr-2 text-gray-400" aria-hidden>
              ◆
            </span>
            簡単操作マニュアル
          </p>
          <button
            type="button"
            onClick={() =>
              setPreview({
                title: '簡単操作マニュアル',
                src: QUICK_PDF,
                kind: 'pdf',
              })
            }
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            開く
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 py-4">
          <p className="text-sm text-gray-900 sm:text-base">
            <span className="mr-2 text-gray-400" aria-hidden>
              ◆
            </span>
            システム仕様書
          </p>
          <Link
            href={APP_ROUTES.MYOU.MANUAL}
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            進む
          </Link>
        </div>
      </nav>

      <DocPreviewModal
        open={preview !== null}
        onOpenChange={open => {
          if (!open) setPreview(null)
        }}
        title={preview?.title ?? ''}
        src={preview?.src ?? ''}
        kind={preview?.kind ?? 'image'}
      />
    </div>
  )
}
