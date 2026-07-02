# 部署エンゲージメント alert 状態の自動通知機能 設計書（PRD）

> エンゲージメントダッシュボード（`/adm/engagement`）の部署別ヒートマップで `alert` 状態
> （composite score 45点未満）に新規遷移した部署を検知し、その部署の管理職・人事へメール通知する。
> 施策優先度リスト（2026-07-02 競合分析セッション）の施策2に対応。
> 施策1（`docs/implementation-plan-turnover-risk-alert.md`）で構築した通知基盤を可能な限り再利用する。

---

## 問題定義

`/adm/engagement` の部署別ヒートマップ（`DepartmentHeatmap.tsx`）は、パルスサーベイ・ストレスチェック・
アンケート回答率から算出した複合スコアをもとに部署ごとの状態（`good` / `caution` / `alert`）を
色分け表示している。しかし、この判定は**ページを開いた瞬間にその場で計算されるだけ**で、
結果はどこにも保存されない。ダッシュボードを人事が能動的に見に行かない限り、ある部署が
`alert` 状態に陥ったことに誰も気づけない。施策1で離職リスクに対して構築した「検知→通知」の
ループを、組織単位（部署）のエンゲージメント低下にも適用する。

## プロダクト2大ゴールとの対応

- **組織健康度の可視化**：部署単位の状態悪化を「見に行かないと気づけない」状態から
  「通知で介入を促す」状態へ引き上げる。施策1と同じ狙い。
- **コミュニケーションを大切にするシステム**：通知を受けた管理職が、部署内のパルスサーベイ結果や
  1on1実施状況を見直すきっかけを作る。

## 施策1との構造的な違い（設計上の重要な前提）

施策1（離職リスク）は `turnover_risk_scores` という**追記型のスナップショットテーブル**が既に
存在し、「直前の計算結果」と「今回の計算結果」を比較するだけで遷移検知ができた。

一方、エンゲージメント複合スコアは**どこにも永続化されていない**（`getEngagementDashboardData()`
がパルスサーベイ・ストレスチェック・アンケートの生データから毎回その場で計算するのみで、
`engagement_scores` のようなテーブルは存在しない）。そのため本施策は、施策1にはなかった
以下2点を新規に構築する必要がある。

1. **部署複合スコアのスナップショットテーブル**（`engagement_department_scores`）
2. **スナップショットを記録するトリガー**（施策1の `RecalculateButton` / `recalculateTurnoverRiskScores`
   と同じ「手動記録ボタン」方式を採用し、スケジュール自動実行は施策1と同様に本フェーズのスコープ外とする）

## ユーザーストーリー

- 部署の管理職として、自部署のエンゲージメントが `alert` 状態に陥ったら、ダッシュボードを
  見に行かなくてもメールで気づきたい。
- 人事担当として、テナント全体で新たに `alert` に該当した部署をまとめて1通のメールで把握したい。
- 人事担当として、いつ・どの部署が `alert` になり、誰に通知したかを後から確認したい。
- （非対象）`alert` 状態が続いているだけで記録するたびに毎回通知が来ると通知疲れするので、
  それは避けたい。**「新規に alert へ遷移した場合のみ」**通知する（施策1と同じ設計思想）。

## 権限モデル

- 記録操作（Server Action）は既存の `/adm/engagement` の `ALLOWED_ROLES =
  ['hr', 'hr_manager', 'tenant_admin', 'developer']` を流用する。
- 通知の**受信者**は施策1と同一の解決ロジックをそのまま再利用する：
  - **管理職**：該当部署（`division_id`）と同一部署の `is_manager = true` かつ
    `active_status = 'active'` の従業員（`turnover-risk/notification-queries.ts` の
    `getDivisionManagerEmployeeIds()` をそのまま呼び出す。新規実装不要）。
  - **人事**：`app_role.app_role IN ('hr', 'hr_manager')` のテナント内全従業員
    （同ファイルの `getHrDigestRecipientEmployeeIds()` をそのまま呼び出す。新規実装不要）。

## データモデル

### 新規テーブル1：`engagement_department_scores`

部署複合スコアのスナップショット（追記型、`turnover_risk_scores` と同一パターン）。

```sql
CREATE TABLE public.engagement_department_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id),
  division_id       UUID NOT NULL REFERENCES public.divisions(id),
  composite_score   INTEGER NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('good', 'caution', 'alert')),
  score_breakdown   JSONB NOT NULL DEFAULT '{}',   -- pulse/stress/questionnaire の内訳（将来の詳細表示用）
  calculated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.engagement_department_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.engagement_department_scores
  FOR ALL USING (
    tenant_id = ( SELECT tenant_id FROM public.employees WHERE user_id = auth.uid() )
  );

CREATE INDEX idx_engagement_scores_tenant_div ON public.engagement_department_scores(tenant_id, division_id, calculated_at DESC);
```

