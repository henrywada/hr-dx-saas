# 実装計画: AI人事アシスタント進化版（人事アップデート + OpenRouter）

作成日: 2026-07-09  
最終更新: 2026-07-20（e-Gov条文原文取得を追記）

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

| 変数                 | 用途                                              |
| -------------------- | ------------------------------------------------- |
| `OPENROUTER_API_KEY` | Next.js + Edge Function（必須）                   |
| `SERPAPI_API_KEY`    | 本機能では未使用（他機能用に残置）                |
| `GEMINI_API_KEY`     | 他機能用に残置。人事アシスタント本線は OpenRouter |

`web_search`（Exa 等）は OpenRouter クレジット課金あり。モデル本体を free にしても検索は有料。

## 4. アーキテクチャ

- 週次 `hr-law-refresh`（月曜 6:00 JST）:
  1. 既存文書のハイブリッド鮮度チェック（ETag/Last-Modified → hash → 変化時のみ再要約）
  2. 有効トピック探索 → `hr_law_crawl_queue` → 要約・埋め込み
  3. 厚労省新着から `hr_law_topic_proposals` へ候補投入（自動で sources は増やさない）
- 週次 `hr-assistant-template-mining`（月曜 7:00 JST）: 質問履歴 → mined テンプレ + themes → `hr_law_topic_proposals`
- 監視トピック閉ループ: 候補 → SaaS管理者承認/手動CRUD（論理削除）→ 有効 `hr_law_sources`
  - 詳細仕様: `docs/superpowers/specs/2026-07-10-hr-law-topic-closed-loop-design.md`
- チャット: dual RAG + 低類似度時オンデマンド収集（最大 2 URL）
- UI: `/adm/hr-assistant` に「人事アップデート」「AI人事アシスタント」タブ
- SaaS UI: `/saas_adm/hr-law-knowledge` に監視トピック / トピック候補 / 収集済み文書 / ログ

## 5. データモデル拡張

- `hr_law_documents.theme` / `expires_at` / `status=expired`
- `hr_law_documents.http_etag` / `http_last_modified` / `content_checked_at`（鮮度）
- `hr_law_crawl_queue`（pending を次回へ持ち越し）
- `hr_law_topic_proposals`（監視トピック候補・承認ゲート）
- `hr_law_sources.origin` / `disabled_at` / `updated_at`（手動・提案・論理削除）
- `expire_hr_law_documents()` RPC

## 6. 実装フェーズ（完了状況）

| Phase | 内容                                                         | 状態                                         |
| ----- | ------------------------------------------------------------ | -------------------------------------------- |
| P0    | OpenRouter クライアント・チャット移行                        | 実装済                                       |
| P1    | DB 拡張・週次ジョブ OpenRouter 化・失効                      | 実装済（migration 適用はローカル DB 起動後） |
| P2    | 2タブ UI・ニュース/テーマ・情報元モーダル                    | 実装済                                       |
| P3    | miss 時収集・template mining・mined サジェスチョン           | 実装済                                       |
| P4    | 再埋め込みスクリプト・PRD 更新・SaaS 表記                    | 実装済                                       |
| P5    | 監視トピック閉ループ（候補承認・CRUD）＋文書鮮度ハイブリッド | 実装済                                       |

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

## 9. e-Gov 法令API v2 による条文原文取得（2026-07-20 追加）

### 問題定義

既存の法令 RAG（`hr_law_chunks`）・オンデマンドWeb検索（`ondemand-law.ts`）は要約・チャンク化された
二次情報であり、ユーザーが「労基法第32条」のように条文番号を明示した質問でも、原文そのものより
セマンティック検索・Web検索の結果に依存していた。OSS [labor-law-mcp](https://github.com/kentaroajisaka/labor-law-mcp)
（MIT License）の `get_law` 機能を調査した結果、e-Gov法令API v2から条文原文を直接取得できることを確認し、
MCPプロトコルなしで直接呼び出せるライブラリコードとして移植した（詳細は `THIRD_PARTY_NOTICES.md`）。

### 決定事項

1. 対象は `get_law`（条文取得）のみ。通達検索（MHLW/JAISH）は対象外
   （HTMLスクレイピングの脆さ・JAISH利用規約未確認のため見送り）
2. e-Gov API v2 の `elm=MainProvision-Article_{num}` パラメータで条文単位に絞り込んで取得する設計とし、
   labor-law-mcp本家（法令全文を毎回取得）より軽量化した
3. 質問文から「法令名（略称含む）+ 条文番号」の明示的な言及を正規表現で検出した場合のみ発火する
   （条文番号を伴わない一般的な質問では発火せず、既存のRAG/オンデマンド検索に委ねる。誤爆防止）
4. 取得結果は都度のコンテキスト注入のみで、`hr_law_chunks` への永続化はしない（スコープ外）
5. 既知の制約: 直近改正（施行日から日が浅い）法令はe-Gov側のデータファイル生成が追いついておらず
   404になる場合がある（実データで確認済み）。この場合は null を返しグレースフルに他経路へフォールバックする

### 主要ファイル

- `src/features/hr-assistant/egov-types.ts` — e-Gov API v2 レスポンス型
- `src/features/hr-assistant/egov-law-registry.ts` — 主要45法令のlaw_id・略称マッピング
- `src/features/hr-assistant/egov-parser.ts` — 条文JSONツリーからのテキスト抽出（枝番号・号の細分対応）
- `src/features/hr-assistant/egov-law-detect.ts` — 質問文からの条文参照検出
- `src/features/hr-assistant/egov-client.ts` — e-Gov APIクライアント（レート制限・キャッシュ・タイムアウト）
- `src/features/hr-assistant/egov-law.ts` — 統合オーケストレーション（`fetchLawArticleContext`）
- `src/features/hr-assistant/actions.ts` — `sendHrAssistantMessage` に統合（RAG検索と並行実行）
