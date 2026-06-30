# 人材管理（社員管理・採用管理・勤怠管理）保守・最適化 実装計画（PRD）

> ロードマップ: `docs/feature-blocks-development-roadmap.md` 優先度7位（人材管理ブロック、既存機能の保守・最適化フェーズ）

## 1. 問題定義

社員管理・採用管理・勤怠管理は完成度が高いとされる既存ブロックだが、コードレビューの結果、保守性・パフォーマンス・セキュリティ・法令コンプライアンスの観点で対応が必要な問題が見つかった。3領域それぞれをcode-reviewerエージェントでレビューし、特に重大な指摘（勤怠管理のCRITICAL判定）は実コードを直接検証して確度を確認した。

## 2. 調査結果（重要度別）

### CRITICAL

**[勤怠] `overtime_alerts`テーブルへの書き込み経路が一切存在しない**
`src/`・`supabase/migrations/`・`supabase/functions/`を全文検索した結果、`overtime_alerts`へのINSERT文がコードベース上に1件も見つからなかった（SELECT/DELETEのみ）。`attendance/actions.ts`515〜525行目の`unresolvedCountByEmp`（未解決アラート件数）は常に0件を返す状態になっている可能性が高い。36協定の閾値超過アラートという法令コンプライアンス機能の中核が、実質的にサイレントに無効化されているリスクがある。

検証済み事実：`telework-end`Edge Function（`supabase/functions/telework-end/index.ts`126〜136行目）は`overtime_monthly_stats`を**DELETE**するのみ（キャッシュ無効化）で、`overtime_alerts`には触れない。`attendance/actions.ts`の`getMonthlyStats()`はキャッシュ欠如時に`work_time_records`から都度集計するフォールバックを持つため、月次合計表示自体は壊れていない（これはMEDIUM相当の性能課題に留まる、後述）。一方`overtime_alerts`には同種のフォールバックが存在せず、アラート生成自体が誰からも呼ばれていない。

**追加調査で判明（確定）**：このコードベースには残業管理の仕組みが2つ並行して存在する。
1. **旧システム**（`overtime_monthly_stats` + `overtime_alerts`、`attendance/actions.ts`のダッシュボードが参照）— `overtime_alerts`はテーブル定義・RLSのみで書き込みが無い
2. **新システム**（`monthly_overtime_closures` → `aggregate_monthly_closure()`関数 → `monthly_employee_overtime`、`detect_timecard_anomalies()`関数、`src/app/api/closure/`配下の締めワークフロー一式）— こちらは月次集計・打刻異常検出までは正しく機能しているが、**`closure_warnings`（締め警告）テーブルも同様に書き込み経路が無い**。つまり36協定の「時間超過」を検出してアラート化するロジックは、新旧どちらのシステムにも実装されていなかった。

ユーザー確認の結果、新システムに一本化し、`closure_warnings`への36協定アラート生成ロジックを新規実装する方針で進める（5章参照）。

### HIGH

