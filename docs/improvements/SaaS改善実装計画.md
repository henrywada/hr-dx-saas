# hr-dx-saas SaaS改善実装計画

**作成日：** 2026-06-01  
**対象ペルソナ：** 従業員100〜1000名規模の中小企業 — 経営者 / 人事担当者  
**依拠資料：** `docs/implevements/課題TOP10.md`、`docs/implevements/改善提案.md`、既存機能調査（`src/features/`・`src/config/routes.ts`）

---

## 0. エグゼクティブサマリー

hr-dx-saas は「勤怠・ストレスチェック・スキルマップ・評価・eラーニング・採用AI」の各機能を既に保有している。  
ペルソナの課題TOP10を照合すると、**個別機能は揃っているがデータがサイロ化**しており、「横断的可視化」と「予兆検知・自動アラート」の二点が最大のギャップである。  
また、採用チャネル管理・サクセッションプラン・36協定/有休の統合ビューは新規開発が必要な領域である。

---

## 1. 現状機能と課題のマッピング

| # | 課題 | 既存機能 | ギャップ（優先度順） |
|---|------|---------|-------------------|
| 1 | 採用難・人材獲得競争 | `job-postings`, `recruitment-ai`, `candidate-pulse`, `offer-validation`, `market-analysis` | 選考フロー進捗ダッシュボード・対応遅れアラート・リファラル採用チャネル管理 |
| 2 | 離職・定着率の悪化 | `survey`, `stress-check`, `onboarding` | **離職予兆スコアリング**（複数データ統合）・退職理由の構造的蓄積と傾向分析 |
| 3 | 評価制度の形骸化 | `evaluation`, `global-evaluation-templates` | **評価提出リマインダー・差し戻し通知**・評価×報酬連動ビュー |
| 4 | エンゲージメント低下 | `questionnaire`, `survey`, `stress-check`, AI職場改善 | **統合エンゲージメントダッシュボード**・改善アクション管理・経営メッセージ配信 |
| 5 | 労務管理・法令対応 | `attendance`, `overtime`, `qr-punch`, `telework` | **36協定・有休取得の統合ビュー**・アラート強化・法改正通知 |
| 6 | 管理職育成不足 | `skill-map`, `skill-portal`（育成ジャーニー） | **1on1記録・テーマ管理**・360度評価・管理職行動要件マスタ |
| 7 | 人材育成・リスキリング | `skill-map`, `e-learning`, `global-skill-templates` | 育成計画テンプレート体系化・学習効果の可視化レポート |
| 8 | 属人化・Excel依存 | 各種ワークフロー（残業承認・スキル承認・評価承認） | **入退社ワークフロー**・人事マスタ一元管理・引き継ぎドキュメント管理 |
| 9 | 人事データの分断 | `dashboard`, `saas-dashboard` | **横断KPIダッシュボード（経営層向け）**・経営レポート自動生成 |
| 10 | 後継者・次世代リーダー不在 | `skill-map`, `evaluation` | **サクセッションプラン機能**・タレントパイプライン管理 |

---

## 2. 優先度フレームワーク

各改善アイテムを以下4軸でスコアリングし、Priority（P1〜P3）を決定する。

| 軸 | 定義 |
|----|------|
| **ビジネスインパクト** | 経営者・人事担当者の両者が「高」評価の課題を優先 |
| **開発コスト** | 既存機能拡張（Low）vs 新規機能開発（High） |
| **技術リスク** | データ統合・外部API連携の複雑度 |
| **時間対効果** | 短期間で成果が出るか |

---

## 3. 優先度付き改善アイテム一覧

### P1 — 最優先（経営インパクト大 × 開発コスト低〜中）

