# SEOキー分析 → トピック候補 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SaaS管理画面の「トピック候補」から SerpAPI 関連検索を集約して人事系 SEO 近似 TOP10 を取得し、未登録のみを `hr_law_topic_proposals`（`source='seo'`）へ pending 追加する。

**Architecture:** Server Action が SerpAPI（固定シード5語）→ 頻度集計 TOP10 → 有効監視トピック／pending と `normalizeTopicKey` 突合 → `createAdminClient` で INSERT。UI は説明文右のボタン＋分析中表示。承認は既存フロー。

**Tech Stack:** Next.js Server Actions, SerpAPI `engine=google`, Supabase Admin client, Tailwind（AWS 風シャープ）

## Global Constraints

- `supabase db reset` 禁止。マイグレーションは `supabase migration up`
- エンドユーザー向け actions では `createAdminClient` 禁止だが、本機能は **SaaS管理者専用** のため既存 `saas-law-knowledge/actions.ts` と同様に許可
- URL ハードコード禁止（画面遷移は `APP_ROUTES`）。SerpAPI エンドポイントは外部 API のため定数で可
- コメントは日本語
- 仕様正本: `docs/superpowers/specs/2026-07-10-hr-law-seo-keyword-analysis-design.md`

## File Structure

| ファイル                                                                   | 責務                                          |
| -------------------------------------------------------------------------- | --------------------------------------------- |
| `supabase/migrations/20260710221000_hr_law_topic_proposals_source_seo.sql` | `source` CHECK に `seo` 追加                  |
| `src/features/saas-law-knowledge/seo-keyword-rank.ts`                      | 関連語の集計・TOP10（純関数・単体テスト対象） |
| `src/features/saas-law-knowledge/seo-keyword-rank.test.ts`                 | TOP10 集計の単体テスト                        |
| `src/features/saas-law-knowledge/actions.ts`                               | `analyzeSeoKeywordsForTopicProposals`         |
| `src/features/saas-law-knowledge/types.ts`                                 | `source: 'seo'`                               |
| `src/features/saas-law-knowledge/components/LawTopicProposalList.tsx`      | ボタン・ローディング・ラベル                  |

---

### Task 1: DB — source に seo を追加

**Files:**

- Create: `supabase/migrations/20260710221000_hr_law_topic_proposals_source_seo.sql`

**Interfaces:**

- Produces: `hr_law_topic_proposals.source` が `'chat' | 'mhlw_discover' | 'seo'` を許可

- [ ] **Step 1: マイグレーション SQL を作成**

```sql
-- hr_law_topic_proposals.source に seo を追加
ALTER TABLE public.hr_law_topic_proposals
  DROP CONSTRAINT IF EXISTS hr_law_topic_proposals_source_check;

ALTER TABLE public.hr_law_topic_proposals
  ADD CONSTRAINT hr_law_topic_proposals_source_check
  CHECK (source IN ('chat', 'mhlw_discover', 'seo'));

COMMENT ON TABLE public.hr_law_topic_proposals IS
  '監視トピック候補。チャット需要・厚労省新着・SEOキー分析から提案し、SaaS管理者が承認して hr_law_sources へ反映する';
```

- [ ] **Step 2: 適用（db reset しない）**

Run: `supabase migration up`  
Expected: 新マイグレーションが適用される（エラーなし）

- [ ] **Step 3: Commit（ユーザーが依頼した場合のみ）**

```bash
git add supabase/migrations/20260710221000_hr_law_topic_proposals_source_seo.sql
git commit -m "$(cat <<'EOF'
feat(hr-law): allow seo source on topic proposals

EOF
)"
```

---

### Task 2: 純関数 — 関連語 TOP10 集計

**Files:**

- Create: `src/features/saas-law-knowledge/seo-keyword-rank.ts`
- Create: `src/features/saas-law-knowledge/seo-keyword-rank.test.ts`

**Interfaces:**

- Produces:
  - `normalizeSeoTopicKey(topic: string): string`
  - `rankSeoKeywords(rawTerms: string[], options: { seedKeys: Set<string>; limit?: number }): Array<{ topic: string; topicKey: string; hitCount: number; rank: number }>`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { rankSeoKeywords, normalizeSeoTopicKey } from './seo-keyword-rank'

