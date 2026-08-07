# 助成金情報配信（Grant Notifier）

**ステータス:** 実装完了（2026-08-07） / **移植元:** dx-toolbox `tools/grant-notifier` + `apps/web/src/app/grant-notifier`

---

## 1. 問題定義

日本の中小企業（従業員50〜1000名）では、雇用・育成・設備投資に使える助成金が国・自治体から多数公開されているにもかかわらず、以下の理由で取りこぼしが常態化している。

- 情報源が分散しており（J-グランツ、各省庁、自治体）、定期的に巡回する担当者がいない
- 助成金の要件は暗黙的な記述が多く、自社が対象かどうかの判断に専門知識と時間がかかる
- 締切を過ぎてから存在を知る

IT部門に余裕のない中小企業ほどこの傾向が強く、HR-DX のペルソナ（中小企業の経営者・人事責任者）と完全に重なる。

## 2. ユーザーストーリー

| #   | 役割         | ストーリー                                                                               |
| --- | ------------ | ---------------------------------------------------------------------------------------- |
| 1   | 人事責任者   | 自社の業種・所在地・従業員数を一度登録すれば、条件に合う助成金が毎週メールで届いてほしい |
| 2   | 人事責任者   | 「なぜ自社が対象なのか」の判定理由を読んで、深追いするか即座に判断したい                 |
| 3   | 人事責任者   | 過去に届いたメールを後から読み返したい（担当者の引き継ぎ時など）                         |
| 4   | メール受信者 | 不要になったら、ログインせずワンクリックで配信を止めたい                                 |
| 5   | SaaS運営者   | 収集・判定・配信バッチが動いているか、AI コストがいくらか横断で把握したい                |
| 6   | SaaS運営者   | バッチが失敗したとき、ステップ単位で手動再実行したい                                     |

## 3. 要求と優先度

| 優先度 | 要求                                                              | 実装状況                         |
| ------ | ----------------------------------------------------------------- | -------------------------------- |
| Must   | J-グランツAPI から募集中の助成金を週次収集し、更新を検知する      | ✅                               |
| Must   | テナント条件 × 助成金を AI が適合判定（適合／要確認／不適合）     | ✅                               |
| Must   | 適合・要確認をダイジェストメールで週次／月次配信、重複送信しない  | ✅                               |
| Must   | テナント分離（RLS）— 他社の条件・判定・配信履歴が一切見えない     | ✅                               |
| Must   | 署名付きトークンによる、ログイン不要の配信停止                    | ✅                               |
| Must   | SaaS運営者向けのバッチ稼働監視と手動再実行                        | ✅                               |
| Should | 過去配信メールの原文アーカイブ                                    | ✅                               |
| Should | AI 利用コストのテナント別記録                                     | ✅                               |
| Could  | 申請進捗ステータス管理（検討中／申請準備／申請済み／見送り）      | スキーマのみ先行（画面は未実装） |
| Could  | 自治体サイトのクロール収集（`grant_sources.source_type='crawl'`） | スキーマのみ先行                 |
| Won't  | 申請書類の自動作成・提出代行                                      | 対象外                           |

## 4. データモデル

すべて `public` スキーマ、`grant_` 接頭辞（既存の `hr_law_*` と同じ規約）。マイグレーション: `supabase/migrations/20260807022514_grant_notifier.sql`

### 横断マスタ（tenant_id なし）

収集はテナント横断で1回のみ実施するため、テナント列を持たない。書込は collect バッチ（service_role）のみで、**authenticated 向けの書込ポリシーを敢えて定義しない**ことで一律拒否する。

| テーブル         | 役割                                                                       |
| ---------------- | -------------------------------------------------------------------------- |
| `grant_sources`  | 収集ソースマスタ（`url` UNIQUE、`last_fetched_at` で稼働監視）             |
| `grants`         | 助成金マスタ（`normalized_key` UNIQUE で重複排除、`body_hash` で更新検知） |
| `grant_versions` | 更新履歴（`change_summary` は AI 生成）                                    |

### テナント固有（tenant_id + RLS 必須）

| テーブル                   | 役割                                                            | 書込権限                                   |
| -------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| `grant_tenant_conditions`  | 配信条件（テナントにつき1件）                                   | テナント管理者（`app_role <> 'employee'`） |
| `grant_match_results`      | AI 適合判定（`(tenant_id, grant_id)` UNIQUE、不適合も全件保存） | match バッチのみ                           |
| `grant_deliveries`         | 配信履歴（`(tenant_id, grant_id)` UNIQUE で重複送信を防止）     | deliver バッチのみ                         |
| `grant_application_status` | 申請進捗（先行実装）                                            | 自テナントのメンバー                       |

### 運用監視（SaaS管理者のみ閲覧）

| テーブル           | 役割                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| `grant_batch_runs` | ステップ別の実行履歴（`step` / `status` / 所要時間 / 処理件数 / エラー） |
| `grant_llm_usage`  | AI トークン使用量とコスト（`tenant_id` は collect 時 NULL）              |

### 設計判断