| ID | 改善テーマ | 対応課題 | 開発コスト | 経営者関心 | 人事関心 |
|----|-----------|---------|-----------|-----------|---------|
| P1-1 | **労務コンプライアンスダッシュボード** | #5 | Low | 中（リスク） | 高 |
| P1-2 | **離職予兆スコアリング & アラート** | #2 | Medium | 高 | 高 |
| P1-3 | **評価ワークフロー自動化（通知・リマインダー）** | #3 | Low | 中 | 高 |
| P1-4 | **横断KPIダッシュボード（経営層向け）** | #9 | Medium | 高 | 中 |
| P1-5 | **採用選考フロー進捗ダッシュボード & 辞退防止アラート** | #1 | Low | 高 | 高 |

### P2 — 中優先（経営インパクト中〜高 × 開発コスト中）

| ID | 改善テーマ | 対応課題 | 開発コスト |
|----|-----------|---------|-----------|
| P2-1 | **統合エンゲージメントダッシュボード + 改善アクション管理** | #4 | Medium |
| P2-2 | **1on1記録・テーマ管理（管理職育成支援）** | #6 | Medium |
| P2-3 | **入退社ライフサイクルワークフロー** | #8 | Medium |
| P2-4 | **育成計画テンプレート体系化 + 学習効果レポート** | #7 | Low |

### P3 — 将来優先（経営インパクト中〜高 × 開発コスト高）

| ID | 改善テーマ | 対応課題 | 開発コスト |
|----|-----------|---------|-----------|
| P3-1 | **サクセッションプラン機能** | #10 | High |
| P3-2 | **360度評価サポート** | #6 | High |
| P3-3 | **退職理由の構造的蓄積・傾向分析** | #2 | Medium |
| P3-4 | **法改正トラッキング & 通知機能** | #5 | High |

---

## 4. フェーズ別実装計画

### Phase 1：クイックウィン（1〜2ヶ月）
**目標：** 既存データ・機能を活用し、即効性の高い改善を届ける

---

#### P1-1：労務コンプライアンスダッシュボード
**対応課題：** #5 労務管理・法令対応負担

**実装内容：**
- `attendance`, `overtime` の既存データを集約した専用ダッシュボード画面（`/adm/labor-compliance`）
- 表示項目：36協定アラート（月次残業時間の上限に対する消化率）、有休取得義務進捗（10日以上付与者の5日取得率）、残業アラート閾値超過者一覧
- 違反リスクが高い従業員・部署のハイライト表示

**実装ポイント：**
```
src/features/labor-compliance/
  ├── components/LaborComplianceDashboard.tsx
  ├── components/AnnualLeaveProgressTable.tsx
  ├── components/OvertimeRiskBadge.tsx
  ├── queries.ts   # 既存 attendance/overtime データ横断クエリ
  └── types.ts
src/app/(tenant)/(colored)/adm/(labor_compliance)/labor-compliance/
  ├── page.tsx
  └── loading.tsx
```

**新規ルート追加：**
```typescript
// src/config/routes.ts
ADMIN_LABOR_COMPLIANCE: '/adm/labor-compliance',
```

---

#### P1-3：評価ワークフロー自動化
**対応課題：** #3 人事評価制度の形骸化

**実装内容：**
- 評価提出期限が近づいた際の自動リマインダー（メール通知 or 画面バナー）
- 未提出者の一覧表示と個別催促アクション
- 評価フェーズ（自己評価 → 上長評価 → 調整 → 確定）の進捗バー表示
- 差し戻し時の通知とコメント連携

**実装ポイント：**
- 既存の `src/features/evaluation/` に通知ロジックを追加
- `evaluation_sheets` テーブルに `notification_sent_at` フィールド追加（migration）
- Server Action: `sendEvaluationReminders()` を `/api/cron/evaluation-reminder` で定期実行

---

#### P1-5：採用選考フロー進捗ダッシュボード
**対応課題：** #1 採用難・人材獲得競争

**実装内容：**
- 既存 `job-postings`, `candidate-pulse` データを使った選考パイプラインビュー
- 「応募→書類選考→面接→内定→入社」各ステージの候補者数ファネル
- 「N日以上対応なし」の候補者をハイライト（辞退リスクアラート）
- 担当者別タスク一覧

