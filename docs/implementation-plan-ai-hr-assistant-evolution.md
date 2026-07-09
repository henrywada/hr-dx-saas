# 実装計画: AI人事アシスタント進化版（法令ナレッジ自動更新 + 質問テンプレート学習）

作成日: 2026-07-09

---

## 1. 問題定義

`/adm/hr-assistant`（テナント管理者向け AI 人事相談アシスタント）は既に稼働している
（4モードチャット・テナント資料 RAG・Gemini 2.5 Flash・出典引用）。
しかし現状は以下の 2 点が欠けており、ペルソナ（中小企業の経営者・人事責任者）に
「使える TOOL」と認知されるための決定打がない。

1. **知識が静的** — 労働法令・行政通達は頻繁に改正される（最低賃金・社会保険料率・
   育児介護休業法等）が、アシスタントの知識はテナントがアップロードした資料と
   モデルの学習時点の知識に固定されている。回答の鮮度が保証できない。
2. **使い込むほど良くなる体験がない** — 何を聞けばよいか分からない管理者は
   空のチャット欄の前で離脱する。過去の利用実績から「こんな質問はありませんか？」と
   提案する仕組みがなく、利用が定着しない。

## 2. ユーザーストーリー

- 人事責任者として、**最新の法改正を踏まえた回答**（出典 URL・取得日付き）を得たい。
  改正を自分で追いかける時間がないからだ。
- 人事責任者として、チャットを開いた瞬間に**自分に関係ありそうな質問例**が
  提示されてほしい。何を聞けるツールなのか迷いたくないからだ。
- 経営者として、/adm ダッシュボードで**今週の法改正トピック**を一目で知りたい。
- SaaS 管理者として、自動収集された法令ナレッジを**一覧・無効化・再実行**できる
  管理画面が欲しい。誤情報が混入した際に即座に止めるためだ。

## 3. 全体アーキテクチャ

既存の hr-assistant を土台に、3 つのサブシステムを追加する。

```
┌─ 週次バッチ（pg_cron → Edge Function、既存 qualification-expiry-alert と同パターン）
│
│  [A] hr-law-refresh（月曜 6:00 JST）
│      SerpAPI（公的ドメイン限定検索）→ 本文取得 → Gemini 要約・構造化
│      → チャンク化・埋め込み → hr_law_documents / hr_law_chunks（全テナント共有）
│
│  [B] hr-assistant-template-mining（月曜 7:00 JST）
│      直近90日の質問履歴（テナント単位）→ Gemini でクラスタリング・汎化・PIIマスク
│      → tenant_hr_assistant_templates に upsert
│
└─ チャット実行時（既存 actions.ts を拡張）
       RAG 検索を 2 系統マージ:
         match_tenant_rag_chunks（貴社固有の規定）
       + match_hr_law_chunks（最新法令ナレッジ）
       → 回答に出典・情報取得日を明記

   [C] 認知獲得 UI
       ・チャット空状態 + 入力欄上部に「💡 こんな質問はありませんか？」チップ
       ・/adm ダッシュボードカード「今週の法改正トピック + おすすめ質問」
       ・回答への 👍👎 フィードバック（テンプレ品質・プロンプト改善の指標）
```

### 検討した代替案

**週次ジョブの実行基盤**

| 案                                | 評価                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------- |
| ① pg_cron + Edge Function（採用） | 既存パターン踏襲（`20260513000200_qualification_expiry_cron.sql`）。運用追加なし |
| ② Vercel Cron + API Route         | `app/api/` 原則禁止の方針に抵触。認証トークン管理も別途必要                      |
| ③ GitHub Actions / 外部ワーカー   | CI 未設定のリポジトリに新規運用が増える                                          |

Edge Function の実行時間制限（約 400 秒）を考慮し、1 回の実行で処理するトピック数を
制限（最大 10）し、1 トピックずつ逐次処理・途中失敗でも継続する設計とする。

**Web 検索手段**