### 新規テーブル2：`engagement_department_alerts`

通知の監査ログ兼冪等性チェック用（`turnover_risk_alerts` と同一パターン、`employee_id` の代わりに
`division_id` を主キーとする）。

```sql
CREATE TABLE public.engagement_department_alerts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id),
  division_id           UUID NOT NULL REFERENCES public.divisions(id),
  composite_score       INTEGER NOT NULL,
  previous_status       TEXT NOT NULL,                                        -- 'good' | 'caution' | 'none'（初回計算）
  recipient_employee_id UUID REFERENCES public.employees(id),
  recipient_type        TEXT NOT NULL CHECK (recipient_type IN ('manager', 'hr_digest', 'no_manager_fallback')),
  channel               TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email')),
  status                TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message         TEXT,
  notified_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.engagement_department_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.engagement_department_alerts
  FOR ALL USING (
    tenant_id = ( SELECT tenant_id FROM public.employees WHERE user_id = auth.uid() )
  );

CREATE INDEX idx_engagement_alerts_division ON public.engagement_department_alerts(tenant_id, division_id, notified_at DESC);
CREATE INDEX idx_engagement_alerts_tenant_date ON public.engagement_department_alerts(tenant_id, notified_at DESC);
```

## 配置（既存資産の再利用を明示）

```
src/features/engagement/
├── queries.ts                        # 既存。getEngagementDashboardData() は変更しない
├── actions.ts                        # 新規：recordEngagementSnapshot()（記録＋通知トリガー）
├── alert-transition-detector.ts      # 新規：turnover-risk/transition-detector.ts と同型のロジック
│                                        （'alert' 以外 → 'alert' の遷移のみ抽出）
├── alert-notification-queries.ts     # 新規：直前スナップショット取得・冪等性チェックのみ
│                                        （管理職/HR受信者解決は下記を再利用し重複実装しない）
├── alert-notifications.ts            # 新規：通知オーケストレーション
│                                        （src/features/turnover-risk/notifications.ts の
│                                          sendManagerAlerts/sendHrDigest 相当のロジックを、
│                                          division_id ベースに置き換えて実装）
└── components/
    ├── EngagementDashboard.tsx        # 既存。ヘッダーに「状態を記録」ボタンを追加
    ├── DepartmentHeatmap.tsx          # 既存、変更なし
    └── RecordSnapshotButton.tsx       # 新規：turnover-risk/RecalculateButton.tsx と同型のUI

src/features/turnover-risk/notification-queries.ts
    └── getDivisionManagerEmployeeIds() / getHrDigestRecipientEmployeeIds()
        を engagement 側からそのまま import して再利用する（コピーしない）

src/lib/mail/send.ts, src/lib/mail/resolve-employee-email.ts
    └── 変更なし。既存のまま呼び出す

supabase/migrations/
└── <timestamp>_add_engagement_department_alerts.sql   # 新規migration（上記2テーブル）
```

新規ページ・新規メニューは追加しない。既存の `/adm/engagement` ページの機能拡張として扱う。

## 処理フロー

```
recordEngagementSnapshot()（新規 Server Action, src/features/engagement/actions.ts）
  1. ALLOWED_ROLES チェック（既存の /adm/engagement と同一）
  2. getEngagementDashboardData() を呼び出し、現在の部署別 composite score / status を取得
     （既存の計算ロジックをそのまま再利用。計算式自体は変更しない）
  3. ★新規: getLatestDivisionStatusesBeforeUpdate() で「今回計算前」の部署ごと最新 status を取得
     （engagement_department_scores から division_id ごとの最新1件を取得。
      施策1の getLatestRiskLevelsBeforeUpdate() と同じ「最新バッチのタイムスタンプで一括取得」方式を踏襲し、
      テナント内の部署数分の件数上限バグを再発させない）
  4. engagement_department_scores へ全部署分を insert（追記型スナップショット）
  5. ★新規: detectAlertTransitions() で「旧 ≠ alert AND 新 = alert」の部署リストを抽出
  6. ★新規: notifyAlertTransitions(transitionedDivisions) を呼び出す
       - 各対象部署について getDivisionManagerEmployeeIds()（turnover-risk流用）で管理職を解決
       - 管理職が0人ならフォールバック（HRダイジェストにのみ含め、recipient_type='no_manager_fallback'）
       - resolveEmployeeEmail() でメールを解決し sendMail()
         （施策1と同じ per-recipient try/catch パターン。1件の失敗が他部署への通知を止めない）
       - 直近15分以内に同一部署へ送信済みなら対象から除外（施策1の getRecentlyNotifiedEmployeeIds と
         同型の重複防止ガードを division_id ベースで実装）
       - 送信結果を engagement_department_alerts に記録
       - 対象部署が1件以上あれば、テナント内 HR ロール全員へダイジェストメールを1通送信
         （施策1の sendHrDigest と同型）
  7. スナップショット保存（4）は成功済みとして扱い、通知処理（6）の失敗で
     Server Action 全体の成功結果を上書きしない（施策1の actions.ts と同じ設計）
  8. { success, snapshotCount, notifiedCount } を返す
```