**実装ポイント：**
- 既存 `src/features/candidate-pulse/` の拡張
- `candidates` テーブルに `last_action_at` フィールドを追加し、N日無対応をクエリで検出

---

### Phase 2：コア機能拡充（2〜4ヶ月）
**目標：** 複数機能のデータを統合し、予兆検知・経営可視化を実現

---

#### P1-2：離職予兆スコアリング & アラート
**対応課題：** #2 離職・定着率の悪化

**実装内容：**
- スコア算出ロジック（重み付き複合スコア）：
  - パルスサーベイスコアの低下傾向（`survey` データ）
  - ストレスチェック高ストレス判定（`stress-check` データ）
  - 残業時間の急増・急減（`overtime`/`attendance` データ）
  - アンケート未回答率の上昇
- 従業員別リスクスコア一覧（人事管理者向け）
- ハイリスク者へのアクションログ記録（対応メモ・フォローアップ予定）
- 入社3・6ヶ月の定着チェックポイント管理（`onboarding` feature 拡張）

**新規テーブル（migration）：**
```sql
-- 離職予兆スコア履歴
CREATE TABLE public.turnover_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  score NUMERIC(5,2) NOT NULL,        -- 0〜100
  risk_level TEXT NOT NULL,            -- 'low' | 'medium' | 'high'
  contributing_factors JSONB,          -- スコア構成要素の内訳
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.turnover_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.turnover_risk_scores
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees
      WHERE auth_user_id = auth.uid()
    )
  );
```

---

#### P1-4：横断KPIダッシュボード（経営層向け）
**対応課題：** #9 人事データの分断

**実装内容：**
- 新ルート `/adm/hr-kpi` に経営層向けダッシュボード
- 表示KPI：
  - 採用：応募数・選考中・内定承諾率・採用充足率
  - 定着：離職率（月次・年次）・平均在籍年数・ハイリスク者数
  - 生産性：残業時間推移・有休取得率・勤怠集計
  - エンゲージメント：最新パルスサーベイスコア（部署別）
  - 育成：スキルギャップ充足率・eラーニング受講完了率
- PDF/CSVエクスポート（経営会議資料として利用）

**実装ポイント：**
```
src/features/hr-kpi-dashboard/
  ├── components/KpiSummaryCards.tsx
  ├── components/TrendCharts.tsx      # Recharts 使用
  ├── components/DepartmentHeatmap.tsx
  ├── queries.ts   # 各 feature DBテーブルへの横断クエリ
  └── types.ts
```

**パフォーマンス注意：** 横断クエリはマテリアライズドビューまたはバッチ集計テーブルを使用し、ページロード時の重いJOINを避けること。

---

#### P2-1：統合エンゲージメントダッシュボード
**対応課題：** #4 従業員エンゲージメント低下

**実装内容：**
- パルスサーベイ・ストレスチェック・Echo設問の結果を統合スコア化
- 部署別・属性別（年代・在籍年数・職種）のヒートマップ
- スコア推移グラフ（月次・四半期）
- 課題部署への改善アクション記録と進捗管理（PDCA管理機能）

---

#### P2-2：1on1記録・テーマ管理
**対応課題：** #6 管理職・ミドルマネジメント育成不足

**実装内容：**
- 既存の育成ジャーニー（`src/features/skill-portal/`）に1on1記録機能を追加
- テーマテンプレート（コミュニケーション・目標進捗・悩み相談等）
- 上長が記録、本人もコメント可能
- 次回1on1の日程管理
- 1on1実施率の可視化（管理職サマリ）

---

#### P2-3：入退社ライフサイクルワークフロー
**対応課題：** #8 業務の属人化・非効率

**実装内容：**
- 入社手続きチェックリスト（書類収集・システム登録・備品配布・研修割り当て）
- 退社手続きチェックリスト（情報削除・備品回収・最終精算）
- 担当者へのタスク自動割り当て（部署・役割ベース）
- 完了証跡の自動保存
- 引き継ぎドキュメントのテンプレート管理

