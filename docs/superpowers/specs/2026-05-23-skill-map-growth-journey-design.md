# スキルマップ「育成ジャーニー」機能 設計書

**作成日**: 2026-05-23  
**対象プロジェクト**: HR-DX SaaS

---

## 1. Context（背景・目的）

### コンセプト
「上司は先駆けとし、従業員をリードし、能力向上を支援・伴走する」

現在のスキルマップ機能はHR管理者視点のツール（分析・ボトルネック・シミュレータ）として実装されており、上司と従業員の**日常的な育成対話**を支援するUIになっていない。  
特に上司の画面（`/skill-approvals`）は「承認者」としての役割しか表現できておらず、「先導者・伴走者」というコンセプトが反映されていない。

### 実現する5つのコンセプト
1. 従業員が目標を設定する（上司が提案 → 従業員が承認）
2. 目標達成に向け、上司はアドバイスする
3. 上司・従業員と共に進捗を常にモニターする
4. 従業員が行き詰まった時、上司に気軽に相談できる環境
5. 目標に向けた手段・方法は「臨機応変に変更できる」環境

### 上司の定義
直属の上長（チームリーダー・係長相当）。`skill_approvers.approver_id` で定義される。

### 既存データの状況
以下のテーブルは**実装済み**（データ構造は揃っているがUIが不足）：
- `employee_career_goals` — 目標職種・期限
- `employee_skill_requirement_history` — 月次進捗スナップショット
- `skill_feedback_comments` — 上司フィードバック（category: `1on1` / `career_goal`）
- `skill_approvers` — 上司と従業員の関係定義
- `employee_skill_self_evaluations` — 自己評価
- `employee_recommended_courses` — 推奨コース

**不足しているテーブル**：
- `skill_growth_milestones` — マイルストーン管理（新規）
- `skill_consultations` — 相談（SOS）管理（新規）

---

## 2. 変更範囲の整理

### A. 既存画面の改善（UI・説明文の改修）

| 既存URL | 既存コンポーネント | 改善内容 |
|---|---|---|
| `/skill-approvals` | `SkillApprovalsView` | 承認リストの上部にチーム育成カードグリッドを追加。ページタイトル・説明文を「先導者」視点に変更 |
| `/my-skills` | `MySkillsView` | キャリアタブに「育成ジャーニーを見る」ボタンを追加。ページ説明文を「伴走」視点に変更 |

### B. 新規作成（育成ジャーニーボード）

| 新規URL | 対象ユーザー | 説明 |
|---|---|---|
| `/skill-approvals/journey/[employeeId]` | 上司 | 担当メンバーの育成ジャーニーボード（上司ビュー） |
| `/my-skills/journey` | 従業員 | 自分の育成ジャーニーボード（従業員ビュー） |
| `/skill-approvals/journey/[employeeId]/propose` | 上司 | 目標・マイルストーン提案フォーム |
| `/my-skills/journey/consult` | 従業員 | 上司への相談（SOS）送信画面 |

---

## 3. 画面設計

### 3-1. 既存改善：`/skill-approvals` — チーム育成ダッシュボード

**変更前**: 承認待ち申請リスト（職種申請タブ・要件申請タブ）のみ  
**変更後**: 上部にカードグリッド追加、既存の承認リストは「承認タスク」タブとして残す

#### ページヘッダー変更
```
変更前タイトル: 「スキル承認」
変更後タイトル: 「チームの育成状況」
変更後サブタイトル: 「あなたが先導するメンバーの成長をここで確認・サポートします」
```

#### チーム育成カードグリッド
- `skill_approvers WHERE approver_id = 自分` で担当メンバーを取得
- メンバーごとに1枚のカードを表示（3列グリッド）
- カード内容：
  - 氏名
  - ステータスバッジ（相談あり🔴 / 進行中🟡 / 順調🟢 / 目標未設定⚪）
  - 目標職種・期限
  - 要件達成率プログレスバー（`employee_skill_requirement_history` 最新値）
  - 「相談あり」の場合のみ「今すぐ返答する」ボタン表示
- カードクリック → `/skill-approvals/journey/[employeeId]` へ遷移
- 「＋ 目標を提案する」カード → propose フォームへ遷移

#### 承認タスクタブ（既存機能を保持）
既存の `SkillApprovalsView` の職種申請・要件申請タブはそのまま「承認タスク」タブとして残す

---

### 3-2. 既存改善：`/my-skills` — マイスキルポータル

**変更内容**:
- キャリアタブの説明文変更：「キャリア目標を設定し、上司と一緒に成長の旅を歩みましょう」
- 目標設定済みの場合、目標職種・達成率をサマリー表示
- 「育成ジャーニーを確認する →」ボタンを追加 → `/my-skills/journey` へ遷移
- 上司からの未読アドバイス件数をバッジ表示

