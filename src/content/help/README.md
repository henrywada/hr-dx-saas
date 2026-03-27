# ヘルプ・マニュアル本文（統合管理）

## 編集の手順

- **本文**は `markdown/` 配下の `.md` ファイルを編集してください（カテゴリはフォルダで区切っています）。
- **新しいマニュアル項目**を追加するときは次を行ってください。
  1. `markdown/<カテゴリ>/<エントリid>.md` を作成する（`エントリid` は `manualData.ts` の `ManualEntry.id` と同一にする）。
  2. `helpMarkdownMap.ts` に `import` と `HELP_MARKDOWN_BY_ID` の行を追加する。
  3. `manualData.ts` の該当カテゴリに `id` / `title` のエントリを追加する。

## 他画面のモーダルから使う

- `getHelpMarkdown(contentId)`（`@/content/help`）で Markdown 文字列を取得する。
- 定数は `HELP_CONTENT_IDS`（`@/content/help`）を参照する。

## 表示スタイル

- UI は `@/components/help/MarkdownHelpBody` または `HelpMarkdownModal` で統一する（マニュアル集と同じ見出し・リスト・画像スタイル）。

## ビルドについて

- `.md` を文字列としてバンドルするため `next.config.ts` に webpack の `asset/source` ルールを入れています。Next.js 16 の既定は Turbopack のため、`package.json` の `dev` / `build` に `--webpack` を付与しています（Turbopack 用ルールへ移行する場合はこの制約を見直してください）。