- **PG enum ではなく text + CHECK 制約** を使う（`hr_law_documents.status` と同じ既存規約に合わせ、値の追加をマイグレーションで容易にする）
- RLS のテナント判定は既存の `public.current_tenant_id()`、SaaS管理者判定は `public.current_employee_app_role() = 'developer'` を再利用する
- 配信アーカイブは `sent_at` の一致で1通のメールを識別する。そのため `recordDeliveries` は行ごとの `now()` ではなく、呼び出し側が決めた単一の時刻を全行に書き込む

## 5. アーキテクチャ

```
GitHub Actions cron（毎週月曜 7:00 JST）
  └→ POST /api/grant-notifier/run-batch  （x-cron-secret 認証）
        └→ runGrantNotifierBatch(['collect','match','deliver'])
              ├─ collect : J-グランツAPI → grants upsert → 更新時は AI 要約 → grant_versions
              ├─ match   : 条件×助成金 → ルール絞込（地域）→ AI 判定 → grant_match_results
              └─ deliver : 未配信の適合/要確認 → ダイジェスト生成 → SMTP 送信 → grant_deliveries
```

各ステップは `grant_batch_runs` に開始・終了を記録する。**あるステップが失敗しても後続は実行する** — collect が落ちても既存データで match / deliver は成立し、次回起動で collect がやり直されるため。

### 配置ルール

| 種別                   | パス                                                                   |
| ---------------------- | ---------------------------------------------------------------------- |
| テナント管理者画面     | `src/app/(tenant)/(tenant-admin)/adm/(grant_notifier)/grant-notifier/` |
| SaaS管理者画面         | `src/app/(saas-admin)/saas_adm/grant-notifier/`                        |
| 公開ページ（配信停止） | `src/app/p/grant-notifier/unsubscribe/`                                |
| バッチ起動 API         | `src/app/api/grant-notifier/run-batch/`                                |
| 機能ドメイン           | `src/features/grant-notifier/`                                         |

### dx-toolbox からの主な変更点

| 項目                           | dx-toolbox                                 | hr-dx-saas                                                                               |
| ------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| DB                             | `grant_notifier` / `platform` 専用スキーマ | `public` + `grant_` 接頭辞                                                               |
| LLM                            | Anthropic Claude                           | Gemini（`src/lib/ai/gemini.ts`、`gemini-2.5-flash`）                                     |
| メール                         | AWS SES                                    | nodemailer SMTP（`src/lib/mail/send.ts`）                                                |
| バッチ起動                     | GitHub Actions → pnpm スクリプト直実行     | GitHub Actions → API Route                                                               |
| HTML抽出                       | `node-html-parser`                         | `cheerio`（既存依存）                                                                    |
| UI                             | 独自 UI コンポーネント                     | HR-DX Design System + Tailwind                                                           |
| SESバウンス Webhook            | あり（`platform.mail_events`）             | **対象外**（SES を使わないため）                                                         |
| 汎用 `/admin` の課金・登録集計 | あり                                       | **対象外**（`/saas_adm/tenants` が既に担当。「助成金情報配信以外はコピーしない」に従う） |

### Gemini 移植時の重要な注意

Gemini 2.5 系は既定で thinking が有効で、**思考トークンが `maxOutputTokens` を食い潰して応答が MAX_TOKENS で途中終了する**（検証時は 1024 のうち 980 を思考が消費し、JSON が途中で切れた）。そのため `batch/llm.ts` では既定で `thinkingConfig: { thinkingBudget: 0 }` を指定している。あわせて、**思考トークンも課金対象の出力トークン**であるため `candidatesTokenCount + thoughtsTokenCount` をコスト計算に用いる。

## 6. マスタ登録

同一マイグレーション内で `public.service` に2件登録する。

| サービス名                | カテゴリ                       | `target_audience` | `route_path`               |
| ------------------------- | ------------------------------ | ----------------- | -------------------------- |
| 助成金情報配信            | 便利ツール／ツールボックス     | `adm`             | `/adm/grant-notifier`      |
| 助成金情報配信 バッチ管理 | SaaS管理メニュー／SaaS：その他 | `saas_adm`        | `/saas_adm/grant-notifier` |

- テナント側は `tenant_service` への割当が必須（既存の「自動検索・配信ルール設定」と同じテナントにコピー）
- `app_role_service` には登録しない = 役割による制限なし（`AppSidebar` は登録が無いサービスを全役割に表示する）
- SaaS側は `target_audience='saas_adm'` + `release_status='公開'` のみで表示されるため割当不要

### ⚠ カテゴリ UUID をハードコードしないこと

`service_category` / `service` は**同じカテゴリでも環境ごとに `id` が異なる**。ローカルで読み取った UUID をマイグレーションへ直書きすると、本番適用時に外部キー制約違反で失敗する（2026-08-07 の `supabase db push` で実際に発生: `service_service_category_id_fkey` / SQLSTATE 23503）。

そのため本マイグレーションは、既存サービスの **`route_path` を手がかりにカテゴリを解決する** DO ブロックを使う。

