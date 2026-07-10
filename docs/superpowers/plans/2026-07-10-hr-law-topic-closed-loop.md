# 監視トピック閉ループ＋文書鮮度 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** チャット/厚労省新着から監視トピック候補を提案し SaaS 管理者が承認・手動CRUDでき、週次ジョブが既存文書を ETag/hash ハイブリッドで最新化する。

**Architecture:** 既存 `hr-law-refresh` / `hr-assistant-template-mining` を拡張。`hr_law_topic_proposals` を承認ゲートにし、sources は自動追加しない。鮮度は HEAD→hash→変化時のみ再要約。

**Tech Stack:** Next.js 16 Server Actions、Supabase (Postgres + RLS + Edge Functions Deno)、OpenRouter web_search

**Spec:** `docs/superpowers/specs/2026-07-10-hr-law-topic-closed-loop-design.md`

## Global Constraints

- `supabase db reset` 禁止。`supabase migration up` のみ
- 本機能の SaaS 画面は既存どおり `createAdminClient` 可（RLS バイパス）
- 日本語コメント。URL は `APP_ROUTES`
- SEO 自動取込・トピック自動追加・物理削除はスコープ外

---

## File map

| File                                                              | Responsibility           |
| ----------------------------------------------------------------- | ------------------------ |
| `supabase/migrations/20260710200000_hr_law_topic_closed_loop.sql` | proposals・列追加・RLS   |
| `supabase/functions/hr-law-refresh/topic-key.ts`                  | topic 正規化             |
| `supabase/functions/hr-law-refresh/freshness.ts`                  | HEAD/ETag/hash 鮮度      |
| `supabase/functions/hr-law-refresh/proposals.ts`                  | 厚労省新着 → proposals   |
| `supabase/functions/hr-law-refresh/index.ts`                      | オーケストレーション     |
| `supabase/functions/hr-assistant-template-mining/index.ts`        | themes → proposals       |
| `src/features/saas-law-knowledge/*`                               | types/queries/actions/UI |
| `docs/implementation-plan-ai-hr-assistant-evolution.md`           | PRD 追記                 |

---

### Task 1: DB migration

**Files:** Create `supabase/migrations/20260710200000_hr_law_topic_closed_loop.sql`

- [ ] sources: `updated_at`, `disabled_at`, `origin`
- [ ] documents: `http_etag`, `http_last_modified`, `content_checked_at` + index
- [ ] logs: `freshness_checked`, `documents_updated`, `proposals_created`
- [ ] `hr_law_topic_proposals` + pending unique on `topic_key` + RLS（ポリシー無し＝service_role/admin のみ。`hr_law_refresh_logs` と同パターン）
- [ ] `supabase migration up`
- [ ] Commit

### Task 2: Edge freshness

**Files:** `topic-key.ts`, `freshness.ts`, wire `index.ts`

- [ ] `normalizeTopicKey`
- [ ] 鮮度チェック 30件/回、失敗時は旧文書維持
- [ ] ログカウンタ
- [ ] Commit

### Task 3: MHLW proposals

**Files:** `proposals.ts`, wire `index.ts`

- [ ] web_search → 候補最大3 → enabled sources と重複除外 → pending upsert
- [ ] Commit

### Task 4: template-mining → proposals

- [ ] themes upsert `source=chat`
- [ ] Commit

### Task 5–6: SaaS actions + UI

- [ ] create/disable/enable source, approve/reject proposal
- [ ] タブ「トピック候補」、監視トピック CRUD UI
- [ ] Commit

### Task 7: PRD + types

- [ ] PRD 追記、types 再生成（可能なら）
- [ ] Commit

## Spec coverage

| Spec             | Task |
| ---------------- | ---- |
| DB + RLS         | 1    |
| ハイブリッド鮮度 | 2    |
| 厚労省新着提案   | 3    |
| チャット themes  | 4    |
| 承認/CRUD/UI     | 5–6  |
| PRD              | 7    |