| 案                                      | 評価                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| ① SerpAPI（採用）                       | `SERPAPI_API_KEY` 設定済・market-analysis 等で利用実績あり。`site:` 指定で公的ドメインに限定可能 |
| ② Gemini google_search グラウンディング | 出典 URL・鮮度の制御が難しい。将来の補助手段として保留                                           |
| ③ 独自クローラ                          | メンテナンスコスト大。YAGNI                                                                      |

## 4. 要求優先度とフェーズ

| フェーズ | 内容                                                                 | 優先度 | 狙い                                     |
| -------- | -------------------------------------------------------------------- | ------ | ---------------------------------------- |
| Phase 1  | 質問テンプレート表示（seed 20件 + UI チップ + usage 計測）           | MUST   | 即効性。初日から「何を聞けるか」が見える |
| Phase 2  | 法令ナレッジ自動更新（[A] 一式 + RAG 2系統マージ + SaaS 管理画面）   | MUST   | 「データを最新に保つ」の中核             |
| Phase 3  | テンプレートマイニング週次ジョブ（[B]）+ ダッシュボードカード + 👍👎 | SHOULD | 「だんだん賢くなる」の実現               |

Phase 1 はバッチ不要（seed とフロントのみ）で最小リスク・最短で価値が出るため先行する。

## 5. データモデル案

### 5.1 法令ナレッジ（グローバル・テナント非依存）

```sql
-- 監視トピックマスタ（SaaS 管理者がメンテ）
CREATE TABLE public.hr_law_sources (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic        text NOT NULL,            -- 例: '最低賃金', '育児介護休業法'
  search_query text NOT NULL,            -- 例: '最低賃金 改定 site:mhlw.go.jp'
  enabled      boolean NOT NULL DEFAULT true,
  last_run_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 収集した法令情報
CREATE TABLE public.hr_law_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id     uuid REFERENCES public.hr_law_sources(id) ON DELETE SET NULL,
  title         text NOT NULL,
  source_url    text NOT NULL,
  content_hash  text NOT NULL,           -- 重複取得スキップ用
  summary       text NOT NULL,           -- Gemini 生成（施行日・対象・変更点の構造化要約）
  published_at  date,                    -- 元記事の公開日（判別できた場合）
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  status        text NOT NULL DEFAULT 'published'
                CHECK (status IN ('published', 'disabled')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_hash)
);

-- 埋め込みチャンク（tenant_rag_chunks と同じ 1536 次元）
CREATE TABLE public.hr_law_chunks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  uuid NOT NULL REFERENCES public.hr_law_documents(id) ON DELETE CASCADE,
  chunk_index  int NOT NULL,
  content      text NOT NULL,
  embedding    vector(1536),
  metadata     jsonb DEFAULT '{}',       -- { document_title, source_url, fetched_at }
  created_at   timestamptz NOT NULL DEFAULT now()
);
-- match_hr_law_chunks(query_embedding, match_count) RPC を追加
-- （status = 'published' の文書のみ対象）
```

**RLS**: 3 テーブルとも有効化。SELECT は `authenticated` 全員に許可
（テナント固有情報を含まない公開法令情報のため）。INSERT/UPDATE/DELETE は
`service_role` のみ（週次ジョブと SaaS 管理画面の Server Action は
`createAdminClient()` を使用 — SaaS 管理者専用画面のため許容。
テナント向け `actions.ts` では従来どおり禁止）。

### 5.2 質問テンプレート（テナント単位）

```sql
CREATE TABLE public.tenant_hr_assistant_templates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
                                      -- NULL = 全テナント共通の seed テンプレート
  mode              text NOT NULL DEFAULT 'general'
                    CHECK (mode IN ('general','labor_calc','comment_review','case_search')),
  question_text     text NOT NULL,
  source            text NOT NULL DEFAULT 'seed'
                    CHECK (source IN ('seed', 'mined')),
  usage_count       int NOT NULL DEFAULT 0,
  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
```

**RLS**: SELECT は「`tenant_id IS NULL`（共通 seed）または自テナント」。
書き込みは service_role（マイニングジョブ）と usage_count 更新用の
Server Action のみ。

