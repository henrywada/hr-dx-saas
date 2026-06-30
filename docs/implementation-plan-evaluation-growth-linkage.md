# 評価・成長 組織分析連携強化 実装計画（PRD）

> ロードマップ: `docs/feature-blocks-development-roadmap.md` 優先度6位（評価・成長ブロック、既存機能の連携強化）

## 1. 問題定義

パフォーマンス評価・1on1・スキル・eラーニングは個別機能として完成度が高いが、**組織分析層（ゴール②）への横断統合が不十分**。

現状のギャップ:

| 連携 | 現状 | 問題 |
| --- | --- | --- |
| `/adm` トップ | 1on1・スキル・eL カードあり | **パフォーマンス評価**・キャリア面談が不可視 |
| `/adm/hr-kpi` | `DevelopmentKpi` に評価完了率・スキル/eL・キャリア面談率 | 別ページ。経営者が `/adm` だけ見ると評価状況が分からない |
| turnover-risk | stress / overtime / pulse / questionnaire のみ | 1on1未実施・評価未完了・スキルギャップがリスク因子に未反映 |
| engagement ダッシュボード | pulse / stress / questionnaire のみ | 成長層データなし |

## 2. ユーザーストーリー

| As a | I want to | So that |
| --- | --- | --- |
| 経営者・人事責任者 | `/adm` トップで直近評価期間の完了率を見たい | 評価サイクルの進捗を他 KPI と並べて把握できる |
| 人事責任者 | 離職リスクスコアに 1on1 未実施・評価未完了が反映される | 成長支援の不足が離職リスクの先行指標として可視化される |
| 人事責任者 | `/adm` でキャリア面談実施率を見たい | 個人の成長対話の浸透度を把握できる |

## 3. 要求（優先度別）

### Must（フェーズ1 — 本 PRD の初回実装対象）

1. **`/adm` トップに「パフォーマンス評価」カード追加**
   - 直近評価期間の完了率（`flow_status='confirmed'` の割合）
   - データソース: 既存 `fetchDevelopmentKpi()` の `evaluationCompletionRatePercent` を再利用
2. **`/adm` トップに「キャリア面談」カード追加**
   - 直近180日のキャリア面談実施率
   - データソース: 既存 `fetchDevelopmentKpi()` の `careerDiscussionRatePercent` を再利用
3. **`AdmDashboardSummary` 型拡張**
   ```typescript
   evaluation: {
     completionRatePercent: number | null
     latestPeriodName: string | null
   }
   careerDiscussion: {
     ratePercent: number | null
   }
   ```

### Should（フェーズ2）

4. **turnover-risk スコア因子に成長層データを追加**
   - `collectEmployeeRawData()` に以下を追加:
     - 直近30日 1on1 未実施フラグ（`one_on_one_sessions`）
     - 直近評価期間 評価未完了フラグ（`evaluation_records.flow_status`）
     - スキルギャップ有無（`employee_skill_assignments` × `skill_requirements`）
     - eL 未完了割当有無（`el_assignments.completed_at IS NULL`）
   - `ScoreFactors` 型に `growthRiskFactors` セクションを追加
   - スコア計算式の重み付けは既存因子とのバランスを維持（各 +5〜15 点程度）

### Could（フェーズ3）

5. engagement ダッシュボード（`features/engagement/`）への成長 KPI 統合 — **✅ 2026-06-30 完了**（`GrowthDevelopmentCards`）
6. `/adm/hr-kpi` と `/adm` トップの重複 KPI の整理（単一ハブ化） — **✅ 2026-06-30 完了**（概要=/adm、詳細=hr-kpi、相互導線・スキルカード役割分担）

### Won't（今回スコープ外）

- 評価ワークフロー自体の変更
- 1on1 深いフォローアップ機能の新規実装
- hr-kpi ページの廃止

## 4. データモデル

**新規テーブルなし。** 既存テーブルの読み取りのみ:

| テーブル | 用途 |
| --- | --- |
| `evaluation_periods` | 直近期間の特定 |
| `evaluation_records` | 完了率（`flow_status`） |
| `one_on_one_sessions` | 1on1 実施状況（turnover-risk 用） |
| `career_discussions` | キャリア面談実施率 |
| `employee_skill_assignments` / `skill_requirements` | スキルギャップ（turnover-risk 用） |
| `el_assignments` | eL 完了状況（turnover-risk 用） |

## 5. 実装範囲（フェーズ1）

| ファイル | 変更内容 |
| --- | --- |
| `src/features/adm-dashboard/types.ts` | `evaluation`, `careerDiscussion` セクション追加 |
| `src/features/adm-dashboard/queries.ts` | `getHrKpiBundle()` から評価・キャリア面談 KPI を取得してマッピング |
| `src/app/(tenant)/(tenant-admin)/adm/page.tsx` | 評価・キャリア面談カード2枚追加（既存セクション「評価・成長」内） |

## 6. 実装範囲（フェーズ2 — turnover-risk）

| ファイル | 変更内容 |
| --- | --- |
| `src/features/turnover-risk/types.ts` | `ScoreFactors` 拡張 |
| `src/features/turnover-risk/queries.ts` | `collectEmployeeRawData()` に成長因子収集 |
| `src/features/turnover-risk/scoring.ts`（または actions 内） | スコア計算に成長因子を反映 |

## 7. 成功指標

- `/adm` トップを開いた経営者が、評価完了率・キャリア面談率を追加クリックなしで確認できる
- turnover-risk 再計算後、1on1 長期未実施者のスコアが適切に上昇する（フェーズ2）
- 既存 `/adm` カード（1on1・スキル・eL）の表示に影響を与えない

## 8. オープンクエスチョン

1. ~~評価カードは「直近期間」のみ表示でよいか、期間選択 UI が必要か~~ → **EV-S1 完了**: `/adm?evalPeriod=` で期間切替
2. turnover-risk 成長因子の重み付け — HR ドメイン知識に基づく調整が必要
3. ~~`/adm/hr-kpi` との役割分担~~ → **完了**: 概要は `/adm`、月次横断分析・CSV は `/adm/hr-kpi`。評価期間切替は `/adm` のみ。