| 対象                       | 解決順序                                                                |
| -------------------------- | ----------------------------------------------------------------------- |
| テナント管理者向けカテゴリ | ① `/adm/auto-distribution` のカテゴリ → ② カテゴリ名 `ツールボックス`   |
| SaaS管理者向けカテゴリ     | ① `/saas_adm/hr-law-knowledge` のカテゴリ → ② カテゴリ名 `SaaS：その他` |
| `tenant_service` の割当元  | `/adm/auto-distribution` のサービス                                     |

いずれも解決できない環境では `RAISE WARNING` を出して**メニュー登録だけをスキップ**し、テーブル本体の作成は成功させる（運用者が手動登録できるようにする）。新設する2つの `service.id` のみ環境間で揃えるため定数として保持し、`ON CONFLICT (id) DO NOTHING` で冪等にしている。

**今後この種の同期マスタへ追記する際は、必ず名前や `route_path` から解決すること。**

## 7. 環境変数

| 変数                                              | 用途                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| `JGRANTS_API_BASE_URL`                            | J-グランツAPI ベースURL（公開API・APIキー不要）                          |
| `GRANT_NOTIFIER_CRON_SECRET`                      | cron 認証。GitHub Actions Secrets と Vercel の両方に同じ値               |
| `UNSUBSCRIBE_SECRET`                              | 配信停止トークンの HMAC 署名鍵。**変更すると既存リンクが全て無効になる** |
| `GEMINI_API_KEY` / `NEXT_PUBLIC_APP_URL` / SMTP系 | 既存を流用                                                               |

GitHub Actions 側には加えて `APP_URL` が必要。

## 8. 成功指標

| 指標                 | 目標                                                                |
| -------------------- | ------------------------------------------------------------------- |
| 条件設定率           | 機能を契約したテナントの 70% が3ヶ月以内に条件を設定                |
| メール開封後の遷移率 | 配信メールから公式ページ or アーカイブへの遷移 15%                  |
| AI 判定の精度        | 「適合」判定のうち、人事責任者が「検討に値する」とした割合 60% 以上 |
| 運用コスト           | 1テナントあたりの AI コスト 月額 $0.50 未満                         |
| バッチ成功率         | 週次バッチの成功率 95% 以上                                         |

参考値: 実測で助成金105件収集 → ルール絞込32件 → AI 判定コスト **$0.034**（32件、gemini-2.5-flash、思考無効）。1テナント月4回で約 $0.14。

## 9. 検証済み事項（2026-08-07、ローカル環境）

- collect: J-グランツAPI から実際に **105件** 収集、`grant_batch_runs` に success 記録
- match: 地域ルールで 105→32件 に絞込、AI 判定 32件（要確認9 / 不適合23）、失敗0件
- deliver: 9件のダイジェストメール1通を送信、Mailpit で受信確認（件名「【助成金情報】新着9件のお知らせ」）
- 冪等性: deliver 再実行で送信0通・skipped 1（重複送信なし）
- 配信停止: 正しいトークンで `notify_emails` から該当アドレスのみ削除。改ざんトークン・トークン無しは拒否
- RLS: 別テナントのユーザーから `grant_tenant_conditions` / `grant_match_results` / `grant_deliveries` が 0件、SaaS専用の `grant_batch_runs` / `grant_llm_usage` も 0件、横断マスタ `grants` のみ 105件閲覧可
- 権限境界: テナント管理者(hr)が `/saas_adm/grant-notifier` にアクセスすると `/top` へリダイレクト
- 画面: `/adm/grant-notifier`（ホーム・条件・アーカイブ・詳細）、`/saas_adm/grant-notifier`、`/p/grant-notifier/unsubscribe` の全6画面が実データで HTTP 200

## 10. オープンクエスチョン

1. **Vercel の実行時間上限** — `maxDuration = 300` を設定済みだが、テナント数が増えると match の AI 呼び出しで超過しうる。超過時は cron を collect / match / deliver の3回に分割する（API は `{"steps":[...]}` で対応済み）。将来的にはテナントを分割して並列実行する設計変更が必要。
2. **収集ソースの拡張** — 現状は J-グランツのみ（国の補助金中心）。都道府県・市区町村の助成金は `source_type='crawl'` で追加する想定だが、`structure_hash` による HTML 構造変更検知の実装は未着手。
3. **配信頻度の起点** — 月次は「当月未配信なら送る」判定のため、月初の実行タイミングによってはその月の配信が月末近くになりうる。
4. **申請進捗ステータスの画面** — `grant_application_status` テーブルは用意済みだが画面が無い。需要が確認できてから実装する。
5. **メール送信の到達性** — nodemailer + SMTP のため、SES のようなバウンス・苦情の自動追跡ができない。配信量が増えた段階で送信基盤の見直しが必要。
6. **AI 判定の再評価** — 一度判定した `(tenant_id, grant_id)` はコスト抑制のため再判定しない。テナントが条件を大きく変更した場合、既存の判定は古いままになる。条件更新時に該当テナントの判定を破棄する仕組みが将来必要。
