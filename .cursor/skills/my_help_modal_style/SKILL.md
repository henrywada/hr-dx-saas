---
name: my_help_modal_style
description: >-
  ドキュメント・ガイド・手順説明向けモーダルを、青ヘッダーと Markdown 本文スタイルで実装する。
  ヘルプモーダル、マニュアル、仕組み／使い方、勤怠ガイド、ReactMarkdown、HelpMarkdownModal、
  MarkdownHelpBody、getHelpMarkdown、マークダウン表示の新規・改修時に従う。
---

# my_help_modal_style（ヘルプ／ガイド系モーダル）

## いつ使うか

- 長文の説明・番号付き手順・「仕組み」「使い方」などのセクションをモーダルで見せるとき。
- `HelpMarkdownModal` の有無や、`CardExplanationModal` 風の独自 `ReactMarkdown` を足すか判断するとき。

## 実装チェックリスト

1. **枠（Dialog）**: `@/components/ui/dialog` の `Dialog` + `DialogContent`。高さは `max-h-[80vh]` 前後、幅は `max-w-[800px]` 前後。角丸 `rounded-lg`、本文エリアは `p-0` でヘッダー／ボディを分離。
2. **ヘッダー**: `bg-sky-600`、`DialogTitle` は白・`text-lg`〜`text-xl`・`font-semibold`。`DialogHeader` は `border-0`、`rounded-t-lg`。
3. **閉じるボタン**: `DialogContent` 直下の Radix 閉じるボタンを白にするため、`HelpMarkdownModal` と同じ `[&>button]:text-white [&>button]:hover:bg-white/15 ...` を付与。
4. **スクロール**: 本文ラッパーに `min-h-0 flex-1 overflow-y-auto overscroll-contain`、`[scrollbar-gutter:stable]`、適宜 `px-6 py-5 sm:px-8 sm:py-6`。
5. **本文**: `MarkdownHelpBody` に `markdown` を渡す。または `markdownHelpComponents` を import して `ReactMarkdown` の `components` に渡す（複製はコンポーネント定義ごと揃える）。
6. **a11y**: `DialogPrimitive.Description` を `sr-only` で短く（タイトル複製または `srDescription`）。

## Markdown 見出しと見た目の対応

`MarkdownHelpBody`（`markdownHelpComponents`）に合わせ、本文では次を踏襲する。

| 用途 | Markdown | 見た目の目安 |
|------|----------|----------------|
| ページタイトル級 | `#`（h1） | 大きめ・太字・`text-gray-900` |
| 大セクション（「1. ○○方式」など） | `##`（h2） | `text-xl font-semibold`、上マージン大 |
| 小見出し（仕組み・使い方手順など） | `###`（h3） | 左ボーダー＋薄い帯（`border-indigo-400` + `bg-indigo-50`） |
| 本文・リスト | 通常段落 / `-` / `1.` | `text-gray-700`、`leading-7` |
| 強調ラベル（【監督者側】など） | `**...**` | `font-semibold text-gray-900` |

見出しレベルを飛ばさない（`##` の直後に `####` だけ、などは避ける）。

## マニュアル集と連動するとき

- 本文ファイルは `src/content/help/markdown/` と `helpMarkdownMap.ts` の手順に従う（詳細は `src/content/help/README.md`）。
- 画面から開くだけなら `getHelpMarkdown(contentId)` と `HELP_CONTENT_IDS` を利用し、`HelpMarkdownModal` に渡す。

## 参照ファイル

- `src/components/help/HelpMarkdownModal.tsx` — シェル・ヘッダー・閉じるボタン・スクロール領域の正。
- `src/components/help/MarkdownHelpBody.tsx` — `markdownHelpComponents`（h1〜h3・リスト・コード・画像）。
- `src/content/help/README.md` — マニュアル本文の追加・ビルド注意。
- `src/components/ui/dialog.tsx` — オーバーレイ・アニメーション・既定の `DialogContent` 形状。

## プロジェクトルールとの関係

`.agent/rules/basic.md` のフォント方針と並立させ、ヘルプ本文の字間・行間・色は **`MarkdownHelpBody` のラッパークラスとコンポーネントマップ**を優先する。
