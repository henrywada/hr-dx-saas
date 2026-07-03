# 経営者向け統合エグゼクティブサマリーの拡張 設計書（PRD）

> 施策1（離職リスク）・施策2（エンゲージメントアラート）・施策3（1on1コンディションサマリー）で構築した
> 「検知→通知」のシグナルを、経営者・人事責任者が1画面で横断確認できる新規ダッシュボードに統合する。
> 施策優先度リスト（2026-07-02 競合分析セッション）の施策4に対応。

---

## 問題定義

施策1〜3により、離職リスクの高スコア遷移・部署エンゲージメントのalert遷移・1on1未実施状況について「検知→メール通知」の仕組みは整った。しかし各機能は `/adm/turnover-risk`・`/adm/engagement`・`/adm/one-on-one` という別々のページに孤立している。

> **訂正（実装時に判明）**：当初この節では「`/adm/turnover-risk` と `/adm/engagement` はサイドメニュー未登録でアプリ内導線が存在しない」としていたが、実装時にローカルDBを直接確認したところ**誤りだった**。両者は既に `service_category`「サーベイ・分析 > AI・分析」に `/adm/hr-kpi` と同じカテゴリで登録済みで、`app_role_service`（`hr`/`hr_manager`/`developer`/`test`）・`tenant_service` も設定済みだった（マイグレーションファイル名に "turnover-risk"/"engagement" を含む2件だけを検索し、実際の一括登録マイグレーションを見落としたための誤判定）。そのためメニュー未登録の是正は本施策のスコープから除外し、新規ページの登録のみを行う（詳細は「マスタ登録」節を参照）。

一方 `/adm/hr-kpi`（横断KPIダッシュボード、P1-D）は既に存在するが、採用・定着・生産性・エンゲージメント・育成の数値タイルを並べるのみで、「今すぐ見るべき異常はどれか」を伝える設計になっていない。経営者が毎回開けば「組織の今」が分かる、シグナル統合型の入口画面が存在しないことが最大のギャップである。

## プロダクト2大ゴールとの対応

- **組織健康度の可視化**：離職リスク・エンゲージメントアラート・1on1未実施の3シグナルと横断KPIの要点を1画面に統合し、経営者・人事責任者が能動的にダッシュボードを開けば「今の組織状態」を把握できる唯一の入口を作る。施策1〜3で実装した個別の「気づき」を、経営層向けに束ねる最後のピース。
- **コミュニケーションを大切にするシステム**：ハイライトされた項目からワンクリックで各詳細画面（施策1〜3のダッシュボード）に遷移し、1on1・面談等の対話アクションにつなげる導線を提供する。

## ユーザーストーリー

- 経営者として、月初に1画面を開くだけで「今どこに注意を払うべきか」（離職ハイリスク者・エンゲージメントalert部署・1on1未実施者）が一目で分かるようにしたい。
- 人事責任者として、3つのシグナルを別々のページを回遊せずに1箇所で確認し、優先度の高いものから各詳細ページへドリルダウンしたい。
- 経営者として、月次役員会議の資料としてこの画面の数値をCSVでエクスポートしたい。
- （非対象）通知を受けた後の詳細な原因分析・対応ログ記録（1on1実施記録、離職リスクのアクションログ等）は既存の各ダッシュボードで行う。エグゼクティブサマリーは「気づきの起点」であり、各機能を重複実装しない。

## 権限モデル

`ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']`（既存の `/adm/hr-kpi`・`/adm/turnover-risk`・`/adm/engagement`・`/adm/one-on-one` と同一）。テナント管理者向け機能全体の権限モデルの一貫性を優先し、経営層限定には絞らない（ヒアリングで確認済み）。

> **訂正（実装時に判明）**：`app_role` マスタには `'tenant_admin'` という値の行は存在しない（実データは `employee, hr, hr_manager, company_doctor, company_nurse, hsc, developer, test` の8種）。ページ側の `ALLOWED_ROLES` 配列に含まれる `'tenant_admin'` は実質的に一致しない防御的な値であり、実際に管理者権限を持つのは `hr` / `hr_manager` である。メニュー登録（`app_role_service`）は既存の `/adm/hr-kpi` 等と同じ実データパターンに合わせ `hr, hr_manager, developer, test` に付与する。

## データモデル

**新規テーブルは不要。** 離職リスク（`turnover_risk_scores`）とエンゲージメント（`engagement_department_scores`）は施策1・2で既に時系列スナップショットとして蓄積されており、本施策は既存クエリの読み取り専用集約で完結する。

