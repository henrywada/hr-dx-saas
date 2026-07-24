# mYou 資料一覧（doc-index） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/myou/doc-index` に本の目次風「資料一覧」ページを追加し、全体像画像・簡単操作マニュアル PDF をモーダルプレビュー、システム仕様書は `/myou/manual` へ遷移できるようにする。

**Architecture:** 静的ページ（Server）＋ `DocIndexClient`（Client）で目次と開閉状態を管理し、共通の `DocPreviewModal` で画像／PDF をプレビューする。DB・features queries/actions は使わない。既存アセットは `public/myou/manual/` をそのまま参照する。

**Tech Stack:** Next.js App Router, React Client Components, Radix Dialog（`@/components/ui/dialog`）, Tailwind CSS, `APP_ROUTES`

**Spec:** `docs/superpowers/specs/2026-07-24-myou-doc-index-design.md`

## Global Constraints

- URL は `/myou/doc-index`（`APP_ROUTES.MYOU.DOC_INDEX`）。ハードコードしたパス文字列で遷移しない
- サービスメニュー登録・他画面からのリンク追加はしない
- DB / migration / `createAdminClient` は使わない
- コメントは日本語
- 自動テストは追加しない（仕様どおり）。検証は `npm run type-check` と手動確認
- モーダル枠は `HelpMarkdownModal` と同系統（`bg-sky-600` ヘッダー、白閉じるボタン）
- 戻るリンクは `MyouBackLink`（`← 戻る`、右寄せ）

## File Structure

| ファイル                                  | 責任                              |
| ----------------------------------------- | --------------------------------- |
| `src/config/routes.ts`                    | `MYOU.DOC_INDEX` 定数追加         |
| `.../myou/components/DocPreviewModal.tsx` | 画像／PDF プレビュー Dialog       |
| `.../myou/components/DocIndexClient.tsx`  | 目次 UI・モーダル状態・仕様書遷移 |
| `.../myou/doc-index/page.tsx`             | Server page + metadata            |

---

### Task 1: ルート定数 `DOC_INDEX` 追加

**Files:**

- Modify: `src/config/routes.ts`（`APP_ROUTES.MYOU` ブロック、`MANUAL` の直後）

**Interfaces:**

- Produces: `APP_ROUTES.MYOU.DOC_INDEX`（型推論上 `'/myou/doc-index'`）

- [ ] **Step 1: `MANUAL` の直後に定数を追加する**

```typescript
    /** ユーザマニュアル（操作手順書） */
    MANUAL: '/myou/manual',
    /** 資料一覧（目次：全体像・簡単操作マニュアル・システム仕様書） */
    DOC_INDEX: '/myou/doc-index',
```

- [ ] **Step 2: 型チェックで定数が解決できることを確認する**

Run: `npm run type-check`
Expected: エラーなし（この変更単体で新規エラーを出さない）

- [ ] **Step 3: コミットする（ユーザーがコミットを依頼した場合のみ）**

```bash
git add src/config/routes.ts
git commit -m "$(cat <<'EOF'
feat(myou): add DOC_INDEX route for document index page

EOF
)"
```

---

### Task 2: `DocPreviewModal`（画像／PDF プレビュー）

**Files:**

- Create: `src/app/(tenant)/(tenant-users)/myou/components/DocPreviewModal.tsx`

**Interfaces:**

- Consumes: `@/components/ui/dialog` の `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`；`@radix-ui/react-dialog` の `Description`（sr-only）
- Produces:

```typescript
export type DocPreviewKind = 'image' | 'pdf'

export type DocPreviewModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  src: string
  kind: DocPreviewKind
}
```

- [ ] **Step 1: コンポーネントファイルを作成する**