**表示ロジック**: 自テナントの mined テンプレ（usage_count 降順）を優先し、
不足分を seed で補って合計 6 件をチップ表示する。

### 5.3 既存テーブルへの変更

- `tenant_hr_assistant_messages.metadata` に `feedback: 'up' | 'down'` と
  `law_cited_ids: uuid[]` を格納（スキーマ変更不要、jsonb 内で対応）。

## 6. 主要コンポーネントと配置ルール

```
src/features/hr-assistant/
  actions.ts            # 【変更】RAG 2系統マージ、テンプレ usage_count++、フィードバック保存
  queries.ts            # 【変更】listQuestionTemplates() 追加
  prompts.ts            # 【変更】法令ナレッジの出典・取得日明記の指示を追加
  components/
    ChatPanel.tsx       # 【変更】テンプレチップ・フィードバックボタン
    QuestionTemplateChips.tsx   # 【新規】「💡 こんな質問はありませんか？」
    WeeklyUpdateBanner.tsx      # 【新規】「今週のアップデート」バナー（Phase 3）

src/features/saas-law-knowledge/      # 【新規】SaaS 管理者向け
  queries.ts / actions.ts             # createAdminClient() 使用（SaaS管理者専用のため許容）
  components/LawDocumentTable.tsx     # DataTable 準拠

src/app/(saas-admin)/saas_adm/hr-law-knowledge/page.tsx   # 【新規】+ loading/error
src/config/routes.ts                  # SAAS.HR_LAW_KNOWLEDGE 追加

supabase/functions/
  hr-law-refresh/index.ts             # 【新規】週次: 検索→要約→埋め込み→登録
  hr-assistant-template-mining/index.ts  # 【新規】週次: 履歴→テンプレ生成

supabase/migrations/
  XXXX_hr_law_knowledge.sql           # 5.1 のテーブル + RPC + RLS
  XXXX_hr_assistant_templates.sql     # 5.2 のテーブル + RLS + seed 20件
  XXXX_hr_assistant_weekly_cron.sql   # cron.schedule 2件（月曜 6:00 / 7:00 JST）
```

## 7. 週次ジョブの処理設計

### 7.1 hr-law-refresh（毎週月曜 6:00 JST = 日曜 21:00 UTC）

1. `hr_law_sources`（enabled）を取得（最大 10 件）
2. 各トピックについて SerpAPI 検索（期間: 直近 1 ヶ月、`site:` で公的ドメイン限定）
3. 上位 3 件の URL の本文を取得 → `content_hash` が既存なら skip
4. Gemini で要約（施行日・対象企業・変更点・実務影響の構造化。
   「不確かな場合は要約しない」指示でハルシネーション抑制）
5. チャンク化（900 字 / overlap 100 — inquiry-chat の定数を踏襲）→
   `gemini-embedding-001`（1536 次元）で埋め込み → 登録
6. 1 トピック失敗しても継続。結果サマリを console ログ（Supabase logs で監視）

**品質ガード（重要）**: 検索対象は公的ドメインのホワイトリストに限定する
（`mhlw.go.jp`, `jsite.mhlw.go.jp`, `e-gov.go.jp`, `nenkin.go.jp`, `jil.go.jp` 等）。
一般メディア・まとめサイトは対象外とし、誤情報の混入経路を構造的に断つ。

### 7.2 hr-assistant-template-mining（毎週月曜 7:00 JST）

1. 直近 90 日の `tenant_hr_assistant_messages`（role='user'）をテナント単位で集約
   （質問数 5 件未満のテナントは skip）
2. Gemini に一括投入し「固有名詞・個人情報を除去した汎用的な質問テンプレート」を
   5〜10 件生成させる（PII マスクをプロンプトで明示）
3. 既存テンプレとの重複を埋め込み類似度（cosine > 0.9）で排除して upsert
4. **テナント横断の学習は初期リリースでは行わない**（個社の質問内容が
   他社に漏れるリスクをゼロにする安全側の判断。将来は匿名化・集計済みの
   ランキングのみ共有を検討）