| ソース | 関数 | 用途 |
| --- | --- | --- |
| 横断KPI | `getHrKpiBundle()`（`src/features/hr-kpi/queries.ts`） | 採用・定着・生産性・エンゲージメント・育成の月次KPI |
| 離職リスク | `getTurnoverRiskSummary()`（`src/features/turnover-risk/queries.ts`） | `highCount` / `mediumCount` / `lowCount` / `lastCalculatedAt` |
| エンゲージメント + 1on1 | `getEngagementDashboardData()`（`src/features/engagement/queries.ts`） | `departments[].status` から `alert` 件数を集計。`growthKpi.oneOnOneOverdueCount` に1on1未実施数が既に含まれる |

`getEngagementDashboardData()` は内部で既に `getHrKpiBundle()` と `getOneOnOneDashboardData()` を呼び出し `growthKpi` に統合しているため、**1on1シグナルのための個別クエリ追加は不要**。ただし `getHrKpiBundle()` を `getExecutiveSummary()` からも直接呼ぶと同一リクエスト内で2回実行されるため、冗長ではあるが既存の `adm-dashboard` / `engagement` 間でも同型の重複が既に存在する（許容範囲、キャッシュ最適化は将来課題とする）。

新規に追加する軽量集約関数：

```typescript
// src/features/executive-summary/queries.ts
export async function getExecutiveSummary(): Promise<ExecutiveSummaryData> {
  const [kpiResult, turnoverRiskSummary, engagementData] = await Promise.all([
    getHrKpiBundle(),
    getTurnoverRiskSummary(),
    getEngagementDashboardData(),
  ])
  // ExecutiveSummaryData に整形して返す
}
```

## 配置（CLAUDE.md ルートグループ準拠）

```
src/features/executive-summary/
├── queries.ts                        # 新規：getExecutiveSummary()
├── types.ts                          # 新規：ExecutiveSummaryData, AlertHighlight 等
├── csv-utils.ts                      # 新規：CSVエクスポート用整形（hr-kpi/csv-utils.ts を参考）
└── components/
    ├── ExecutiveSummaryDashboard.tsx     # 全体レイアウト
    ├── AlertHighlightPanel.tsx           # 3シグナルのハイライトカード（0件時はグリーン表示）
    ├── KpiHeadlineSection.tsx            # 横断KPIの要点抜粋
    └── ExportButton.tsx                  # CSVエクスポート（hr-kpi/ExportButton.tsx を流用）

src/app/(tenant)/(tenant-admin)/adm/(executive_summary)/executive-summary/
├── page.tsx     # ALLOWED_ROLES チェック + getExecutiveSummary() 呼び出し（turnover-risk/page.tsx と同型）
├── loading.tsx
└── error.tsx

supabase/migrations/
└── <timestamp>_add_executive_summary_service_master.sql   # メニュー登録（新規）
```

`src/config/routes.ts` に追加：

```typescript
/** 経営者向け統合エグゼクティブサマリー（施策4） */
ADMIN_EXECUTIVE_SUMMARY: '/adm/executive-summary',
```

## 画面設計

- レイアウトはパターンA（コンテンツ幅制限型、`max-w-[1200px]`）。情報系ダッシュボードのため。
- **上部：要対応ハイライトパネル**（`AlertHighlightPanel`）— 3シグナルを赤（要対応あり）/グリーン（異常なし）で色分けしたカードを横並び表示：
  - 離職ハイリスク：`{turnoverRiskSummary.highCount}`名 → `/adm/turnover-risk`
  - エンゲージメントalert部署：`{departments.filter(d => d.status === 'alert').length}`部署 → `/adm/engagement`
  - 1on1未実施（30日超）：`{growthKpi.oneOnOneOverdueCount}`名 → `/adm/one-on-one`
- **中部：横断KPI要点**（`KpiHeadlineSection`）— hr-kpiの主要指標を5〜6個だけ抜粋表示。詳細は「横断KPIダッシュボードを見る」リンクで `/adm/hr-kpi` へ誘導（数値の全量表示はhr-kpi側に譲り、重複実装しない）。
- **下部：CSVエクスポートボタン**（経営会議資料用、hr-kpiと同じ方式）。
- 各パネルから対応する既存ダッシュボードへのドリルダウンリンクを必ず設置する（後述のとおり、現状これが turnover-risk / engagement ページへの実質的な唯一のUI導線となるため重要）。

