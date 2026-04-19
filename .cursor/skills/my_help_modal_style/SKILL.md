---
name: my_help_modal_style
description: >-
  ドキュメント・ガイド・手順説明向けモーダルを、青ヘッダーと Markdown 本文スタイルで実装する。
  ヘルプモーダル、マニュアル、仕組み／使い方、勤怠ガイド、ReactMarkdown 表示の新規・改修時に従う。
---

# my_help_modal_style（ヘルプ／ガイド系モーダル）

## いつ使うか

長文の説明・番号付き手順・「仕組み」「使い方」などをモーダルで表示するとき。

## 実装ルール

### 枠（Dialog）
- `@/components/ui/dialog` の `Dialog` + `DialogContent` を使う
- 高さ `max-h-[80vh]`、幅 `max-w-[800px]` 前後、角丸 `rounded-lg`

### ヘッダー
- 背景 `bg-sky-600`、タイトルは白・`font-semibold`
- 閉じるボタンを白くするため `[&>button]:text-white [&>button]:hover:bg-white/15` を付与

### 本文エリア
- `overflow-y-auto overscroll-contain` でスクロール可能にする
- 既存の `MarkdownHelpBody` コンポーネントがあればそれを再利用する

### Markdown 見出し対応

| 用途 | Markdown | スタイル目安 |
|------|----------|-------------|
| 大セクション | `##`（h2） | `text-xl font-semibold`、上マージン大 |
| 小見出し | `###`（h3） | 左ボーダー＋薄い帯（indigo系） |
| 本文・リスト | 段落 / `-` / `1.` | `text-gray-700 leading-7` |

見出しレベルは飛ばさない。

### a11y
- `DialogDescription` を `sr-only` で短く設定する

## マニュアル本文の追加
- 本文ファイルは `src/content/help/` 配下に配置する
- 既存の `getHelpMarkdown()` と `HelpMarkdownModal` を再利用できる場合は新規実装しない
