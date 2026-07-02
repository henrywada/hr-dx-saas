# 離職リスク高スコア検知の自動通知機能 設計書（PRD）

> `turnover_risk_scores` が `high` へ遷移した従業員を検知し、上長・人事へメール通知する。
> 「組織健康度の可視化」を"ダッシュボードを能動的に見に行かないと気づけない"状態から"通知で介入を促す"状態へ引き上げる。
> 施策優先度リスト（2026-07-02 競合分析セッション）の施策1に対応。

---

## 問題定義

`turnover-risk` ダッシュボード（`/adm/turnover-risk`）は既にスコアリング・要因分解・部署別ランキング・対応ログ機能を持つが、**人事や上長がダッシュボードを自発的に開かない限り、高リスク者の発生に誰も気づけない**。スコア再計算も現状「スコア再計算」ボタンの手動クリックでのみ発生し、リスク遷移をトリガーに誰かへ知らせる仕組みは存在しない。結果として、離職の予兆データが可視化されていても、実際の介入（1on1・面談等）につながらないリスクがある。

## プロダクト2大ゴールとの対応

- **組織健康度の可視化**：スコアリング自体は実装済み。本機能は「可視化 → 気づき → 介入」のループを完成させる最後のピースであり、既存資産（`turnover_risk_scores`・`score-calculator.ts`・`src/lib/mail`）の組み合わせのみで実現できる、投資対効果の高い施策として選定した。
- **コミュニケーションを大切にするシステム**：通知を受けた上長が 1on1（`turnover_risk_action_logs` の `action_type: 'one_on_one'`）等の対話に動くきっかけを作る。

## ユーザーストーリー

- 部署の管理職として、自部署の部下が高リスクに遷移したら即座にメールで知りたい。ダッシュボードを毎日チェックしなくても気づけるようにしたい。
- 人事担当として、テナント全体で新規に高リスクへ遷移した従業員をまとめて1通のメールで把握したい。個人ごとに何通も届くと埋もれてしまう。
- 人事担当として、誰にいつ通知が送られたかを後から確認したい（対応漏れの追跡・監査のため）。
- （非対象）同じ高リスク状態が続いているだけで毎回通知が来ると通知疲れするので、それは避けたい。**「新規に high へ遷移した場合のみ」**通知する。

## 権限モデル

- 通知対象ロジックは Server Action 内部処理であり、新規UIの閲覧権限は発生しない（既存の `/adm/turnover-risk` の `ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']` を変更しない）。
- 通知の**受信者**は以下の2種類（後述のデータモデル参照）：
  - **上長**：対象従業員と同一 `division_id` かつ `is_manager = true` かつ `active_status = 'active'` の従業員（0〜N名。同一部署に複数管理職がいる場合は全員に送付）。
  - **人事**：`app_role.app_role IN ('hr', 'hr_manager')` に該当するテナント内の全従業員（`tenant_admin` / `developer` は対象外とし、ダッシュボード確認に委ねる。理由は下記オープンクエスチョン参照）。

## データモデル

### 既存テーブル（変更なし）

| テーブル | 用途 |
| --- | --- |
| `turnover_risk_scores` | 従業員ごとのリスクスコア・レベルのスナップショット（追記型、更新なし） |
| `employees` | `division_id` + `is_manager` で「同一部署の管理職」を解決（`manager_id` 等の直接FKは存在しないため、既存の1on1/残業承認機能と同じ解決パターンを踏襲） |
| `app_role` | `app_role = 'hr' / 'hr_manager'` で人事ロールを判定 |

### 新規テーブル：`turnover_risk_alerts`

通知の監査ログ兼冪等性チェック用。`recalculateTurnoverRiskScores()` 実行のたびに「前回スナップショットの `risk_level` ≠ `high`」かつ「今回 `risk_level` = `high`」の従業員だけを対象とするため、同一遷移に対する重複通知は本テーブルがなくとも自然に防止されるが、送信結果の追跡・監査・将来の in-app 通知UIの基盤として記録する。

