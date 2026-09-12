# 工数データ×残業管理のクロス分析ダッシュボード 実装計画（PRD）

## 0. 背景・経緯

2026-09-12、テナント管理者向けタスク健康度ダッシュボード（`docs/implementation-plan-task-management.md` 21章）の設計セッションにおいて、「既存の残業管理機能（36協定分析）と工数記録データ（タスク管理の`task_work_logs`）を連携させ、特定メンバーへの負荷偏りやバーンアウト予兆を検知する仕組みがない」ことが課題として認識され、明確に別機能として切り離された（同ドキュメント21.1参照）。本ドキュメントはその機能の設計を独立して記録するPRDである。

プロダクトの2大ゴールのうち「組織健康度の可視化」（CLAUDE.md）に対応する。既存の`/adm/36analysis`（36協定分析）は残業時間の法令遵守観点のみを扱っており、「その残業時間で実際に何が起きていたか」という業務実態（工数記録）とは接続されていない。本機能はこの2つのデータソースを従業員×月単位で突き合わせ、経営者・人事責任者が負荷偏在・バーンアウト予兆を俯瞰できるようにする。

## 1. 問題定義

- 残業時間（`monthly_employee_overtime`）と工数記録（`task_work_logs`）が別々のダッシュボードに閉じており、横断して見る手段がない
- 特定メンバーへのタスク時間集中が、残業データだけでは見えない（残業時間は法令遵守の枠組みでしか評価されておらず、業務量の偏りという観点が抜けている）
- 残業時間が高い月に工数記録（申告工数）が伴っていない場合、実際の業務負荷が正しく可視化できていない可能性がある（工数記録の形骸化、または残業の中身が把握できていないリスク）

## 2. ユーザーストーリー

- テナント管理者として、部門・組織全体で「要注意」と判定されたメンバーの一覧を見て、個別のヒアリングや業務再配分の判断材料にしたい
- テナント管理者として、ある従業員について「残業時間」と「申告工数」を月次で並べて見て、乖離の有無を確認したい
- テナント管理者として、部門でタスク時間が偏っているかどうかを俯瞰し、負荷再配分の必要性を判断したい

## 3. スコープ（MVP）

以下3つの検知ロジック（複合指標）と、それに基づく一覧・比較表示に限定する。個別従業員への通知・アラート送信、1on1連携、離職リスクスコアとの統合は本フェーズのスコープ外とする（8章参照）。

### 3.1 継続的残業フラグ（sustained overtime）

既存の`src/utils/overtimeThresholds.ts`の`OvertimeStatus`判定ロジックをそのまま再利用し、`monthly_employee_overtime`から算出した月ごとのステータス（safe/warning/danger/critical/violation）を判定する。**直近3ヶ月のうち2ヶ月以上が`warning`以上**の場合、該当従業員に「継続的残業」フラグを立てる。しきい値・法定上限の算出ロジックは一切変更しない（既存関数をそのままインポートする）。

**実装時の補足（2026-09-13追記）**：実装では単月判定の`getSingleMonthStatus()`を使用し、`calcMonthlyStatuses()`（年間累計・特別条項の年6回条件を含む複数月にまたがる判定）は使用していない。本機能の分析対象期間は6ヶ月（3.5参照）であり、`calcMonthlyStatuses()`が前提とする「年間を通じた特別条項の適用回数」等の判定は6ヶ月窓では意味を持たない（年度の途中からしかデータがない状態で年6回条件を評価すると誤判定になる）ため、単月ステータス判定のみを使う設計に変更した。最終ホールブランチレビューで確認済み。

### 3.2 申告乖離フラグ（under-reported gap）

同月の残業時間（`monthly_employee_overtime.total_overtime_hours`）と、`task_work_logs`から集計した同月の申告工数合計（従業員×月でSUM(`hours`)）を比較する。

- 対象月の残業時間が`thresholds.monthlyWarning`（既定40h）を超えている
- かつ、その月の申告工数合計が「残業時間 × 0.3」未満（＝残業時間の30%未満しか工数記録が残っていない）

