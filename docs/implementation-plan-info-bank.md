# 社内AI情報バンク — 設計と実装記録（無料プラン前提の縮小版）

テナントが登録した社内資料**だけ**を対象に、テキスト検索と RAG 検索を自動で使い分けて回答する機能。
資料に無い質問は「情報がありません」と回答し、外部 Web は検索しない。

- ユーザー検索画面: `src/app/(tenant)/(tenant-users)/(info)/info_bank`（`/info_bank`）
- 資料管理画面: `src/app/(tenant)/(tenant-admin)/adm/(info)/info_bank_mnt`（`/adm/info_bank_mnt`）
- 実装: `src/features/info-bank/`

## 前提と縮小の方針

| 制約（無料プラン）                         | 対処                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Vercel の関数リクエスト本文は約 4.5MB まで | ブラウザから Supabase Storage へ**署名付き URL で直接アップロード**（50MB まで）                        |
| Vercel Hobby は関数の実行時間が短い        | 取り込みを 2 段階（抽出 → 埋め込みバッチ）に分け、1 回の呼び出しを短くする。ページに `maxDuration = 60` |
| Supabase Free: DB 500MB                    | 旧版は残さず**置換**（履歴・ロールバックなし）。1 チャンクあたり約 14KB が目安（下記）                  |

**対象外:** 版履歴・ロールバック、AI によるメタデータ提案、公開範囲、施行日/失効日、PowerPoint、OCR（スキャン画像のみの PDF）、Google ドライブ直接連携。
**Google Office:** 「ダウンロード → Microsoft Word/Excel」で書き出した docx/xlsx を登録する。`.gdoc` などのポインタファイルは案内メッセージを出して拒否する。

## 構成

### テーブル

- `info_bank_documents`: 資料。`revision`（公開中の版。0 = 未公開）と `pending_revision`（取り込み中の版）を持つ。メタデータは `title / category / tags / keywords / summary`。
- `info_bank_chunks`: 検索用チャンク。`embedding vector(1536)`（取り込み 1 段階目は NULL）。`revision` が `documents.revision` と一致するものだけが検索対象。
- Storage バケット `info_bank`（非公開・50MB）。ポリシーは作らず、アップロード・閲覧とも署名付き URL を使う。

### 権限

- 書き込みはすべて service_role（Server Action 内で `requireInfoBankAdmin()` が `appRole !== 'employee'` を確認）。`authenticated` には SELECT のみ。
- 従業員は公開済みの資料だけ見える。取り込み中の版の情報・エラー詳細・Storage パス・作成者は、列単位の権限で従業員から隠す。
- 検索 RPC は `SECURITY INVOKER`（RLS と `current_tenant_id()` が効く）。`anon` は実行不可。語は先頭 10 件・各 100 文字、件数は 1〜50 に制限。
- `publish_info_bank_revision()` は service_role 専用。

### 取り込みと改訂

1. `createUploadUrlAction` → ブラウザが Storage へ直接アップロード
2. `registerDocumentAction` / `registerRevisionAction` → `pending_*` にファイル情報を保存
3. `ingestExtractAction`: 本文抽出 → チャンク化 → embedding 無しで保存
4. `ingestEmbedBatchAction` を残件 0 まで繰り返す（64 件ずつ）。0 になったら `publish_info_bank_revision()` が 1 トランザクションで版を切り替え、旧版のチャンクを削除。旧ファイルは Storage から削除。
5. 途中で失敗しても旧版は公開されたまま。「再実行」で埋め込みの続きから再開できる（抽出はやり直さない）。

### 検索と回答

- `extractQueryTerms`: ひらがなと句読点で区切り、漢字・カタカナ・英数の連続を語にする（最大 8 語）。語が 1 つも取れなければ全文を 1 語とする。
- `runSearch`: 方式を明示（テキスト / RAG）した場合はその方式のみ。`auto` は有効チャンク 300 件未満ならテキスト、以上なら RAG を先に使い、0 件ならもう一方へ切り替えて統合（hybrid）。RAG の類似度が `INFO_BANK_MIN_SIMILARITY` 未満のヒットは捨てる。
- 回答: `gemini-2.5-flash`、`thinkingBudget: 0`、`tools` なし、JSON スキーマ出力。ヒット 0 件・`answerable=false`・引用なし・不正 JSON はすべて固定文言「情報がありません」。資料は `<doc>` で囲み、本文中の山括弧は全角化して境界を壊させない。

## テスト

| 種類                          | 場所                               | 実行                                                                                               |
| ----------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| 純関数・ロジック              | `src/features/info-bank/*.test.ts` | `npm test`                                                                                         |
| 取り込み〜改訂の統合（実 DB） | `ingest.integration.test.ts`       | 下記の環境変数を付けて実行。未設定ならスキップ                                                     |
| RLS / RPC / 権限              | `supabase/tests/info_bank_rls.sql` | `psql ... -f supabase/tests/info_bank_rls.sql`（最後に `ALL OK`。ROLLBACK するので DB に残らない） |

```bash
INFO_BANK_TEST_SUPABASE_URL=http://127.0.0.1:55421 \
INFO_BANK_TEST_SERVICE_ROLE_KEY=$(supabase status -o env | sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"$/\1/p') \
node --import tsx --test src/features/info-bank/ingest.integration.test.ts
```

## 運用上の注意・未解決事項

- **Gemini API の残高**: RAG 検索と回答生成は Gemini を使う。残高が尽きると（HTTP 402）、RAG・回答生成・資料の埋め込みが動かない。`auto` はテキスト検索へ切り替わるが、回答の文章生成はできない。
- **HNSW インデックス**: ベクトル検索はテナント内の厳密検索（`ORDER BY ... + 0`）にしているため、`info_bank_chunks_embedding_hnsw_idx` は使われない。1 チャンク約 6KB を占めるので、削除を検討する（DROP は承認が必要なため未実施）。
- **容量の目安**: 1 チャンクあたり約 14〜15KB（ベクトル + 本文 + トライグラム索引）。約 3 万チャンクで DB 500MB に近づく。改訂の取り込み中は旧版と新版が共存して一時的に増える。
- **質問の回数制限**: 1 人あたり直近 1 分で 5 回まで（`INFO_BANK_ASK_LIMIT_PER_MINUTE`）。`try_consume_info_bank_ask()` が `info_bank_ask_logs` で数え、同時実行は advisory lock で直列化する。確認自体に失敗したときは許可しない。1 日あたり・テナントあたりの上限は未実装（Gemini の API キーは全テナント共有なので、必要なら追加する）。
- **未対応のセキュリティ指摘**: `xlsx` 0.18.5 の既知の脆弱性（既存機能と共用のため別作業で更新）、docx/xlsx の zip 展開後サイズの事前検査。
- **メニュー配置**: `20261105100100_info_bank_menu.sql` は両方のサービスをカテゴリ「情報バンク」（クラス「便利ツール」配下）に置き、全テナントに有効化する。実画面で従業員・管理者それぞれのメニュー表示を確認すること。
- **類似度のしきい値**: `INFO_BANK_MIN_SIMILARITY = 0.55` は暫定値。実資料と質問で調整する。
- **本番反映**: migration 4 本（schema / menu / hardening / ask_rate_limit）は未適用。対象 DB を宣言して承認を取ってから `supabase db push` する。