```sql
CREATE TABLE public.turnover_risk_alerts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id),
  employee_id           UUID NOT NULL REFERENCES public.employees(id),   -- 対象の高リスク従業員
  risk_score            INTEGER NOT NULL,
  previous_risk_level   TEXT NOT NULL,                                    -- 遷移前レベル（'medium' | 'low'）
  recipient_employee_id UUID REFERENCES public.employees(id),             -- 上長宛の場合に設定。人事ダイジェストはNULL
  recipient_type        TEXT NOT NULL CHECK (recipient_type IN ('manager', 'hr_digest', 'no_manager_fallback')),
  channel               TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email')),
  status                TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message         TEXT,
  notified_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.turnover_risk_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.turnover_risk_alerts
  FOR ALL USING (
    tenant_id = ( SELECT tenant_id FROM public.employees WHERE user_id = auth.uid() )
  );

CREATE INDEX idx_turnover_alerts_employee ON public.turnover_risk_alerts(tenant_id, employee_id, notified_at DESC);
CREATE INDEX idx_turnover_alerts_tenant_date ON public.turnover_risk_alerts(tenant_id, notified_at DESC);
```

`recipient_type = 'no_manager_fallback'` は、対象従業員の部署に `is_manager = true` の従業員が1人もいない場合（例：役員直下・管理職不在部署）の救済パス。この場合は上長通知をスキップし、人事ダイジェストにのみ含める。

## 配置（CLAUDE.md ルートグループ準拠）

```
src/features/turnover-risk/
├── actions.ts                    # 既存。recalculateTurnoverRiskScores() の末尾で notifyHighRiskTransitions() を呼び出す
├── notifications.ts               # 新規：遷移検知・受信者解決・メール送信・alerts記録をまとめる
├── notification-queries.ts        # 新規：遷移前スナップショット取得・同一部署の管理職取得・HR担当者取得
├── score-calculator.ts            # 変更なし
├── queries.ts                     # 変更なし
└── types.ts                       # NotificationResult 等の型を追加

supabase/migrations/
└── <timestamp>_add_turnover_risk_alerts.sql   # 新規migration
```

新規ページ・新規メニューは追加しない（`service_class` / `service_category` / `services` / `tenant_service` / `app_role_service` への新規マスタ登録は不要）。既存の `/adm/turnover-risk` ページ・既存サービス枠内の機能拡張として扱う。

## 処理フロー

```
recalculateTurnoverRiskScores()（既存 Server Action, src/features/turnover-risk/actions.ts）
  1. collectEmployeeRawData() で全従業員の生データ取得（既存）
  2. ★新規: getLatestRiskLevelsBeforeUpdate() で「今回計算前」の従業員ごと最新 risk_level を取得
  3. calculateRiskScore() で新スコア算出（既存）
  4. turnover_risk_scores へ insert（既存）
  5. ★新規: 3で算出した新レベルと2の旧レベルを比較し、
     「旧 ≠ high AND 新 = high」の従業員リストを抽出
  6. ★新規: notifyHighRiskTransitions(transitionedEmployees) を呼び出す
       - 各対象者について division_id から同一部署の管理職（is_manager=true, active）を解決
       - 管理職が0人ならフォールバック（HRダイジェストにのみ含め、recipient_type='no_manager_fallback'で記録）
       - resolveEmployeeEmail() で管理職のメールを解決し sendMail()（stress-check/actions.ts と同じ
         try/catch per-recipientパターンで、1人の送信失敗が全体を止めないようにする）
       - 送信結果を turnover_risk_alerts に1行ずつ記録（成功/失敗問わず）
       - 対象者が1人以上いればテナント内 HR ロール（app_role IN ('hr','hr_manager')）全員へ
         ダイジェストメール（該当者名・スコア・ダッシュボードへのリンクを1通にまとめる）を送信
  7. revalidatePath()（既存）
  8. { success, updatedCount, notifiedCount } を返す（戻り値に通知件数を追加）
```