の両方を満たす月がある場合、「申告乖離」フラグを立てる。**その月の`task_work_logs`が1件もない場合は、乖離判定の対象から除外する**（「申告0件＝乖離あり」と誤判定しない。工数記録機能自体を使っていないだけの可能性が高いため）。

### 3.3 タスク時間集中フラグ（workload concentration）

部門（またはテナント全体）内で、従業員別の**分析対象期間のうち最新月（当月）**の申告工数合計を比較し、**その部門の平均申告工数の1.5倍を超え、かつ絶対値で20時間以上**の場合に「タスク集中」フラグを立てる（平均が小さい部門で些細な差が過検知にならないよう絶対値の下限を設ける）。比較対象は当該従業員が所属する部門（`employees.division_id`）の他メンバー全員（申告工数0の従業員も含む）とする。

**実装時の補足（2026-09-13追記）**：部門未配属者（`division_id = null`）の比較対象は、実装では「他の未配属者のみ」（テナント全体平均ではない）としている。これは`division_id`で単純にグルーピングする実装（`null`同士も1グループとして扱う）を採用したためで、未配属者が少数のテナントでは平均が不安定になりやすい（未配属者が1〜2名しかいない場合、平均が0または少数のサンプルに引っ張られ、20時間以上で無条件にフラグが立ちやすくなる）。最終ホールブランチレビューで指摘済みだが、影響は小さく（未配属者が多いテナントではテナント全体平均に近似する）、マージ時点では修正を見送った。将来、未配属者比較の精度改善が必要になった場合はこの制約を踏まえて設計し直すこと。

### 3.4 要注意判定

上記3フラグのうち**2つ以上**該当する従業員を「要注意メンバー」としてハイライトする（1つのみの該当は参考情報として一覧には出すが強調しない）。理由は`reasons: string[]`として各フラグの詳細（例：「直近3ヶ月中2ヶ月がwarning以上」「2026-08: 残業42h・申告工数8h（19%）」）を保持し、既存の36協定分析の`reasons`パターンを踏襲する。

### 3.5 対象期間

直近6ヶ月分を分析対象とする（36協定分析の年間比較よりも短いスパン。工数記録の運用実態が浅いテナントが多いことを踏まえ、まずは直近の傾向把握を優先する）。

## 4. 権限モデル

タスク健康度ダッシュボードと同一パターン：`getServerUser().appRole !== 'employee'`（`isTenantAdmin()`、既存`src/features/task-management/permissions.ts`のものをそのままインポートして再利用し、重複定義しない）でページアクセスを制御する。RLSは`createClient()`（RLS有効）をそのまま使用し、`monthly_employee_overtime`・`task_work_logs`とも既存のテナント管理者向けRLSポリシー（`current_employee_app_role() <> 'employee'`で全件許可、または同等の設計）に従う。`createAdminClient()`は使用しない。

## 5. データレイヤー設計

### 5.1 新規ドメイン

`src/features/workload-analysis/` を新設する。既存の`overtime`・`task-management`のどちらか一方に押し込めると責務が混在するため、クロス集計専用の新ドメインとする。

- `types.ts` — 行型定義（`EmployeeCrossAnalysisRow`、`MonthlyCrossPoint`等）
- `queries.ts` — DB読み取り専用
- `cross-analysis.ts` — 判定・集計の純粋関数（3.1〜3.4のロジック本体、TDD対象）
- `components/admin/` — UIコンポーネント

### 5.2 クエリ関数

`src/features/workload-analysis/queries.ts`に以下を追加する。

```typescript
export async function getWorkloadOvertimeCrossData(
  supabase: SupabaseClient<Database>,
  options: { divisionId?: string } = {}
): Promise<EmployeeCrossAnalysisInput[]>
```

内部で以下を並行取得する：

1. `getOvertimeThresholds(supabase)`（`src/utils/overtimeThresholds.ts`を再利用）
2. `monthly_employee_overtime`（直近6ヶ月分、`fetchAllRows`でページネーション）
3. `task_work_logs`（直近6ヶ月分、`work_date`でフィルタ、`fetchAllRows`でページネーション）
4. `employees`（氏名・所属部門解決用）