## 8. チャット実行時の変更（actions.ts）

- RAG 検索を並列 2 系統に拡張:
  `match_tenant_rag_chunks`（社内規定・top 8）+ `match_hr_law_chunks`（法令・top 4）
- コンテキストブロックに系統ラベルを付与:
  `【社内資料N】` / `【法令情報N（取得日: YYYY-MM-DD、出典: URL）】`
- システムプロンプトに追記: 「法令情報を引用する際は必ず取得日と出典 URL を明記。
  社内規定と法令が矛盾する場合は両方を提示し、法改正への対応が必要な可能性を指摘」
- Citation 型に `sourceUrl?: string` / `fetchedAt?: string` を追加し UI でリンク表示

## 9. エラー処理

- 週次ジョブ: 1 ソース・1 テナントの失敗で全体を止めない（try/catch + 継続）。
  失敗しても前週のナレッジで動作し続ける（劣化しない設計）
- SerpAPI / Gemini のクォータ超過: そのランをスキップしてログ。翌週リトライで自然回復
- チャット側: `match_hr_law_chunks` 失敗時は従来どおりテナント RAG のみで回答継続
  （既存の「RAG 失敗は致命的でない」方針を踏襲）
- テンプレ取得失敗時: チップ非表示（チャット自体は阻害しない）

## 10. テスト計画

- **Unit**: チャンク重複判定（content_hash）、テンプレ類似度排除、
  法令コンテキストのフォーマッタ、表示テンプレの選定ロジック（mined 優先 + seed 補完）
- **Integration**: `match_hr_law_chunks` RPC、templates の RLS
  （他テナントの mined テンプレが見えないこと）
- **E2E**: チャット空状態でチップ 6 件表示 → クリックで質問送信 →
  回答に出典リンクが表示される

## 11. マスタ登録

- `hr_law_sources` 初期データ（migration に含める）:
  最低賃金 / 社会保険料率 / 労働基準法改正 / 育児介護休業法 / 労働安全衛生
  （ストレスチェック関連）/ 36協定・時間外労働 / ハラスメント防止 / 障害者雇用 の 8 トピック
- `tenant_hr_assistant_templates` seed 20 件（mode 別: general 8 / labor_calc 6 /
  comment_review 3 / case_search 3）
- メニュー: 既存の hr-assistant サービス登録を流用（新規メニュー追加は
  SaaS 管理画面 `/saas_adm/hr-law-knowledge` のみ）

## 12. 成功指標

| 指標                                                     | 目標（リリース 3 ヶ月後）                   |
| -------------------------------------------------------- | ------------------------------------------- |
| テナント管理者の週次アクティブ利用率（WAU/契約テナント） | 40% 以上                                    |
| テンプレチップ経由の質問割合                             | 30% 以上（=「何を聞けるか」の障壁解消）     |
| 👍 フィードバック率（評価が付いた回答のうち）            | 80% 以上                                    |
| 法令ナレッジの鮮度                                       | 全 published 文書の fetched_at が 60 日以内 |

## 13. オープンクエスチョン

1. **GEMINI_API_KEY の本番設定** — OpenAI→Gemini 移行の残タスク。
   本機能は Gemini 前提のため先行して設定が必要
2. **SerpAPI の月間クォータ** — 週 8 トピック × 検索 1 回 = 月約 35 リクエスト増。
   現行プランの残量確認
3. 法令ナレッジの**全テナント共有**で問題ないか（本設計は共有前提。
   公開情報のみのため問題ない想定だが、業種別の絞り込みニーズが出たら
   `hr_law_sources` にカテゴリ列を追加して対応）
4. Edge Function 内で Gemini SDK を使うか REST 直叩きか
   （Deno 環境のため `@google/genai` の Deno 互換性を実装時に確認。
   非互換なら fetch で REST API を叩く）
5. ダッシュボードカード（Phase 3）の配置先 — /adm トップの既存カードグリッドの
   どの位置に入れるか（UX 判断）