```tsx
'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export type DocPreviewKind = 'image' | 'pdf'

export type DocPreviewModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  src: string
  kind: DocPreviewKind
}

/** 資料一覧用：画像または PDF をモーダルでプレビューする */
export default function DocPreviewModal({
  open,
  onOpenChange,
  title,
  src,
  kind,
}: DocPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col gap-0 overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-lg [&>button]:text-white [&>button]:hover:bg-white/15 [&>button]:hover:text-white [&>button]:focus-visible:ring-white/40">
        <DialogHeader className="rounded-t-lg border-0 bg-sky-600 px-6 pb-4 pt-5 pr-14 text-white sm:px-8 sm:pb-5 sm:pt-6 sm:pr-16">
          <DialogTitle className="text-lg font-semibold text-white sm:text-xl">{title}</DialogTitle>
          <DialogPrimitive.Description className="sr-only">
            {kind === 'pdf' ? `${title}のPDFプレビュー` : `${title}の画像プレビュー`}
          </DialogPrimitive.Description>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gray-50 px-4 py-4 sm:px-6 sm:py-5">
          {kind === 'image' ? (
            <img src={src} alt={title} className="mx-auto max-h-[70vh] w-full object-contain" />
          ) : (
            <iframe
              title={title}
              src={src}
              className="h-[70vh] w-full rounded-md border border-gray-200 bg-white"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: 型チェックする**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 3: コミットする（ユーザー依頼時のみ）**

```bash
git add src/app/\(tenant\)/\(tenant-users\)/myou/components/DocPreviewModal.tsx
git commit -m "$(cat <<'EOF'
feat(myou): add DocPreviewModal for image and PDF preview

EOF
)"
```

---

### Task 3: `DocIndexClient` ＋ `/myou/doc-index` ページ

**Files:**

- Create: `src/app/(tenant)/(tenant-users)/myou/components/DocIndexClient.tsx`
- Create: `src/app/(tenant)/(tenant-users)/myou/doc-index/page.tsx`

**Interfaces:**

- Consumes: `DocPreviewModal`（Task 2）、`MyouBackLink`、`APP_ROUTES.MYOU.MANUAL`、`next/link`
- Produces: 目次3項目の表示と操作（モーダル2種＋ページ遷移1種）

アセット URL（固定）:

- 画像: `/myou/manual/img/製品トレーサビリティ管理の全体像.png`
- PDF: `/myou/manual/pdf/簡単操作マニュアル.pdf`

- [ ] **Step 1: `DocIndexClient.tsx` を作成する**

```tsx
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
```

- [ ] **Step 2: `doc-index/page.tsx` を作成する**

```tsx
import type { Metadata } from 'next'
import DocIndexClient from '../components/DocIndexClient'

export const metadata: Metadata = {
  title: '資料一覧',
  description: '製品トレーサビリティ関連のマニュアル・資料の目次です。',
}

/** mYou 資料一覧（本の目次風） */
export default function MyouDocIndexPage() {
  return <DocIndexClient />
}
```

- [ ] **Step 3: 型チェックする**

Run: `npm run type-check`
Expected: エラーなし

- [ ] **Step 4: 手動確認する**

開発サーバー起動済みなら `http://localhost:3000/myou/doc-index` を開く（未起動なら `npm run dev`）。

確認項目:

1. 見出し「資料一覧」＋「目次」、◆付き3行が表示される
2. 「製品トレーサビリティ管理の全体像」→「開く」→ 画像モーダル
3. 「簡単操作マニュアル」→「開く」→ PDF iframe
4. 「システム仕様書」→「進む」→ `/myou/manual`
5. 「← 戻る」が動作する

- [ ] **Step 5: コミットする（ユーザー依頼時のみ）**

```bash
git add \
  src/app/\(tenant\)/\(tenant-users\)/myou/components/DocIndexClient.tsx \
  src/app/\(tenant\)/\(tenant-users\)/myou/doc-index/page.tsx
git commit -m "$(cat <<'EOF'
feat(myou): add book-style document index at /myou/doc-index

EOF
)"
```

---

## Spec coverage（自己レビュー）

| 仕様                  | 対応 Task           |
| --------------------- | ------------------- |
| URL `/myou/doc-index` | Task 1, 3           |
| 本の目次風 UI         | Task 3              |
| 画像モーダル          | Task 2, 3           |
| PDF モーダル iframe   | Task 2, 3           |
| `/myou/manual` 遷移   | Task 3              |
| `MyouBackLink`        | Task 3              |
| メニュー登録しない    | 全 Task（触らない） |
| 自動テストなし        | Global Constraints  |

プレースホルダなし。型名 `DocPreviewKind` / `DocPreviewModalProps` は Task 2→3 で一致。
