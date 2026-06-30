# ウェルビーイング・キャリア面談 Should/Could バックログ

> ロードマップ: `docs/feature-blocks-development-roadmap.md` 優先度1・3 の残件整理
> 作成日: 2026-06-30
> 最終更新: 2026-06-30（CR-M1, D-S1, D-S2, E-S1, CR-S2, K-S1 完了）

優先度1（ウェルビーイング4機能）・優先度3（キャリア面談）の MVP は完了済み。以下は Should/Could および連携強化のバックログ。

**2026-06-30 消化済み:** CR-M1, D-S1, D-S2, E-S1, CR-S2, K-S1, C-S1, K-S2, E-S2, K-C1, K-C2, C-C1, E-C1, CR-C1, L-S1, L-S2, L-S3, L-S4

---

## 優先度1: ウェルビーイング

### 感謝・称賛（Kudos）

| ID | 優先度 | 内容 | 参照 PRD |
| --- | --- | --- | --- |
| K-S1 | Should | 値タグ（称賛カテゴリ）のテナント管理者マスタ設定 | ✅ 完了 | `implementation-plan-recognition-kudos.md` Should #6 |
| K-S2 | Should | 受信者への通知強化（お知らせ連携、push 相当） | ✅ 完了 | Should #4 |
| K-C1 | Could | 月次 MVP 自動サジェスト（表彰候補） | ✅ 完了 | Could #7 |
| K-C2 | Could | hr-kpi への Kudos 指標追加 | ✅ 完了 | — |

### コンディション記録

| ID | 優先度 | 内容 | 参照 PRD |
| --- | --- | --- | --- |
| C-S1 | Should | pulse-stress クロス分析（コンディション × ストレス） | ✅ 完了 | `implementation-plan-condition-checkin.md` Should #5 |
| C-C1 | Could | 急激なスコア低下時の産業医アラート | ✅ 完了 | Could #6 |

### 相談窓口

| ID | 優先度 | 内容 | 参照 PRD |
| --- | --- | --- | --- |
| D-S1 | Should | カテゴリ別・月次匿名集計ダッシュボード | ✅ 完了 | `implementation-plan-consultation-desk.md` Should #5 |
| D-S2 | Should | 匿名相談のステータス確認 URL（トークンベース） | ✅ 完了 | Must #3（MVP 未実装部分） |
| D-N1 | Note | 匿名相談ステータス確認 | ✅ 設計判断完了 — トークン URL 正式採用（D-S2 実装済み） |

### 社内イベント・表彰

| ID | 優先度 | 内容 | 参照 PRD |
| --- | --- | --- | --- |
| E-S1 | Should | イベント更新・削除 Server Actions | ✅ 完了 | `implementation-plan-internal-events-awards.md` |
| E-S2 | Should | Kudos 連携による表彰候補自動サジェスト | ✅ 完了 | Should #5 |
| E-C1 | Could | カレンダービュー | ✅ 完了 | Could #7 |
| E-O1 | Open | 部署スコープイベントの要否 | ✅ v2 実装済み（`audience_type` + `division_id`、§9 参照） |

---

## 優先度3: キャリア面談

| ID | 優先度 | 内容 | 備考 |
| --- | --- | --- | --- |
| CR-M1 | Must（残） | `docs/implementation-plan-career-discussions.md` PRD 作成 | ✅ 完了 | 実装後の正本ドキュメント整備 |
| CR-S1 | Should | 面談予約・スケジューリング（1on1 基盤再利用） | ✅ 完了 | ロードマップ §4.3 で指摘 |
| CR-S2 | Should | 面談記録の更新・削除 | ✅ 完了 | 現状 insert のみ |
| CR-S3 | Should | 1on1 セッションとの明示的連携（同一画面から参照） | ✅ 完了 | — |
| CR-C1 | Could | `/adm` トップカード表示 | ✅ 完了 | P6 PRD + 予約件数・90日未実施数を追加 |

---

## 優先度4 残件（参考）

| ID | 優先度 | 内容 |
| --- | --- | --- |
| L-S1 | Should | ライフサイクルタスクの期限日（`due_date`）UI | ✅ 完了 |
| L-S2 | Should | 担当者変更 UI（`updateTaskAssignee` 既存） | ✅ 完了 |
| L-S3 | Should | 採用（offer-validation）→ lifecycle 自動連携 | ✅ 完了 | 内定後CTA + 従業員登録時入社フロー自動開始 |
| L-S4 | Should | 退職時オフボーディング自動化 | ✅ 完了 | inactive 変更時に退社フロー自動開始 |

---

## 推奨消化順（更新 2026-06-30）

~~1. CR-M1~~ ✅  
~~2. D-S2 / D-S1~~ ✅  
~~3. CR-S1~~ ✅  
~~4. C-S1, K-S2~~ ✅  
~~5. E-S2, K-C1~~ ✅

---

## 9. 設計判断（ADR）— 2026-06-30

残っていたオープンクエスチョンの結論。**E-O1 v2（部署スコープ）は 2026-06-30 実装済み**。D-N1 / E-O2 は設計判断のみ。

### E-O1: 部署スコープイベントの要否

| 項目 | 結論 |
| --- | --- |
| **v1 判定（2026-06-30）** | 当初 Won't（全社のみ）。タイトル・説明での対象明示を推奨 |
| **v2 実装（2026-06-30）** | ✅ **`audience_type: 'tenant' \| 'division'` + `division_id`**。マイグレーション `20260630210000_add_internal_events_audience_scope.sql` |
| **RLS** | 全社 OR 従業員所属部署が一致、または配下部署（再帰 CTE `employee_can_view_division_event`）。HR（`hr`/`hr_manager`）は全イベント閲覧可 |
| **UI** | 管理画面: 対象範囲ラジオ + 部署セレクト。従業員: 一覧・カレンダーに対象バッジ |
| **制約** | 複数部署指定は v2 スコープ外（1 部署 + 配下のみ） |

### D-N1: 匿名相談のステータス確認方式

| 項目 | 結論 |
| --- | --- |
| **判定** | **トークン方式を正式採用（D-S2 で実装済み）** |
| **URL** | `/p/consultation/status?token=<uuid>`（認証不要・本文非表示） |
| **併存** | 記名相談は従来どおり `/consultation` ログイン後一覧。匿名のみトークン URL を相談完了画面で提示 |
| **routing v2** | 宛先選択・claim は v2 設計どおり。トークン確認は claim 前後どちらでも status/category のみ返す（現行） |

### E-O2: イベント参加率の組織分析連携（PRD Should #6 相当）

| 項目 | 結論 |
| --- | --- |
| **v2 実装（2026-06-30）** | ✅ `/adm/hr-kpi` エンゲージメントに「直近90日 RSVP 回答率」を追加 | |
| **理由** | 参加率 KPI はイベント数が少ない初期テナントでは意味が薄い。E-O1 確定後に部署別集計の要否とセットで設計する |
| **v2 案** | `features/engagement/` または `/adm/hr-kpi` エンゲージメントに「直近90日 RSVP 回答率」を追加。データソース: `internal_event_attendees` |

### バックログ表の更新

| ID | 旧状態 | 新状態 |
| --- | --- | --- |
| E-O1 | Open | ✅ v2 実装済み（部署スコープ + RLS） |
| D-N1 | Note | ✅ 設計判断完了（トークン正式採用） |
| E-O2 | （未記載） | ✅ v2 実装済み（hr-kpi RSVP 回答率） |