---

### 3-3. 新規：育成ジャーニーボード（上司・従業員共通レイアウト）

**2カラムレイアウト**（左220px サイドバー + 右メインエリア）

#### 左サイドバー
| 要素 | 上司ビュー | 従業員ビュー |
|---|---|---|
| 目標カード（blue）達成率・期限 | ✅ | ✅ |
| 今月の変化（先月比±%） | ✅ | ✅ |
| 💬 上司に相談するボタン | 非表示 | ✅ |
| 推奨コース（最新1件） | ✅ | ✅ |

#### 右メインエリア
| セクション | 内容 |
|---|---|
| 育成ロードマップ | `skill_growth_milestones` のステップ一覧（タイムライン形式） |
| 上司からのアドバイス | `skill_feedback_comments` (category: `1on1` / `career_goal`) |

#### マイルストーンタイムライン
```
✅ STEP1（completed）→ 上司コメント付き
⏳ STEP2（in_progress）→ サブ進捗バー + アクションボタン
🔒 STEP3（未開始）→ 前ステップ完了後に開放
```

#### 役割別ボタン出し分け

| 機能 | 上司 | 従業員 |
|---|---|---|
| ＋ ステップ変更・追加 | ✅ | ❌ |
| 自己評価を更新 | ❌ | ✅ |
| 💬 上司に相談する（SOSボタン） | ❌ | ✅ |
| アドバイスコメントを送る | ✅ | ❌ |
| SOS返答ボタン（未読時） | ✅ | ❌ |
| ← チーム育成一覧 | ✅ | ❌ |
| ← マイスキルに戻る | ❌ | ✅ |

---

### 3-4. 新規：目標・マイルストーン提案フォーム（上司のみ）

**URL**: `/skill-approvals/journey/[employeeId]/propose`  
**アクセス制御**: `skill_approvers.approver_id = 自分` の担当者のみ

**フォーム項目**:
1. 対象メンバー（表示のみ）
2. 目標職種（`tenant_skills` から選択）
3. 達成期限（date picker）
4. マイルストーン（動的追加・削除可）— 各行：タイトル + 期限
5. メンバーへのメッセージ（任意）

**提案後の処理**:
- `employee_career_goals` にステータス `proposed` で保存
- `skill_growth_milestones` に各ステップを `proposed` で保存
- 従業員の `/my-skills/journey` に「上司から目標提案が届きました」バナーを表示
- 従業員が「承認する」を押すと `confirmed` → `active` に更新

---

### 3-5. 新規：相談（SOS）画面（従業員のみ）

**URL**: `/my-skills/journey/consult`

**フォーム**:
1. 悩みのカテゴリ（タグ選択・複数可）
   - 「要件の達成方法がわからない」
   - 「スケジュールを変えたい」
   - 「目標自体を変えたい」
   - 「モチベーションが下がっている」
   - 「その他」
2. 詳細テキスト（任意）
3. 「相談を送る」ボタン

**送信後**:
- `skill_consultations` に保存
- 上司のカード（`/skill-approvals`）に「🚨 相談あり」バッジ表示

**過去の相談履歴**（ページ下部）:
- 相談テキスト → 上司の返答 → ステータス（未返答 / 解決済み）

---

## 4. データモデル変更

### 新規テーブル: `skill_growth_milestones`

```sql
CREATE TABLE public.skill_growth_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id),
  employee_id   UUID NOT NULL REFERENCES public.employees(id),
  title         TEXT NOT NULL,
  description   TEXT,
  target_date   DATE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'proposed'
                CHECK (status IN ('proposed', 'confirmed', 'in_progress', 'completed', 'changed')),
  proposed_by   UUID NOT NULL REFERENCES public.employees(id),
  confirmed_at  TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.skill_growth_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.skill_growth_milestones
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees
      WHERE auth_user_id = auth.uid()
    )
  );
```

### 既存テーブル変更: `employee_career_goals`

```sql
ALTER TABLE public.employee_career_goals
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('proposed', 'confirmed', 'active', 'achieved')),
  ADD COLUMN IF NOT EXISTS proposed_by UUID REFERENCES public.employees(id),
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS message TEXT;
```

### 新規テーブル: `skill_consultations`

```sql
CREATE TABLE public.skill_consultations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  employee_id     UUID NOT NULL REFERENCES public.employees(id),
  manager_id      UUID NOT NULL REFERENCES public.employees(id),
  category_tags   TEXT[] NOT NULL DEFAULT '{}',
  message         TEXT,
  manager_reply   TEXT,
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'replied', 'resolved')),
  replied_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.skill_consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_or_manager" ON public.skill_consultations
  FOR ALL USING (
    employee_id = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
    OR
    manager_id  = (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
  );
```