describe('rankSeoKeywords', () => {
  it('出現頻度で TOP を決め、シード語は除外する', () => {
    const seedKeys = new Set([normalizeSeoTopicKey('人事')])
    const ranked = rankSeoKeywords(
      ['働き方改革', '働き方改革', '残業代', '人事', '残業代', '残業代'],
      { seedKeys, limit: 10 }
    )
    assert.equal(ranked[0].topic, '残業代')
    assert.equal(ranked[0].hitCount, 3)
    assert.equal(ranked[0].rank, 1)
    assert.equal(ranked[1].topic, '働き方改革')
    assert.ok(!ranked.some(r => r.topicKey === normalizeSeoTopicKey('人事')))
  })
})
```

- [ ] **Step 2: テスト実行（失敗確認）**

Run: `node --import tsx --test src/features/saas-law-knowledge/seo-keyword-rank.test.ts`  
Expected: FAIL（モジュール未存在）

- [ ] **Step 3: 実装**

```ts
/** トピック正規化（監視トピック突合用） */
export function normalizeSeoTopicKey(topic: string): string {
  return topic
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\u3000_\-・/／|｜,，.。:：;；()（）\[\]【】「」『』"'`]+/g, '')
    .trim()
}

export type RankedSeoKeyword = {
  topic: string
  topicKey: string
  hitCount: number
  rank: number
}

/** 関連語を集計し TOP N を返す（シード語は除外） */
export function rankSeoKeywords(
  rawTerms: string[],
  options: { seedKeys: Set<string>; limit?: number }
): RankedSeoKeyword[] {
  const limit = options.limit ?? 10
  const counts = new Map<string, { topic: string; hitCount: number }>()

  for (const raw of rawTerms) {
    const topic = (raw ?? '').trim()
    if (!topic) continue
    const topicKey = normalizeSeoTopicKey(topic)
    if (!topicKey || options.seedKeys.has(topicKey)) continue
    const prev = counts.get(topicKey)
    if (prev) prev.hitCount += 1
    else counts.set(topicKey, { topic, hitCount: 1 })
  }

  return [...counts.entries()]
    .map(([topicKey, v]) => ({ topicKey, topic: v.topic, hitCount: v.hitCount }))
    .sort((a, b) => b.hitCount - a.hitCount || a.topic.localeCompare(b.topic, 'ja'))
    .slice(0, limit)
    .map((item, i) => ({ ...item, rank: i + 1 }))
}
```

- [ ] **Step 4: テスト成功確認**

Run: `node --import tsx --test src/features/saas-law-knowledge/seo-keyword-rank.test.ts`  
Expected: PASS

---

### Task 3: Server Action — SerpAPI + 候補 INSERT

**Files:**

- Modify: `src/features/saas-law-knowledge/actions.ts`
- Modify: `src/features/saas-law-knowledge/types.ts`

**Interfaces:**

- Consumes: `rankSeoKeywords`, `normalizeSeoTopicKey` from `./seo-keyword-rank`
- Produces: `analyzeSeoKeywordsForTopicProposals(): Promise<SeoAnalyzeResult>`

- [ ] **Step 1: types.ts の source を拡張** — `'seo'` を追加

- [ ] **Step 2: actions.ts に Serp 取得と Action を追加**

定数シード: `人事`, `労務`, `労働基準法`, `働き方改革`, `社会保険`  
SerpAPI: `engine=google`, `hl=ja`, `gl=jp`  
`related_searches[].query` + `related_questions[].question`  
有効 `hr_law_sources` と pending の `topic_key` と突合し未登録のみ INSERT（`source='seo'`）  
戻り値: `{ ok, topCount, added, skipped, keywords }` または `{ ok:false, error }`  
ローカル `normalizeTopicKey` は `normalizeSeoTopicKey` に置換

- [ ] **Step 3: 型チェック** — `npm run type-check`

---

### Task 4: UI — SEOキー分析ボタン

**Files:**

- Modify: `src/features/saas-law-knowledge/components/LawTopicProposalList.tsx`

**Interfaces:**

- Consumes: `analyzeSeoKeywordsForTopicProposals`

- [ ] **Step 1: SOURCE_LABEL.seo = 'SEOキー分析'**、説明行を flex（左テキスト・右ボタン）

- [ ] **Step 2: 分析中は disabled + スピナー +「分析中…」、完了メッセージ表示**

- [ ] **Step 3: 手動確認** — ボタン → 候補追加 → 再実行で二重なし → 承認フロー

---

## Spec coverage (self-review)

| Spec 要件                       | Task                          |
| ------------------------------- | ----------------------------- |
| SerpAPI + related_searches 集約 | Task 3                        |
| TOP10・シード除外               | Task 2–3                      |
| 監視トピック／pending 比較      | Task 3                        |
| `source='seo'` + migration      | Task 1                        |
| ボタン右寄せ・分析中 UI         | Task 4                        |
| 承認は既存                      | 変更なし（Task 4 ラベルのみ） |

Commit ステップはユーザー依頼時のみ実行する。