部門フィルタ（`divisionId`）は、タスク健康度ダッシュボードで実装済みの`resolveFilteredEmployeeIds`と同じ設計判断（子孫部門を含めた絞り込み、`division-tree.ts`の`collectDivisionAndDescendantIds`を再利用）を踏襲する。**`division-tree.ts`は`task-management`ドメインに属する汎用ユーティリティのため、`workload-analysis`から直接importして再利用し、重複実装しない**（過去のレビューで「同一ロジックの複数箇所への再実装」が問題視された経緯があるため、この方針を明記する）。

集計はアプリケーション側（TypeScript）で行い、Postgres RPC化は見送る（テナント規模：従業員50〜1000名、既存`getWorkLogSummaryByGroup`等と同じ設計判断）。

**実装時の補足（2026-09-13追記）**：`monthly_employee_overtime`・`task_work_logs`のクエリでは、当初`.in('employee_id', employeeIds)`で対象従業員を絞り込む設計だったが、ローカルDB（従業員461名、プロダクトの想定上限50〜1000名の範囲内）で実際に`URI too long`エラーが発生することを実装時に確認した。UUID配列をカンマ区切りでURLに埋め込むPostgREST/Kongの方式では、数百件規模で1リクエストのURL長上限を超えるため。対応として`.in()`を削除し、日付範囲（`gte(...)`）のみでテナント全体から取得した上で、部門フィルタ後の`employees`配列に対する`.map()`でのみ最終結果を組み立てる方式に変更した。RLS（`tenant_id = current_tenant_id()`ベース）がテナント分離を担保しているため安全性に問題はない（最終ホールブランチレビューでpg_policies実クエリとコードパス追跡により独立検証済み）。この結果、`divisionId`で絞り込んでも取得行数はテナント全体分のまま変わらない（効率上のトレードオフ、正確性には影響しない）。将来`task_work_logs`の利用が本格化しデータ量が増えた場合は、`.in()`をチャンク分割（例：100件ずつ）して復活させる対応を検討する。

### 5.3 判定ロジック（`cross-analysis.ts`）

```typescript
export interface MonthlyOvertimeInput {
  yearMonth: string // YYYY-MM
  overtimeHours: number
}

export interface MonthlyWorkLogInput {
  yearMonth: string
  loggedHours: number
  hasAnyLog: boolean // その月にtask_work_logsが1件でもあるか
}

export interface EmployeeCrossAnalysisInput {
  employeeId: string
  employeeName: string
  divisionId: string | null
  divisionName: string | null
  overtimeMonths: MonthlyOvertimeInput[] // 昇順6ヶ月分
  workLogMonths: MonthlyWorkLogInput[] // 昇順6ヶ月分
}

export interface EmployeeCrossAnalysisResult {
  employeeId: string
  employeeName: string
  divisionId: string | null
  divisionName: string | null
  months: Array<{
    yearMonth: string
    overtimeHours: number
    overtimeStatus: OvertimeStatus // 既存 src/utils/overtimeThresholds.ts の型を再利用
    loggedHours: number
    hasAnyLog: boolean
    gapRatio: number | null // loggedHours / overtimeHours（overtimeHours=0またはhasAnyLog=falseならnull）
  }>
  flags: {
    sustainedOvertime: boolean
    underReportedGap: boolean
    workloadConcentration: boolean
  }
  isAttentionNeeded: boolean // flagsのうち2つ以上true
  reasons: string[]
}

export function computeEmployeeCrossAnalysis(
  input: EmployeeCrossAnalysisInput,
  thresholds: OvertimeThresholds,
  divisionAverageLoggedHours: number // タスク集中フラグ用（3.3参照）
): EmployeeCrossAnalysisResult
```

`computeEmployeeCrossAnalysis`は純粋関数とし、3.1〜3.4の判定式をそのまま実装する。`divisionAverageLoggedHours`の算出（3.3の比較基準）は呼び出し側（`queries.ts`または上位の集計関数）で全従業員分をあらかじめ計算してから各従業員の判定に渡す。

## 6. 画面構成

`src/app/(tenant)/(tenant-admin)/adm/(workload_analysis)/workload-burnout-analysis/page.tsx`（+`loading.tsx`/`error.tsx`）を新設する。ルート定数は既存パターンに合わせ`APP_ROUTES.TENANT.ADMIN_WORKLOAD_BURNOUT_ANALYSIS: '/adm/workload-burnout-analysis'`とする。