`notifyHighRiskTransitions` 内のメール送信失敗は `recalculateTurnoverRiskScores` 全体の失敗として扱わない（スコア保存は既に成功しているため）。UI側は `updatedCount` と `notifiedCount` を分けて表示できるよう `RecalculateButton.tsx` の結果表示文言を更新する。

## メール文面（例）

**上長宛**：
- 件名：`【要対応】{従業員名}さんの離職リスクが「高」に上昇しました`
- 本文：対象者名・部署名・リスクスコア・主な要因（`score_factors` から上位1〜2件を平易な文言に変換）・ダッシュボードへのリンク（`APP_ROUTES.TENANT.ADMIN_TURNOVER_RISK`）・推奨アクション（1on1実施を促す一文）

**人事宛（ダイジェスト）**：
- 件名：`【離職リスクアラート】新たに{N}名が高リスクに該当しました`
- 本文：該当者一覧（氏名・部署・スコア）をテーブル形式で列挙、ダッシュボードへのリンク

## MVP実装範囲（本フェーズで完了）

1. `turnover_risk_alerts` テーブルのmigration追加。
2. `notification-queries.ts`：遷移前スナップショット取得・同一部署の管理職解決・HRロール一覧取得。
3. `notifications.ts`：`notifyHighRiskTransitions()` の実装（上長通知・HRダイジェスト・alerts記録・エラーハンドリング）。
4. `recalculateTurnoverRiskScores()` への組み込み（既存の手動「スコア再計算」ボタン経由で機能する）。
5. `RecalculateButton.tsx` の結果表示に通知送信件数を追加。
6. メールテンプレート（上長宛・HRダイジェスト宛）。

## スコープ外（将来フェーズ）

- **スケジュール自動実行（日次バッチでの自動スコア再計算）**：2026-07-02 に確定。今回のスコープに含めない。スコア再計算は引き続き既存の手動「スコア再計算」ボタン経由のみとし、通知ロジックはそのトリガーに乗る形で組み込む。`auto-distribution` と同じ GitHub Actions cron → API route パターン（`/api/turnover-risk/recalculate-due`）でのマルチテナント一括自動化は、必要になった時点で別PRDとして切り出す。
- in-app 通知（ベル型通知センター）：本リポジトリには汎用の in-app 通知基盤が存在しないため新規UI構築が必要になり、スコープが大きい。まずはメールのみで提供する。
- 高リスク状態が一定期間（例：30日）放置され対応ログが記録されていない場合のエスカレーション通知。
- 離職リスクスコアの機械学習化・重み付け精度向上。

## 成功指標

- 高リスク遷移発生から通知送信までの遅延：スコア再計算実行と同一トランザクション内で完結（実質ゼロ）。
- 通知の到達率：`turnover_risk_alerts.status = 'sent'` の割合が95%以上。
- 介入率の変化：通知を受けた高リスク者に対し、7日以内に `turnover_risk_action_logs` へのアクション記録が行われる割合を、機能導入前後で比較（ベースライン計測が必要）。
- 重複通知ゼロ：同一遷移イベントに対し `turnover_risk_alerts` の重複行が発生しないこと。

## 決定事項・オープンクエスチョン

1. **スケジュール自動実行をこのフェーズに含めるか** → **決定（2026-07-02）：含めない**。手動「スコア再計算」ボタン経由のトリガーのみで実装する。
2. **HRダイジェストの受信者範囲**：`hr` / `hr_manager` のみとし `tenant_admin` を除外する暫定方針で実装を進める（明示合意なし。異論があれば実装前に連絡）。
3. **管理職不在部署のフォールバック**：HRダイジェストのみに含め、テナント管理者への個別即時通知は行わない暫定方針で実装を進める。
4. **送信時間帯の配慮**：スケジュール自動化を含めない決定（上記1）により、送信は常に人事担当者が手動でボタンを押した時刻に発生するため、深夜配信の懸念は実質的に解消。追加対応は不要と判断。
