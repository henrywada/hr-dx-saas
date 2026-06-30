# エンタープライズ拡張 実装計画（PRD）

> 参照: `implementation-plan-four-features-backlog.md`（O-C1 / EV-C1 / EL-C1）
> 最終更新: 2026-06-30

## 1. 問題定義

4機能（1on1 / 評価 / スキル / eラーニング）の運用レベル MVP は完了済み。エンタープライズプラン向けに、**通知・事前共有・修了証** など運用深度を高める Could 項目を実装する。

## 2. スコープ（フェーズ1）

| ID | 内容 | 方針 |
| --- | --- | --- |
| O-C1 | 1on1 リマインド通知・アジェンダ事前共有 | `one_on_one_upcoming` テーブル + メール送信 |
| EV-C1 | 評価リマインドメール | 既存 `evaluation_reminders` ログに加え SMTP 送信 |
| EL-C1 | 修了証 PDF | ブラウザ印刷（日本語対応）方式 |

## 2. スコープ（フェーズ2 — 2026-06-30）

| ID | 内容 | 状態 |
| --- | --- | --- |
| O-C2 | 1on1 AI 要約 | ✅ 完了 |
| SK-S1 | 資格管理 UI | ✅ 完了 |
| SK-C1 | skill_map_drafts 保存・一覧 | ✅ 完了 |
| E-O2 | イベント RSVP 回答率 KPI | ✅ 完了 |

**スコープ外（後続）:** EL-C2 SCORM / xAPI

## 3. データモデル

### one_on_one_upcoming

| カラム | 型 | 説明 |
| --- | --- | --- |
| scheduled_at | TIMESTAMPTZ | 予定日時 |
| theme | TEXT | テーマ |
| agenda | TEXT | 事前共有アジェンダ |
| status | TEXT | scheduled / cancelled / completed |
| reminded_at | TIMESTAMPTZ | 最終リマインド送信日時 |

RLS: テナント内かつ（対象従業員 OR 記録管理職 OR HR ロール）

### evaluation_reminders 拡張

| カラム | 型 | 説明 |
| --- | --- | --- |
| email_sent | BOOLEAN | メール送信成功フラグ |
| email_error | TEXT | 送信失敗理由 |

## 4. 成功指標

- 1on1 予定登録 → 従業員が `/my-one-on-one` でアジェンダ確認可能
- 評価催促 → メール送信成功時 `email_sent=true` が記録される
- eラーニング修了 → 修了証印刷が可能
