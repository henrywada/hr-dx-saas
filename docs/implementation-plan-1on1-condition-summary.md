# 1on1実施前のコンディションサマリー自動表示 設計書（PRD）

> 1on1記録画面（`SessionFormModal`）で対象者を選択した際、直近のパルスサーベイ傾向・
> 1on1実施状況を自動表示し、上長が「何を話すべきか」を持って1on1に臨めるようにする。
> 施策優先度リスト（2026-07-02 競合分析セッション）の施策3に対応。

---

## 問題定義

1on1記録画面では対象者を選ぶと「過去のキャリア面談メモ」は参照できるが（`career-discussions`
機能とのクロスリファレンス）、当初想定していた「対象者の直近ストレス／パルス／エンゲージメント
傾向」を確認できる仕組みは**存在しない**。上長は1on1の直前に部下の状態を何も踏まえずに面談へ
臨むことになり、「コミュニケーションを大切にするシステム」と「組織健康度の可視化」を1画面で
繋ぐという狙いが実現できていない。

## 重要な発見：スコープに関わるコンプライアンス制約

調査の結果、当初のICE見積り時に想定していた「ストレス／パルス／エンゲージメント」3種の
コンディション情報のうち、**ストレスチェック関連データは現状の権限設計上、上長には表示できない**
ことが判明した。本PRDのスコープはこの制約を前提に設計している。

| データ種別 | 上長への表示可否 | 根拠 |
| --- | --- | --- |
| パルスサーベイ（個人の推移） | **可** | `pulse_survey_responses` はテナント分離のみのRLS（役割制限なし）。既に全認証済みテナントユーザーが参照可能 |
| ストレスチェック結果（高ストレス判定等） | **不可**（現状） | `stress_check_results` のRLSは「本人」「hr/hr_manager（本人同意済みの場合のみ）」「産業医/産業看護師」に限定。上長（`is_manager=true`のみで`appRole`が`employee`）を許可するポリシーは存在しない（`20260307000000_init_schema.sql:1529-1539`） |
| コンディションチェックイン（個人推移） | **不可**（現状） | 集計RPC（`get_employee_condition_averages`等）は `hr, hr_manager, company_doctor, company_nurse, hsc, developer` のみ許可。かつ既存PRD `docs/implementation-plan-condition-checkin.md:34` に「個人別の生データを上長が閲覧できる機能（プライバシー上、今回は実装しない）」と明記された**既存の製品判断**がある |
| 残業時間 | **不可**（現状） | `work_time_records`/`overtime_monthly_stats` のRLSも「本人」「hr/hr_manager/developer」のみ。上長は含まれない（`20260403100000_attendance_select_add_developer.sql`） |

ストレスチェック個人データを上長に開示することは、労働安全衛生法のストレスチェック制度が
定める「事業者への結果提供には本人同意が必要」という原則、および人事評価等への不利益使用防止の
趣旨に関わる**法令・コンプライアンス上の判断**であり、単なるUI/クエリの実装課題ではない。
また `condition-checkin` 機能では既に「上長への個人データ非開示」を明示的な設計判断として
下した経緯がある。したがって、本施策ではこれらのデータを**スコープに含めない**。

## プロダクト2大ゴールとの対応

- **コミュニケーションを大切にするシステム**：1on1実施の文脈に、対象者の状態（パルス傾向・
  直近の1on1実施状況）を接続し、対話の質を高める。
- **組織健康度の可視化**：上長個人のレベルでも、権限の範囲内でコンディションの兆候（パルス
  スコアの低下）に気づけるようにする。ストレスチェック等の機微情報は人事・産業医向けの
  既存ダッシュボード（`/adm/pulse-stress`、`/adm/engagement`）に集約する方針を維持する。

## ユーザーストーリー

- 管理職として、1on1の対象者を選んだら、その人の直近のパルスサーベイスコアの推移を見て、
  何を話すべきか準備したい。
- 管理職として、その人と過去いつ1on1を実施したか、実施頻度は十分かをひと目で確認したい。
- 管理職として、パルススコアが低下傾向にある場合は、それとわかる形で気づきたい（アイコン等）。
- （非対象）ストレスチェック結果や毎日のコンディションチェックインの個人データは、
  本施策では上長に表示しない（上表参照）。

## 権限モデル

- 表示対象は既存の1on1記録権限と同一（`one-on-one/types.ts` の `canConductOneOnOne(appRole,
  isManager)`）。新規の権限区分は追加しない。
- パルスサーベイの個人推移取得は既存RLS（テナント分離のみ）の範囲内で行うため、追加のRLS
  ポリシーや新規RPCは不要。

## データモデル

新規テーブルは不要（既存の `pulse_survey_responses` と `one_on_one_sessions` を読み取るのみ）。

新規に追加する関数：`getEmployeeConditionSummary(employeeIds: string[])`
（`src/features/one-on-one/queries.ts` に追加。`turnover-risk/queries.ts` の
`collectEmployeeRawData()` にある「従業員ごとの直近パルススコア取得」ロジックと同じ考え方で、
`pulse_survey_responses` を `employeeIds` に絞って取得し、1人あたり直近3〜6回分のスコア推移と
トレンド方向（上昇/下降/横ばい）を返す）。