| # | 領域 | 内容 | 該当箇所 |
|---|---|---|---|
| H1 | 勤怠 | 深夜跨ぎ勤務（夜勤）が一律エラーになる。`minutesBetween()`が`end < start`を即座に無効と判定し、22:00出勤〜翌6:00退勤等のCSV行が常にインポート不可 | `attendance/work-time-csv-parse.ts:98-103` |
| H2 | 勤怠 | 残業判定・日時パースロジックの単体テストが0件（法令・データ正確性に直結する境界値: 45h/60h/80hちょうど等） | `attendance/status.ts`, `work-time-csv-parse.ts` |
| H3 | 勤怠 | `buildEmployeeAttendanceRows`がテナントIDフィルタ無しで複数テーブルを集計（RLS依存）。数百〜千名規模テナントで線形に悪化 | `attendance/actions.ts:393-612` |
| H4 | 採用 | AI生成系アクション（`job-postings/actions.ts`の3関数）に利用回数制限が無く、`generateBrandedVariants`は最大4媒体分のGemini呼び出しを無制限に並列実行可能（コスト爆発リスク） | `job-postings/actions.ts:56,397,433` |
| H5 | 採用 | Gemini/SerpApi呼び出しにタイムアウト設定が無く、外部APIハング時にServer Actionが無期限に占有される | `offer-validation/actions.ts:33`, `lib/ai/gemini.ts` |
| H6 | 採用 | `recruitment-ai/actions.ts`で型定義が既に生成済みにも関わらず`as any`を多用（型チェックを意図的に握りつぶしている） | `recruitment-ai/actions.ts:153,185,205,245,282` |
| H7 | 採用 | 利用回数チェック→Gemini呼び出し→ログinsertの間にTOCTOU競合状態（並列リクエストで月次上限を超過しうる） | `recruitment-ai/actions.ts:88-96` |
| H8 | 社員 | Server Actionsにテナント所有権の再検証が無く、RLSのみに依存（defense-in-depthの欠如。`createAdminClient()`経由のRPCはRLSを完全にバイパスするため特に注意） | `organization/actions.ts`（全関数） |
| H9 | 社員 | 容量計算・部署ツリー構築・認証ユーザー作成のロールバックフローにテストが0件 | `organization/queries.ts`, `DivisionTree.tsx` |

### MEDIUM（抜粋、詳細は各レビューagentの報告を参照）

- 社員：`getEmployees()`にページネーション無し（1000名規模で性能劣化）／`deleteDivision`が非トランザクション
- 採用：プロンプトインジェクション対策が手薄／テストカバレッジ0／JSON.parse失敗時のエラーハンドリング不統一／`applyVariantToJobPosting`の複数DB更新が非トランザクション
- 勤怠：`overtime_monthly_stats`のキャッシュが常に空（性能上の無駄、機能は壊れていない）／`any`型ヘルパー`db()`の多用／CSV文字エンコーディングがUTF-8固定（Shift_JIS非対応）

### LOW
- 構造化ログ未整備（`console.*`のみ）／CSVエクスポートのインジェクション対策無し／軽微な型キャスト

## 3. 今回のスコープ（確定）

ユーザー確認の結果、今回は**CRITICAL（36協定アラート生成ロジックの新規実装＋新システムへの一本化）のみ**に着手する。HIGH 9件・MEDIUM・LOWは別途バックログとして保留する。

### 実装状況（2026-06-30）

| 項目 | 状態 | 実装 |
| --- | --- | --- |
| `detect_overtime_threshold_warnings()` | ✅ | `supabase/migrations/20260630100000_add_overtime_threshold_warnings.sql` |
| `aggregate_monthly_closure()` からの呼び出し | ✅ | 同上 |
| `closure_warnings.resolved_at` / `resolved_by` | ✅ | 同上 |
| `attendance/actions.ts` の `closure_warnings` 切替 | ✅ | `getMonthlyStats`, `buildEmployeeAttendanceRows`, `resolveAlert` 等 |

### HIGH 実装状況（2026-06-30）

| # | 内容 | 状態 |
| --- | --- | --- |
| H1 | 深夜跨ぎ CSV（`resolveWorkPeriodTimes`） | ✅ |
| H2 | 勤怠パース・status 単体テスト | ✅ `work-time-csv-parse.test.ts` |
| H3 | `buildEmployeeAttendanceRows` tenant_id 明示フィルタ | ✅ |
| H4 | 求人 AI 3関数の利用回数制限 | ✅ `lib/ai/usage-limit.ts` |
| H5 | Gemini / SerpApi タイムアウト | ✅ `gemini.ts` 120s、`offer-validation` 30s |
| H6 | `recruitment-ai/actions.ts` の `as any` 除去 | ✅ |
| H7 | AI 利用 TOCTOU 対策 | ✅ `try_consume_ai_usage` RPC |
| H8 | `organization/actions.ts` テナント所有権再検証 | ✅ |
| H9 | 容量計算ユニットテスト | ✅ `capacity-utils.test.ts` |

### MEDIUM / LOW 実装状況（2026-06-30 バッチ）

