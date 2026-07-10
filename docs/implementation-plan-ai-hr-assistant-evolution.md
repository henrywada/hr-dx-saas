# 実装計画: AI人事アシスタント進化版（人事アップデート + OpenRouter）

作成日: 2026-07-09  
最終更新: 2026-07-10

---

## 1. 問題定義

`/adm/hr-assistant`（テナント管理者向け）はチャットと法令 RAG が稼働していたが、
経営者・人事責任者向けの「最新情報ハブ」体験と、OpenRouter による収集・回答の統一が不足していた。

## 2. 決定事項（2026-07-10）

1. **OpenRouter 全面移行（1-A）** — チャット・週次収集・要約・埋め込みを OpenRouter に統一
2. **クロール方式（2-A）** — `mhlw.go.jp` 全ページ再帰は行わない。`openrouter:web_search` + `web_fetch` でトピック探索し、キューで分割処理
3. **画面名称** — 「人事アップデート」（旧・人事情報集 / 法令ナレッジ）
4. **テナント共有** — `hr_law_*` は全テナント共有。チャット履歴・mined テンプレはテナント分離
5. **サジェスチョン** — mined のみ表示。履歴が無い場合は空欄（seed 非表示）

## 3. 必要な設定

| 変数 | 用途 |
|------|------|
| `OPENROUTER_API_KEY` | Next.js + Edge Function（必須） |
| `SERPAPI_API_KEY` | 本機能では未使用（他機能用に残置） |
| `GEMINI_API_KEY` | 他機能用に残置。人事アシスタント本線は OpenRouter |

`web_search`（Exa 等）は OpenRouter クレジット課金あり。モデル本体を free にしても検索は有料。

## 4. アーキテクチャ

- 週次 `hr-law-refresh`（月曜 6:00 JST）: OpenRouter 探索 → `hr_law_crawl_queue` → 要約・埋め込み → `hr_law_documents` / `hr_law_chunks`
- 週次 `hr-assistant-template-mining`（月曜 7:00 JST）: 質問履歴 → mined テンプレ
- チャット: dual RAG + 低類似度時オンデマンド収集（最大 2 URL）
- UI: `/adm/hr-assistant` に「人事アップデート」「AI人事アシスタント」タブ

## 5. データモデル拡張

- `hr_law_documents.theme` / `expires_at` / `status=expired`
- `hr_law_crawl_queue`（pending を次回へ持ち越し）
- `expire_hr_law_documents()` RPC

## 6. 実装フェーズ（完了状況）

| Phase | 内容 | 状態 |
|-------|------|------|
| P0 | OpenRouter クライアント・チャット移行 | 実装済 |
| P1 | DB 拡張・週次ジョブ OpenRouter 化・失効 | 実装済（migration 適用はローカル DB 起動後） |
| P2 | 2タブ UI・ニュース/テーマ・情報元モーダル | 実装済 |
| P3 | miss 時収集・template mining・mined サジェスチョン | 実装済 |
| P4 | 再埋め込みスクリプト・PRD 更新・SaaS 表記 | 実装済 |

## 7. 主要ファイル

- `src/lib/ai/openrouter.ts`
- `src/features/hr-assistant/`（actions / ondemand-law / components）
- `supabase/functions/hr-law-refresh/`
- `supabase/functions/hr-assistant-template-mining/`
- `supabase/migrations/20260710060000_hr_law_update_theme_queue.sql`
- `supabase/migrations/20260710060100_hr_assistant_template_mining_cron.sql`
- `scripts/reembed_hr_law_chunks.ts`（`npm run reembed-hr-law-chunks`）

## 8. 運用メモ

1. `OPENROUTER_API_KEY` を `.env.local` と `supabase secrets set` に設定
2. `supabase migration up`（**db reset 禁止**）
3. 既存チャンクがある場合は `npm run reembed-hr-law-chunks` で再埋め込み
4. Edge Function をデプロイ: `hr-law-refresh` / `hr-assistant-template-mining`