戻り値の型（`one-on-one/types.ts` に追加）：

```typescript
export interface EmployeeConditionSummary {
  employeeId: string
  pulseTrend: Array<{ period: string; score: number }>  // 直近数回分、0.0〜5.0スケール
  pulseTrendDirection: 'up' | 'down' | 'flat' | 'no_data'
  lastOneOnOneAt: string | null
  daysSinceLastOneOnOne: number | null
  isOverdue: boolean  // 30日以上未実施
}
```

## 配置

```
src/features/one-on-one/
├── queries.ts
│   └── getEmployeeConditionSummary(employeeIds: string[])  # 新規追加
│       内部で pulse_survey_responses を employeeIds に絞って取得（既存の
│       getRecentOneOnOneSessionsForEmployees / getOverdueEmployees の実施状況ロジックと合成）
├── types.ts
│   └── EmployeeConditionSummary  # 新規追加
└── components/
    ├── SessionFormModal.tsx           # 既存。対象者<select>の直下（line 112-152付近、
    │                                     既存の career-discussion 参照ブロックと同じ位置）に
    │                                     ConditionSummaryPanel を追加
    └── ConditionSummaryPanel.tsx      # 新規：パルストレンド・1on1実施状況の表示コンポーネント
```

`SessionFormModal.tsx` は既に `careerDiscussionsByEmployee: Record<employeeId, ...>` という
「事前に全対象者分をまとめて取得し、選択に応じてプロパティで表示切替する」パターンを採用して
いるため、`conditionSummaryByEmployee: Record<employeeId, EmployeeConditionSummary>` も同じ
パターンで実装する（画面遷移時の追加リクエストなしで即座に表示できる）。

## UI設計

`ConditionSummaryPanel`（`SessionFormModal` 内、対象者選択直後に表示）：

- パルスサーベイ推移：直近3〜6回分のスコアをミニスパークライン or 数値羅列で表示
  （例：`3.2 → 3.0 → 2.6`）。`pulseTrendDirection === 'down'` の場合はトレンド低下を示す
  アイコン・色で強調する。
- 1on1実施状況：「前回実施：14日前」「30日以上未実施」等のテキスト表示。
  `isOverdue` の場合は視覚的に強調する。
- データなし（`no_data`）の場合はその旨を表示し、パネル自体を非表示にはしない
  （「まだパルスサーベイの回答がありません」等）。
- ストレスチェック・コンディションチェックインへの言及・誘導は行わない
  （人事向けダッシュボードへの動線は本施策のスコープ外）。

## MVP実装範囲（本フェーズで完了）

1. `getEmployeeConditionSummary()` の実装（パルストレンド＋1on1実施状況の合成）。
2. `ConditionSummaryPanel.tsx` の実装。
3. `SessionFormModal.tsx` への組み込み（`conditionSummaryByEmployee` prop受け渡し）。
4. 呼び出し元（`OneOnOneDashboard.tsx` 等、`SessionFormModal` を開く箇所）で
   `getEmployeeConditionSummary()` を事前取得し prop として渡す配線。

## スコープ外（将来フェーズ・要判断）

- **ストレスチェック結果の上長への表示**：法令・コンプライアンス上の判断が必要。実施する場合は
  「本人同意の範囲を上長にも拡張するか」「産業医経由の間接的な示唆に留めるか」等の設計を
  人事・法務と別途検討し、RLSポリシー／RPCの新規設計を伴う別PRDとして起票する。
- **コンディションチェックイン個人データの上長への表示**：`condition-checkin` PRDで既に
  「実装しない」と決定済み。本施策で覆さない。
- **残業時間の上長への表示**：既存の残業承認フロー（`/overtime/approval` 等）が別途存在するため、
  1on1画面へ重複表示するかは別途要否を判断する。今回は含めない。
- 部署間・組織図と連携したコミュニケーション頻度の可視化（優先度リストの後続項目、施策7相当）。

## 成功指標

- 1on1記録時にコンディションサマリーが表示された割合（データ欠損以外で100%を目指す）。
- パルススコア低下傾向（`pulseTrendDirection === 'down'`）が表示された対象者について、
  7日以内に1on1が記録される割合の変化（機能導入前後で比較）。
- `isOverdue`（30日以上未実施）表示後の実施率の変化。

## 決定事項（2026-07-02）

1. **ストレスチェックデータの扱い**：スコープ外で確定。パルスサーベイ・1on1実施状況のみを表示する。
2. **パルストレンドの表示期間**：直近3回分（暫定方針。表示が窮屈な場合は後日調整）。
3. **1on1実施状況の集計範囲**：施策1（離職リスク計算）と閾値を揃え、「30日以上未実施」を
   `isOverdue` の基準とする（`turnover-risk/score-calculator.ts` の `one_on_one_overdue_30d`
   と同じ30日閾値）。