## マスタ登録（メニュー表示）

`/adm/turnover-risk` と `/adm/engagement` は既にメニュー登録済みだったため（前述の訂正を参照）、本施策では新設の `/adm/executive-summary` のみを登録する。実装したmigration：`supabase/migrations/20260703090000_add_executive_summary_service_master.sql`（適用済み・ローカルDBで検証済み）。

- `service_category`：新規カテゴリは作らず、`/adm/hr-kpi`・`/adm/turnover-risk`・`/adm/engagement` と同じ「サーベイ・分析 > AI・分析」カテゴリを再利用（`route_path = '/adm/hr-kpi'` から `service_category_id` を解決）
- `services`：`/adm/executive-summary` を1件追加（`sort_order = 10`、同カテゴリ内で最上位に表示し入口画面としての発見性を優先。`target_audience = 'adm'`、`release_status = '公開'`）
- `app_role_service`：`hr` / `hr_manager` / `developer` / `test` に付与（`/adm/hr-kpi` 等の実データと同一パターン。`tenant_admin` はマスタに存在しないため対象外）
- `tenant_service`：前提となる3機能（`/adm/hr-kpi`・`/adm/turnover-risk`・`/adm/engagement`）を**すべて**契約済みのテナントにのみ自動付与（ローカル検証時点では2テナント中1テナントが対象。全テナント一律付与ではなく、依存元機能が揃っているテナントのみに絞る設計とした）

## 成功指標

- `/adm/turnover-risk`・`/adm/engagement` への到達経路のうち、メール通知経由ではなくアプリ内ナビゲーション（エグゼクティブサマリー含む）経由の割合（現状ほぼ0% → 導入後の主要導線化）
- 月次で最低1回以上 `/adm/executive-summary` にアクセスするテナント管理者の割合
- CSVエクスポート機能の利用回数（役員会議での利用実績の代理指標）

## MVP実装範囲（本フェーズで完了）

1. `getExecutiveSummary()` クエリ（3ソースの並列集約、新規テーブルなし）
2. `ExecutiveSummaryDashboard` / `AlertHighlightPanel` / `KpiHeadlineSection` のUI実装
3. CSVエクスポート
4. ルート追加（`routes.ts`）・`page.tsx`・`loading.tsx`・`error.tsx`
5. メニュー登録migration（新設ページ＋既存2ページ〈turnover-risk・engagement〉の遡及登録）

## スコープ外（将来フェーズ）

- **AIによる自然文ナラティブ生成**（「今月のサマリー文章をAIが自動作成」）：施策1〜3が閾値ベースの検知で一貫している設計思想を優先し、まずは構造化ハイライトで運用する。将来 `hr-assistant` 基盤を使って拡張可能。
- **PDF出力**：まずCSVのみを提供し、hr-kpiと同じ方式に揃える。
- **月次スナップショットの保存・トレンドグラフ（前月比較）**：`turnover_risk_scores` 等は既に時系列蓄積されているため技術的には可能だが、UIの複雑化を避けるため本フェーズは「現在値」のみを表示する。
- **スケジュール自動配信（週次サマリーメール）**：施策1〜3と同様、まずは能動的にページを開く運用から開始する。

## 決定事項・オープンクエスチョン

1. **実装先**：新規ページ `/adm/executive-summary` に決定（2026-07-02ヒアリング。`/adm/hr-kpi` の拡張ではなく独立ページとする）。
2. **統合するシグナル範囲**：離職リスク（施策1）・エンゲージメントアラート（施策2）・1on1未実施（施策3）の3つに決定（2026-07-02ヒアリング）。
3. **hr-kpiとの重複表示範囲**：KPI要点セクションで表示する指標を、暫定で「離職率・エンゲージメントスコア・平均残業時間・有休取得率・育成完了率」の5指標に絞る方針で進める（異論があれば実装前に連絡）。
4. ~~既存 turnover-risk / engagement ページのメニュー未登録の是正~~ → **実装時に前提が誤りと判明したため対応不要**。両ページは既にメニュー登録済みだった（詳細は「問題定義」節の訂正・「マスタ登録」節を参照）。
5. **エンゲージメントの部署階層（layer）フィルタの扱い**：エグゼクティブサマリーのハイライトはテナント全体集約のみとし、施策2で導入したlayerフィルタは持たない（詳細な部署別確認は `/adm/engagement` 側に委ねる）方針で進める。
