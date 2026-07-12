---
name: my_modal_manual
description: >-
  指定したURL（画面パス）の画面に「画面の説明」ボタンを設置し、既存のヘルプMarkdown基盤
  （src/content/help + @/components/help/HelpMarkdownModal）を使って、目的・操作概要・
  入力項目の説明・関連画面・注意事項の5項目構成のマニュアルモーダルを実装する。
  Use when the user specifies a screen URL and asks to add a help/manual/explanation button,
  画面の説明ボタン, マニュアルボタン, ヘルプボタン, 使い方モーダル, 目的/操作概要/入力項目/関連画面/注意事項,
  or invokes /my_modal_manual。
---

# my_modal_manual（画面の説明ボタン・URL指定）

## 目的

指定されたURL（例：`/adm/turnover-risk`）の画面右上に「画面の説明」ボタンを設置し、次の
5項目構成でその画面の使い方をまとめたマニュアルモーダルを表示する。

全項目、開発者用語ではなく**利用者（人事担当者・従業員）が読んでわかる言葉**で書く（詳細は下記「文章のトーン」参照）。

1. **目的** — この画面で何ができるか、業務のどんな場面で使うか
2. **操作概要** — 主な操作の流れ（ステップ形式）。計算方法がある場合は「どう算出されるか」を利用者がわかる言葉で含める
3. **入力項目の説明** — フォーム項目・フィルタ・ボタンを一つずつ、必須/任意や入力時の注意点を利用者向けに
4. **他の関連ある画面の説明** — この画面の前後で見る・使う画面や、結果がどこに反映されるか
5. **注意事項** — 保存前に確認すべきこと、取り消せない操作、利用できる人が限られる場合の案内など、利用者が業務でつまずかないための注意

## 入力

- `{URL}`：対象画面のパス（例：`/adm/turnover-risk`）。ユーザーから明示的に指定される。

## 手順

### 1. 対象画面の実装を実際に読む（推測で書かない）

- `{URL}` に対応する `page.tsx` とその配下のコンポーネント・Server Action・計算ロジックを Read する。
- 主要な計算式・判定条件がある場合は、そのロジックファイルを確認し、数値・条件式を実装と完全に一致させる。
- 入力項目（フォーム・フィルタ）の必須/任意・バリデーション内容、画面遷移先（リンク・タブ・関連する他画面）を合わせて確認する。

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
- 本文構成は次の5セクションを基本とする（`##` 見出しでこの順に記載。ユーザー指定があればそれに従う）：
  1. **目的**：この画面が解決する課題・使う場面（業務目線で）
  2. **操作概要**：主な操作の流れをステップ形式で。計算方法がある画面は「どう算出されるか」を利用者向けの言葉で書く（数値・条件は実装コードと完全に一致させる。ただし「バリデーション」「RLS」等の実装用語は使わず、「〇〇は必須です」のように書く）
  3. **入力項目の説明**：フォーム項目・フィルタ・ボタンを一つずつ、必須/任意や入力時に迷いやすい点を利用者目線で
  4. **他の関連ある画面の説明**：この画面の前後で見る・使う画面、結果の反映先（画面名・遷移導線で説明。URLパスや`APP_ROUTES`はコード確認用の内部メモに留め、本文には書かない）
  5. **注意事項**：保存前に確認すべきこと・元に戻せない操作・利用できる人が限られる場合の案内など。「不可逆操作」「テナント分離」のような技術用語ではなく「一度保存すると元に戻せません」「この操作は人事管理者のみ行えます」のように業務者にそのまま伝わる書き方にする

### 文章のトーン（全セクション共通）

- 読み手は**画面を実際に操作する人事担当者・従業員**。開発者向けの実装説明ではない。
- NG例：「不可逆操作」「テナント分離」「RLSポリシー」「バリデーション」「Server Action」
- OK例：「一度確定すると修正できません」「他社の情報が見えることはありません」「入力必須の項目です」
- 権限の説明も「〇〇の権限を持つ人のみ」ではなく「人事管理者のみ」「従業員本人のみ」など画面上の役割名で書く。

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
- 5セクション（目的／操作概要／入力項目の説明／他の関連ある画面の説明／注意事項）が全て揃っているか確認する。
- 本文に開発者用語（不可逆操作・テナント分離・RLS・バリデーション・Server Action 等）が残っていないか見直し、利用者目線の言葉に言い換える。
- 計算式を含む場合、実装コードの数値と本文の数値が一致しているか再確認する（ただし表現は利用者向けの言葉のまま）。
- Markdownの見出しレベルは飛ばさない（`my_help_modal_style` の見出し規約に従う）。