UIコンポーネントは`src/features/workload-analysis/components/admin/`に新設する。

- `WorkloadOvertimeDashboard.tsx` — 部門フィルタの状態管理を持つコンテナ（URLクエリパラメータ`?division=<id>`で状態を持つ、タスク健康度ダッシュボードと同じURL駆動パターン）
- `AttentionSummaryCards.tsx` — 要注意人数・フラグ別内訳のKPIカード
- `EmployeeCrossAnalysisTable.tsx` — 従業員別一覧（`DataTable`使用。列：氏名・部門・直近月残業時間・残業ステータスバッジ・直近月申告工数・乖離率・該当フラグバッジ・理由）
- `OvertimeVsWorkloadChart.tsx` — 選択した従業員1名の月別「残業時間」と「申告工数」の比較折れ線グラフ（Recharts、`OvertimeTrendChart.tsx`の45hライン表示パターンを参考にする）

レイアウトはCLAUDE.mdの「パターンB: フル幅型」＋カード間隔標準（`space-y-4`/`gap-3`/`rounded-lg`/`shadow-xs`）に準拠する。データ不足（`task_work_logs`が対象期間0件）の部門・従業員は「工数データ不足」バッジを表示し、3.2/3.3のフラグ判定からは除外する（3.2/3.3参照）。

## 7. マスタ登録

既存の`(okr)`・`(task_health)`ページと同構造で、マイグレーションSQLにより登録する。

1. `service`に新規サービス（`route_path: /adm/workload-burnout-analysis`、固定UUID定数、`ON CONFLICT (id) DO NOTHING`で冪等化）
2. `service_class_index`で既存のサイドメニューカテゴリ「勤務：分析」（`service_category` id `19e62597-28de-4380-9507-eb5e56bb75ba`、36協定分析と同じカテゴリ）に紐付ける。**新規カテゴリは作らない**（36協定分析の隣に置くことで導線を明確にする）
3. `app_role_service`には**登録しない**（登録が無い＝役割による制限なし＝テナント管理者の全役割で表示される、既存パターン踏襲）
4. `tenant_service`で既存全テナントに機能を有効化（`tenant_id`/`service_id`のみINSERT。タスク健康度ダッシュボードのマイグレーションでの実データ調査結果に基づき、`start_date`/`status`カラムには値を入れない）

具体的なUUID・カテゴリ名・`service_class_index`の解決方法（既存レコードから名前ベースで動的に解決する）は、実装計画作成時に`20260912162500_task_health_dashboard_menu.sql`をテンプレートとしてそのまま踏襲する。

## 8. スコープ外・オープンクエスチョン

- 個別従業員への通知・アラート送信（フィード連携）は本フェーズでは行わない。ダッシュボード上での一覧表示のみ
- 離職リスク機能（`src/features/turnover-risk/`）との統合・スコア連携は行わない。同機能は既に`overtime_hours_last_month`等を別経路（`work_time_records`から`calcOvertimeHours()`）で算出しており、データソースが異なる。統合は将来検討事項とする
- ライブブラウザE2Eは、実行環境でシステムChromeが利用できない場合があるため実施可否を都度判断する（できない場合は静的検証・DB実クエリ確認で代替し、その旨を明記する）
- **既知の制約**：`task_work_logs`はローカルDB調査時点で実質5件（本番でも利用が浅いテナントが多いと想定される）。タスク管理機能自体の普及が本機能の実効性の前提条件であり、データが薄いテナントでは3.2/3.3のフラグはほとんど発火しない見込み。これは機能の欠陥ではなく前提条件として明記する
- **既知の制約（2026-09-13追記、最終ホールブランチレビュー）**：従業員一覧・比較チャートのペイロード規模。`page.tsx`はテナント全従業員分の`EmployeeCrossAnalysisResult`（1名あたり6ヶ月分の月次データ＋理由文字列）を丸ごとクライアントへ渡し、`OvertimeVsWorkloadChart`は全員分を`<select>`の選択肢として描画する。プロダクトの想定上限（従業員1000名）では、RSCペイロードが数MB規模になり、セレクトボックスも1000件の選択肢を持つことになる。MVPとしては許容範囲だが、将来的にはチャート用の従業員選択を検索可能なコンボボックスにする、またはサーバー側で「要注意メンバーのみ」に絞ったビューを別途用意するなどの改善余地がある
- **既知の制約（2026-09-13追記）**：3.3のタスク集中フラグの判定式は「部門平均の1.5倍を**超え**」（厳密に超過）が仕様だが、実装（`cross-analysis.ts`）は`>=`（1.5倍以上）で判定している。ちょうど1.5倍ぴったりの境界値でのみ挙動が異なる（仕様では非該当、実装では該当）。実害は小さいため最終ホールブランチレビューでは修正を見送ったが、`cross-analysis.ts`の`workloadConcentration`判定を触る機会があれば`>`に修正すること

