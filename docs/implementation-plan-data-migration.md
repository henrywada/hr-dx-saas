# 他システムデータ移行

**ステータス:** 実装済み（2026-08-14）

---

## 1. 問題定義

他システム（協会けんぽ系健診 CSV・従業員 TSV・職業性ストレス簡易調査票 57 問）で運用していたテナントを HR-DX へ切り替えるとき、組織・従業員・過去の健診結果・ストレスチェック結果を手入力で移すと欠落と工数が大きい。SaaS 管理者が移行先テナントを指定し、固定フォーマットの CSV を一括取込できる必要がある。

テナント HR 向けの健診 CSV 取込（`/adm/health-check`）は継続運用用として残し、本機能は初期移行（マスタ＋履歴）を担う。

## 2. ユーザーストーリー

| #   | 役割         | ストーリー                                                                         |
| --- | ------------ | ---------------------------------------------------------------------------------- |
| 1   | SaaS 管理者  | 移行先テナントを選んで、他システムの CSV をまとめて取り込みたい                    |
| 2   | SaaS 管理者  | 確定前に件数・エラー・社員番号の突合結果を確認し、誤ったテナントへ書き込みたくない |
| 3   | テナント人事 | 移行後、組織ツリー・従業員一覧・健診管理・ストレス集団分析で過去データが見える     |
| 4   | 従業員       | 移行後、仮パスワードでログインし、自分の健診・ストレス結果を確認できる             |

## 3. 要求と優先度

| 優先度 | 要求                                                                     | 実装状況 |
| ------ | ------------------------------------------------------------------------ | -------- |
| Must   | SaaS 管理者のみ。移行先 `tenant_id` を明示して書き込む                   | 済       |
| Must   | `employee.csv` → `divisions` + `employees`（ログインあり・仮パスワード） | 済       |
| Must   | `kenshin1` / `kenshin2` / `monshin` → 既存健診取込コアで保存             | 済       |
| Must   | `stress-check.csv` の 57 問回答 → responses / submissions / results      | 済       |
| Must   | プレビュー後に確定。再実行は upsert（上書き）                            | 済       |
| Must   | 他テナントを汚さない（admin client でも `tenant_id` 必須）               | 済       |
| Should | エラー行スキップして取込                                                 | 済       |
| Won't  | 招待メール送信                                                           |          |
| Won't  | `name-kana` / `birth` のスキーマ追加                                     |          |
| Won't  | xlsx 対応・汎用 CSV マッパー・勤怠移行                                   |          |

## 4. データモデル

新規テーブルは作らない。既存テーブルへマッピングする。

| 入力             | 保存先                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 組織１〜４       | `divisions`（`layer` / `parent_id`）                                                                                                                  |
| employee.csv     | `employees`（`user_id` 付き・CSV `mailadress` でメール確認済み、`app_role=employee`、`active_status=active`） / `auth.users`（仮パスワード `aaaaaa`） |
| 健診 3 ファイル  | `health_check_institutions` / `campaigns` / `records` / `item_results`                                                                                |
| stress-check.csv | `stress_check_periods` / `period_divisions` / `responses` / `submissions` / `results`                                                                 |

一意キー（アプリ側）:

- 従業員: テナント内 `employee_no`（DB UNIQUE なし。SELECT 後 INSERT/UPDATE）
- 健診: `(campaign_id, employee_id)`
- ストレス: `(period_id, employee_id)` および回答 `(period_id, employee_id, question_id)`

## 5. 配置ルール

| 種別     | パス                                                          |
| -------- | ------------------------------------------------------------- |
| ドメイン | `src/features/data-migration/`                                |
| 画面     | `src/app/(saas-admin)/saas_adm/(base_mnt)/data-migration/`    |
| ルート   | `APP_ROUTES.SAAS.DATA_MIGRATION` = `/saas_adm/data-migration` |
| メニュー | `service.target_audience = 'saas_adm'`                        |

データアクセス: `page.tsx` → `queries.ts`（テナント一覧）。書込は `actions.ts`（`createAdminClient`、SaaS 管理者ガード）。健診の値変換は `src/features/health-check/csv-import-core.ts`。

## 6. マスタ登録

`service` に SaaS 管理者向け「データ移行」を 1 件追加する（`/saas_adm/hr-law-knowledge` と同じカテゴリ）。`tenant_service` への割当は不要（SaaS メニュー）。

## 7. 成功指標

- サンプル（従業員 439 / 健診 439 / ストレス 171）を指定テナントへプレビュー→確定できる
- 再実行で件数が二重に増えない
- 他テナントの `employees` 件数が変わらない
- ストレス結果画面用に 57 問の `stress_check_responses` が残る

## 8. オープンクエスチョン（v1 の決定）

- ログイン: 新規従業員は CSV の `mailadress` で `create_auth_user` し、仮パスワードは `aaaaaa`。招待メールは送らない
- カナ・生年月日: 保存しない（カラム無し）
- 同意: 移行ストレスは `consent_to_employer=true`（人事が既に結果を保有している前提）