---

#### P2-4：育成計画テンプレート体系化
**対応課題：** #7 人材育成・リスキリング停滞

**実装内容：**
- 既存の `global-skill-templates` を活用した等級・職種別育成計画テンプレート
- テンプレートからワンクリックで個人育成計画を生成
- 学習履歴（eラーニング受講完了）とスキル評価結果の連動レポート
- 「投資した研修→スキル習得率」の可視化

---

### Phase 3：長期・新機能開発（4〜12ヶ月）
**目標：** 高度なタレントマネジメント機能で競合との差別化

---

#### P3-1：サクセッションプラン機能
**対応課題：** #10 後継者・次世代リーダー不在

**実装内容：**
- 重要ポジション（部長・課長・専門職等）マスタの定義
- ポジション別：後継候補の登録・準備度スコア（スキル充足率 × 評価 × 在籍年数）
- タレントパイプライン可視化（9-BoxグリッドUI）
- 育成アクションのリンク（タフアサイン・研修・メンタリング）

**新規テーブル（migration）：**
```sql
CREATE TABLE public.succession_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  required_skill_ids UUID[],
  current_holder_id UUID REFERENCES public.employees(id)
);

CREATE TABLE public.succession_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES public.succession_positions(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  readiness_score NUMERIC(5,2),   -- 0〜100
  timeline TEXT,                   -- 'ready_now' | '1_year' | '2_years'
  notes TEXT
);
```

---

#### P3-2：360度評価サポート
**対応課題：** #6 管理職育成不足

**実装内容：**
- 評価者グループ設定（上司・同僚・部下・自己）
- 無名回答オプション（フィードバックの正直さを担保）
- 既存 `src/features/evaluation/` への統合
- 管理職向けフィードバックレポート生成

---

## 5. 期待効果サマリー

| フェーズ | 主な改善テーマ | 経営者へのインパクト | 人事担当者へのインパクト |
|---------|---------------|-------------------|----------------------|
| Phase 1 | 労務コンプライアンス・採用進捗・評価通知 | コンプライアンスリスク軽減 | 定型業務の工数削減 |
| Phase 2 | 離職予兆・KPIダッシュボード・1on1 | データドリブン経営の基盤 | 予防的HR管理への転換 |
| Phase 3 | サクセッション・360度評価 | 後継者問題の計画的解決 | 組織開発機能の高度化 |

---

## 6. 技術的注意事項

### 横断クエリのパフォーマンス
- KPIダッシュボード・離職予兆スコアは複数テーブルを跨ぐため、マテリアライズドビューの活用を検討
- スコア再計算はバックグラウンドジョブ（`/api/cron/`）で定期実行し、結果をキャッシュテーブルに保存

### RLS整合性
- 横断クエリでも `tenant_id` による分離を維持すること
- スコアリングテーブルにもRLSポリシーを必ず設定

### 通知機能
- メール通知には既存の `src/lib/mail/` を活用
- in-app通知はSupabase Realtime（WebSocket）を検討

### マイグレーション
- 各フェーズ開始前にマイグレーションをレビューし、`supabase migration new` で作成
- `supabase db reset` は絶対に使用しない

---

## 7. 次のアクション

| 順序 | アクション | 目標 |
|-----|-----------|------|
| 1 | P1-1 労務コンプライアンスダッシュボードの要件確定・DB設計 | Phase 1 開始時 |
| 2 | P1-3 評価ワークフロー通知のmigration作成と実装 | Phase 1 開始時 |
| 3 | P1-5 採用パイプライン進捗ビューの既存データ調査 | Phase 1 開始時 |
| 4 | P1-2 離職予兆スコアのアルゴリズム設計（重み係数の検討） | Phase 2 開始前 |
| 5 | P1-4 横断KPIダッシュボードのKPI定義確認 | Phase 2 開始前 |

---

*このドキュメントは実装の進捗に応じて随時更新する。*
