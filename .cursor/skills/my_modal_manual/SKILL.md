---
name: my_modal_manual
description: >-
  指定したURL（画面パス）の画面に「画面の説明」ボタンを設置し、既存のヘルプMarkdown基盤
  （src/content/help + @/components/help/HelpMarkdownModal）を使ってマニュアルモーダルを実装する。
  Use when the user specifies a screen URL and asks to add a help/manual/explanation button,
  画面の説明ボタン, マニュアルボタン, ヘルプボタン, 使い方モーダル, or invokes /my_modal_manual。
---

# my_modal_manual（画面の説明ボタン・URL指定）

## 目的

指定されたURL（例：`/adm/turnover-risk`）の画面に「画面の説明」ボタンを設置し、その画面の
使い方・各項目/ボタンの説明・（あれば）計算ロジックをまとめたマニュアルモーダルを表示する。

## 入力

- `{URL}`：対象画面のパス（例：`/adm/turnover-risk`）。ユーザーから明示的に指定される。

## 手順

### 1. 対象画面の実装を実際に読む（推測で書かない）

- `{URL}` に対応する `page.tsx` とその配下のコンポーネント・Server Action・計算ロジックを Read する。
- 主要な計算式・判定条件がある場合は、そのロジックファイルを確認し、数値・条件式を実装と完全に一致させる。

### 2. モーダル基盤は既存の共通基盤を再利用する（新規モーダル実装をしない）

- `@/components/help/HelpMarkdownModal`（青ヘッダー・Radix `Dialog`・Markdown本文、
  `max-w-[800px]` / `max-h-[80vh]`）を使う。スタイル詳細は [my_help_modal_style](../my_help_modal_style/SKILL.md) に従う。
- `fixed inset-0` の自前実装や、独自の配色・レイアウトのモーダルを新規に作らない。

### 3. 本文はMarkdownファイルとして作成する

- 配置先：`src/content/help/markdown/<カテゴリ>/<entry-id>.md`
- `<カテゴリ>` は対象機能のドメイン（既存カテゴリ：`attendance` / `recruitment` / `pulse` /
  `stress` / `settings` / `other` 等。近いものがなければ新設してよい）。
- `<entry-id>` は kebab-case（例：`org-turnover-risk-guide`）。既存の `manualData.ts` の
  `ManualEntry.id` と一致させる（マニュアル集にも載せる場合）。
- 本文構成は次の3セクションを基本とする（ユーザー指定があればそれに従う）：
  1. **画面の使い方**：画面の目的＋操作の流れをステップ形式で
  2. **各項目・ボタンの説明**：画面に表示されている項目・ボタンを一つずつ
  3. **主要な項目の具体的な計算式**：計算ロジックがある画面のみ。実装コードの数値・条件式と完全に一致させる

### 4. 登録する（`src/content/help/README.md` の手順）

1. `helpMarkdownMap.ts` に `import` 文と `HELP_MARKDOWN_BY_ID` のエントリを追加する。
2. `ids.ts` の `HELP_CONTENT_IDS` に定数を追加する。
3. 画面固有の表示タイトルが必要な場合は `entryMeta.ts` にタイトル定数を追加する。

### 5. 画面側にボタンを設置する

- 対象画面のヘッダー右上（既存の主要アクションボタンの隣）に「画面の説明」ボタンを配置する。
- 実装パターン（`QrPunchMobileTipsModalTrigger` を参考）：

```tsx
'use client'

import { useMemo, useState } from 'react'
import { getHelpMarkdown, HELP_CONTENT_IDS } from '@/content/help'
import { HelpMarkdownModal } from '@/components/help/HelpMarkdownModal'

// ボタン本体（対象画面のヘッダーに配置）
const [open, setOpen] = useState(false)
const markdown = useMemo(() => getHelpMarkdown(HELP_CONTENT_IDS.<定数名>), [])

<button onClick={() => setOpen(true)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
  画面の説明
</button>
<HelpMarkdownModal open={open} onOpenChange={setOpen} title="<画面タイトル>" markdown={markdown} />
```

### 6. （任意）マニュアル集への追加

`/adm/manual` のマニュアル集にも掲載したい場合は `manualData.ts` の該当カテゴリに
`{ id, title }` を追加する。画面ローカルのヘルプのみで良い場合はスキップしてよい
（判断に迷う場合はユーザーに確認する）。

## 出力後の検証

- `npm run type-check` と `npx eslint <変更ファイル>` を実行する。
- 計算式を含む場合、実装コードの数値と本文の数値が一致しているか再確認する。
- Markdownの見出しレベルは飛ばさない（`my_help_modal_style` の見出し規約に従う）。