| # | 内容 | 状態 |
| --- | --- | --- |
| M1 | `deleteDivision` トランザクション化 | ✅ `delete_division_safe` RPC |
| M2 | `applyVariantToJobPosting` トランザクション化 | ✅ `apply_job_posting_variant` RPC |
| M3 | 勤怠 CSV Shift_JIS フォールバック | ✅ `decodeWorkTimeCsvBytes` |
| L1 | CSV エクスポート数式インジェクション対策 | ✅ `lib/csv.ts` + hr-kpi ExportButton |
| — | `getEmployees` ページネーション | ⬜ 別途（UI 改修が必要） |
| — | プロンプトインジェクション強化 / 構造化ログ | ⬜ バックログ継続 |

## 4. 確定した実装設計（36協定アラート生成ロジック）

### 4-1. 検出する閾値（法令根拠：労働基準法36条、働き方改革関連法 2019年4月施行の罰則付き上限規制）

| 区分 | 閾値 | 本実装での扱い |
|---|---|---|
| 月の上限（原則） | 45時間 | ✅ 検出する（`overtime_45h_exceeded`） |
| 単月の上限（特別条項時も超えられない） | 100時間未満 | ✅ 検出する（`overtime_100h_critical`） |
| 複数月平均（2〜6か月） | 80時間以内 | ✅ 検出する（`overtime_avg80h_exceeded`、直近で締め済みの月のみで平均、最大6か月） |
| 年間上限（原則） | 360時間 | ❌ 対象外（「協定年度」の開始月を定義するスキーマが現行に無いため。オープンクエスチョンとして後述） |
| 月45時間超は年6回まで | — | ❌ 対象外（同上の理由） |

### 4-2. 実装方式

`supabase/migrations/<ts>_add_overtime_threshold_warnings.sql`に新規関数`detect_overtime_threshold_warnings(p_closure_id uuid, p_tenant_id uuid)`を追加し、既存の`aggregate_monthly_closure()`関数の末尾から呼び出す（同一トランザクション内）。これにより`src/app/api/closure/[closure_id]/aggregate/route.ts`等のアプリケーションコードは変更不要（RPC呼び出し1点に集約されているため）。

```sql
-- 既存ロジック概要（実装時に正確なSQLを書く）
-- 1. 該当closure_idのmonthly_employee_overtimeから対象月の従業員ごとのtotal_overtime_hoursを取得
-- 2. closure_warnings から当該closure_idの既存行を削除（再集計時の冪等性）
-- 3. 45h超・100h以上を判定してINSERT
-- 4. 当該テナント・従業員の直近6か月分（year_month降順、closureが存在する月のみ）の
--    total_overtime_hoursを取得し平均を算出、80h超ならINSERT
```

`closure_warnings`には`resolved_at timestamptz`・`resolved_by uuid`カラムを追加する（同マイグレーション内、既存の旧`overtime_alerts`が持っていた「解決済みにする」運用を引き継ぐため）。

### 4-3. ダッシュボードの参照切り替え

`src/features/attendance/actions.ts`：
- `getMonthlyStats()`：締め済みの月は`monthly_employee_overtime`を参照するよう変更（`overtime_monthly_stats`参照を廃止）。未締めの当月は既存の`work_time_records`からのライブ集計フォールバックを維持
- アラート件数集計（502, 515, 624, 725, 894行目付近）：`overtime_alerts`参照を`closure_warnings`に置き換え、`resolved_at is null`で未解決件数を算出

旧テーブル（`overtime_monthly_stats`, `overtime_alerts`）は本実装では削除しない（データ移行・他参照箇所の有無を別途確認してから廃止判断する）。

## 5. オープンクエスチョン

1. 「協定年度」の開始月（4月始まり等）をテナント設定として持たせるか。年360時間・年6回の閾値検出はこれが定まるまで実装できない
2. `closure_warnings`に`resolved_at`を追加することの妥当性（既存の`closure_audit_logs`で「対応した」ログを残す設計の方が一貫するのではないか）
3. 旧テーブル（`overtime_monthly_stats`, `overtime_alerts`）の廃止タイミング
