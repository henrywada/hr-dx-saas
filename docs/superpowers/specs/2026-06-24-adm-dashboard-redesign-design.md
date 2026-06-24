# /adm メインダッシュボード再設計

**Date:** 2026-06-24
**Status:** Approved

## 背景

現在の `src/app/(tenant)/(tenant-admin)/adm/page.tsx` は採用AI機能（AI生成チケット・求人原稿・公開中求人・組織健康度の4KPIと、AI採用インサイト/クイックアクションの2カラム）に特化した内容になっている。

ユーザーから提示されたモックアップ画像は、人事業務全体を俯瞰する総合ダッシュボード（在籍社員数・離職率などのKPI、サーベイ・ウェルビーイング、学習・成長、ツールボックスの4セクション構成）であり、これに完全に置き換える。

## スコープ

- `/adm` のメインパネルを画像のレイアウトに完全置換する（既存の採用AI中心の内容は削除）。
- 既存の集計済みクエリ（`hr-kpi` バンドル等）を最大限再利用する。
- 未実装機能は「準備中」表示とし、クリック不可にする。
- 新規実装は「今月入社」カウントのみ（既存 `fetchRetentionKpi()` への追加）。

## 構成

### 1. KPIカード行（4枚）

`KpiSummaryCard`（既存コンポーネント）を使用し、グリッドで4枚表示。

| カード | データソース | 実装 |
|---|---|---|
| 在籍社員数 | `fetchRetentionKpi().totalActiveEmployees` | 既存 |
| 今月入社 | `fetchRetentionKpi().hiredThisMonth`（新規追加） | 新規 |
| 離職率（年換算） | `fetchRetentionKpi().turnoverRatePercent` | 既存 |
| 採用中ポジション | `fetchRecruitKpi().openJobPostings` | 既存 |

**今月入社の集計ロジック：** `employees` テーブルの `hired_date` が当月（Asia/Tokyo基準）のレコード数。`fetchRetentionKpi()` 内に同テナントフィルタで追加する。

### 2. サーベイ・ウェルビーイング セクション（2×2カード）

各カードは「アイコン＋タイトル＋NEWバッジ＋説明文1行＋下部統計2項目」のレイアウト。`Card` コンポーネントをベースに新規セクションカードコンポーネントを作成する（`src/features/dashboard/components/DashboardSectionCard.tsx` 等）。

| カード | リンク先（`APP_ROUTES`） | 統計値 |
|---|---|---|
| パルスサーベイ | `ADMIN_TENANT_QUESTIONNAIRE` (`/adm/tenant_questionnaire`) | 回答率（`latestPulseResponseRate`）、eNPS（`latestPulseSurveyScore`） |
| スキル・能力向上 | `ADMIN_SKILL_MAP` (`/adm/skill-map`) | 研修完了率、資格取得状況（`fetchDevelopmentKpi()`） |
| 1on1/フォローアップ | `ADMIN_ONE_ON_ONE` (`/adm/one-on-one`) | 今月実施件数、未実施件数（`getImplementationRates()`） |
| ストレスチェック | `ADMIN_STRESS_CHECK_GROUP_ANALYSIS` (`/adm/stress-check/group-analysis`) | 実施率、高ストレス者数（`getGroupAnalysis()`） |

各カードに `NEW` バッジ（`Badge` コンポーネント、teal/primary variant）を表示する。

### 3. 学習・成長 セクション（2カード）

同じ `DashboardSectionCard` レイアウトを再利用。

| カード | リンク先 | 統計値 |
|---|---|---|
| eラーニング | `ADMIN_EL_COURSES` (`/adm/el-courses`) | 公開コース数、受講中件数、修了率 |
| アンケート（汎用） | `ADMIN_SURVEY` (`/adm/Survey`) | 実施中件数、平均回答率 |

### 4. ツールボックス セクション

グリッドレイアウト（既存 `QuickAccessCard` を流用、またはアイコン+ラベルのシンプルなタイルとして新規実装）。

タイル一覧（すべて未実装、`Badge`「準備中」付き、クリック無効化・カーソルdefault）：

- 残業代計算
- 36協定チェッカー
- 通知文テンプレ
- 有給残数計算
- 離職率シミュ
- 雇用契約書生成
- 賞与試算

末尾に「+ツールを追加」タイルを配置する。見た目のみのプレースホルダーで、クリックは無効化する（将来のカスタムツール追加機能用の予告表示）。

## データ取得方針

`page.tsx`（Server Component）から `src/features/hr-kpi/queries.ts` 等の既存 `queries.ts` 関数を呼び出し、結果を新規 Client/Server コンポーネントに props で渡す。新規 DB アクセスは行わない（`fetchRetentionKpi()` への集計項目追加のみ）。

## 影響範囲

- `src/app/(tenant)/(tenant-admin)/adm/page.tsx` — 全面書き換え
- `src/features/hr-kpi/queries.ts` — `hiredThisMonth` フィールド追加
- `src/features/dashboard/components/DashboardSectionCard.tsx` — 新規コンポーネント
- `src/features/dashboard/components/ToolboxGrid.tsx` — 新規コンポーネント（または既存 `QuickAccessCard` の流用）

既存の採用AI関連コンポーネント（インサイト・クイックアクション）は `/adm` のメインパネルからは削除するが、コンポーネント自体は他画面で使用されていなければ削除、使用されていれば残す（要確認のうえ実装時に判断）。

## テスト方針

- `fetchRetentionKpi()` の `hiredThisMonth` 集計に対する単体テスト（当月境界値、テナント分離）
- 新規ダッシュボードページの主要セクション表示に対するスナップショット/インテグレーションテスト
- 未実装ツールタイルがクリック不可であることの確認（E2Eまたはコンポーネントテスト）