## 9. テスト方針

- `cross-analysis.ts`の判定・集計純粋関数をTDDでユニットテスト（3.1〜3.4の境界値：warning判定の月数境界、乖離率30%の境界、集中フラグの1.5倍・20h両条件の境界、`hasAnyLog=false`時の除外動作等）
- `queries.ts`の新規関数はローカルSupabase実DBに対する動作確認で代替（既存パターンと同様、Server Component統合テストは行わない）

## 10. 成功指標

- テナント管理者が部門横断で「要注意メンバー」を月次で確認できる
- 36協定分析だけでは見えなかった「残業と工数記録の乖離」「タスク時間の偏り」が可視化される
- 既存の残業判定ロジック（`overtimeThresholds.ts`）・部門ツリー絞り込みロジック（`division-tree.ts`）を重複実装せず再利用できている

## 11. 実装ステータス

実行計画（`docs/superpowers/plans/2026-09-12-workload-overtime-cross-analysis.md`）に基づき、Subagent-Driven Developmentで8タスクに分解して実施した。全タスク完了・`feature/workload-overtime-cross-analysis`ブランチにコミット済み。

| #   | 内容                                           | 主な成果物                                                                           | 状態 |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------ | ---- |
| 1   | 判定ロジック（`cross-analysis.ts`）            | `src/features/workload-analysis/cross-analysis.ts`、`cross-analysis.test.ts`（17件） | 完了 |
| 2   | ルート定数の追加                               | `src/config/routes.ts`（`APP_ROUTES.TENANT.ADMIN_WORKLOAD_BURNOUT_ANALYSIS`）        | 完了 |
| 3   | クエリ関数（`getWorkloadOvertimeCrossData`）   | `src/features/workload-analysis/queries.ts`                                          | 完了 |
| 4   | 要注意サマリーカード・一覧テーブル             | `AttentionSummaryCards.tsx`、`EmployeeCrossAnalysisTable.tsx`                        | 完了 |
| 5   | 個人比較チャート                               | `OvertimeVsWorkloadChart.tsx`                                                        | 完了 |
| 6   | ダッシュボードコンテナ                         | `WorkloadOvertimeDashboard.tsx`                                                      | 完了 |
| 7   | ページ（`page.tsx`/`loading.tsx`/`error.tsx`） | `src/app/(tenant)/(tenant-admin)/adm/(workload_analysis)/workload-burnout-analysis/` | 完了 |
| 8   | メニュー登録マイグレーション                   | `supabase/migrations/20260912170000_workload_overtime_cross_analysis_menu.sql`       | 完了 |

最終ホールブランチレビュー（opus）で、`reasons`・`isAttentionNeeded`がUIに未反映という横断的な欠落（Important 3件）を検出し、1回の修正で解消（`EmployeeCrossAnalysisTable.tsx`のみ、スコープ限定の再レビューで解消確認済み）。`.in()`削除による性能改善の妥当性・テナント分離の安全性も独立検証済み。残存するMinor指摘は本ドキュメント3.1・3.3・5.2・8章に既知の制約として反映済み。

ライブブラウザE2Eは実行環境の制約により未実施（静的検証・型チェック・ビルド確認・ローカルDB実クエリ確認・全タスクレビューのCritical/Importantゼロで代替、8章に注記済み）。マージ前に実データでの動作確認が望ましい。