---

## 5. アクセス制御設計

### `skill_approvers` による権限チェック

**上司が `/skill-approvals/journey/[employeeId]` にアクセスする場合**（`queries.ts` 内）:
```typescript
const { data: approverRecord } = await supabase
  .from('skill_approvers')
  .select('id')
  .eq('approver_id', currentUser.employee_id)
  .eq('employee_id', employeeId)
  .single()

if (!approverRecord) throw new Error('403 Forbidden')
```

**従業員は自分のデータのみ**:
- `/my-skills/journey` は `getServerUser()` の `employee_id` に固定
- URLパラメータによる他者データへのアクセスは設計上不可

---

## 6. ファイル構成（新規・変更）

```
src/
├── app/(tenant)/
│   ├── (default)/(skill_portal)/
│   │   ├── my-skills/
│   │   │   └── page.tsx                         ← 既存改修
│   │   ├── my-skills/journey/
│   │   │   ├── page.tsx                         ← 新規
│   │   │   ├── loading.tsx                      ← 新規
│   │   │   └── consult/
│   │   │       └── page.tsx                     ← 新規
│   │   └── skill-approvals/
│   │       └── page.tsx                         ← 既存改修
│   └── (colored)/adm/(skill_map)/
│       └── skill-map/
│           └── journey/
│               └── [employeeId]/
│                   ├── page.tsx                 ← 新規
│                   ├── loading.tsx              ← 新規
│                   └── propose/
│                       └── page.tsx             ← 新規
│
├── features/skill-portal/
│   ├── components/
│   │   ├── MySkillsView.tsx                     ← 既存改修
│   │   ├── SkillApprovalsView.tsx               ← 既存改修
│   │   ├── GrowthJourneyBoard.tsx               ← 新規（共通ジャーニーボード）
│   │   ├── MilestoneTimeline.tsx                ← 新規
│   │   ├── TeamGrowthGrid.tsx                   ← 新規（チーム育成カードグリッド）
│   │   ├── ProposeGoalForm.tsx                  ← 新規
│   │   └── ConsultationForm.tsx                 ← 新規
│   ├── queries.ts                               ← 既存拡張
│   └── actions.ts                               ← 既存拡張
│
└── config/routes.ts                             ← 新規URL追加
```

---

## 7. routes.ts 追加定数

```typescript
MY_SKILLS_JOURNEY: '/my-skills/journey',
MY_SKILLS_JOURNEY_CONSULT: '/my-skills/journey/consult',
SKILL_JOURNEY: (employeeId: string) => `/adm/skill-map/journey/${employeeId}`,
SKILL_JOURNEY_PROPOSE: (employeeId: string) => `/adm/skill-map/journey/${employeeId}/propose`,
```

---

## 8. 実装順序（推奨）

1. **マイグレーション** — `skill_growth_milestones`・`skill_consultations` 作成、`employee_career_goals` カラム追加
2. **routes.ts** — 新規URL定数追加
3. **queries.ts 拡張** — ジャーニーボード用データ取得処理
4. **actions.ts 拡張** — 提案・相談・マイルストーン更新アクション
5. **MilestoneTimeline コンポーネント** — タイムライン表示
6. **GrowthJourneyBoard コンポーネント** — 共通ボード（役割分岐ロジック含む）
7. **TeamGrowthGrid コンポーネント** — チーム育成カード一覧
8. **SkillApprovalsView 改修** — カードグリッドを上部に追加
9. **MySkillsView 改修** — ジャーニー導線・説明文変更
10. **ProposeGoalForm** — 目標提案フォーム
11. **ConsultationForm** — SOS相談フォーム
12. **page.tsx 群** — 各新規ルートのページ作成

---

## 9. 検証方法

- [ ] 上司ログインで `/skill-approvals` にカードグリッドが表示される
- [ ] カードクリックで上司ジャーニーボードに遷移できる
- [ ] 担当外の `employeeId` にアクセスすると 403 になる
- [ ] 上司が目標提案 → 従業員画面に提案バナーが表示される
- [ ] 従業員が承認 → ステータスが `active` に更新される
- [ ] 従業員がSOSを送る → 上司カードに「🚨 相談あり」が表示される
- [ ] 従業員ログインで `/my-skills/journey` は自分のデータのみ表示される
- [ ] マイルストーン変更提案が `proposed` 状態で保存され、従業員同意で `confirmed` になる
- [ ] 他の従業員のURLを直接入力しても自分のデータしか見えない