## メール文面（例）

**管理職宛**：
- 件名：`【要確認】{部署名}のエンゲージメントスコアが低下しています`
- 本文：部署名・複合スコア・ダッシュボードへのリンク（`APP_ROUTES.TENANT.ADMIN_ENGAGEMENT`）・
  推奨アクション（パルスサーベイ結果の確認、1on1実施を促す一文）

**人事宛（ダイジェスト）**：
- 件名：`【エンゲージメントアラート】新たに{N}部署が要注意状態になりました`
- 本文：該当部署一覧（部署名・スコア）をテーブル形式で列挙、ダッシュボードへのリンク

## MVP実装範囲（本フェーズで完了）

1. `engagement_department_scores` / `engagement_department_alerts` の migration 追加。
2. `alert-transition-detector.ts`：`detectAlertTransitions()`（施策1の
   `detectHighRiskTransitions()` と同じ考え方をテストファースト実装）。
3. `alert-notification-queries.ts`：直前スナップショット取得・冪等性チェックのみ新規実装
   （管理職・HR受信者解決は施策1の関数を import して再利用）。
4. `alert-notifications.ts`：`notifyAlertTransitions()`。
5. `actions.ts`：`recordEngagementSnapshot()`。
6. `RecordSnapshotButton.tsx` を `EngagementDashboard.tsx` のヘッダーに追加。

## スコープ外（将来フェーズ）

- **スケジュール自動実行**：施策1と同様の理由で本フェーズのスコープに含めない。スナップショット記録は
  手動「状態を記録」ボタン経由のみとする。自動化する場合は施策1のフェーズ2（GitHub Actions cron →
  API route パターン）を先に実装し、両施策で共通化することを推奨する。
- in-app 通知（ベル型通知センター）：施策1と同じ理由でスコープ外。
- `alert` 状態が一定期間放置された場合のエスカレーション通知。
- `score_breakdown`（JSONB）を使った要因内訳のUI表示（今回は将来のための保存のみ）。

## 成功指標

- `alert` 遷移発生から通知送信までの遅延：スナップショット記録と同一トランザクション内で完結（実質ゼロ）。
- 通知の到達率：`engagement_department_alerts.status = 'sent'` の割合が95%以上。
- 介入率の変化：通知を受けた部署について、7日以内に該当部署管理職による1on1実施件数
  （`one_on_one_sessions`）が増加するか、機能導入前後で比較。
- 重複通知ゼロ：同一遷移イベントに対し `engagement_department_alerts` の重複行が発生しないこと。

## 決定事項（2026-07-02）

1. **スケジュール自動実行**：含めない。「状態を記録」ボタンによる手動トリガーのみ。
2. **記録ボタンの文言**：「状態を記録」で確定。
3. **HRダイジェストの受信者範囲**：`hr` / `hr_manager` のみ（`tenant_admin` は除外）で確定。
4. **部署階層（`layer`）フィルタ**：分析（記録）実行時に階層を選択指定できるようにする。
   具体設計は以下の通り。

### layer選択式フィルタの設計

- `getEngagementDashboardData()` の部署別集計に `layer`（`divisions.layer`）を追加する
  （`employees.divisions(id, name)` → `employees.divisions(id, name, layer)` に変更し、
  `DepartmentEngagementRow` に `layer: number | null` を追加。複合スコアの計算式自体は変更しない）。
- `DepartmentHeatmap` の上部に階層セレクター（ピル形式、`turnover-risk` のリスクレベルフィルタと
  同型のUI）を設置する。選択肢はハードコードせず、`data.departments` に実際に含まれる
  `layer` 値から動的に生成する（テナントごとに組織階層の深さが異なるため）。「すべて」を含む。
- ヒートマップの表示は選択した階層でフィルタする。
- 「状態を記録」ボタンは、**現在選択されている階層のみ**を対象にスナップショット記録・遷移検知・
  通知を行う（`recordEngagementSnapshot(layerFilter: number | 'all')`）。「すべて」選択時は
  画面に表示されている全部署が対象になる。
- 何を記録・通知したかが分かるよう、記録完了メッセージに対象階層を明示する
  （例：「layer 2 の部署について状態を記録しました」）。
