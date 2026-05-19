# ④ 従業員スキルセルフポータル 設計

**日付:** 2026-05-19  
**対象機能:** スキルマップ × 従業員セルフ申請  
**ステータス:** 設計確定

---

## 概要

従業員が「職種割り当て」「要件達成」を自ら申請し、上長→人事の2段階承認を経てスキルマップに反映する仕組みを追加する。

---

## アーキテクチャ方針

**アプローチB（申請テーブル2本分離）** を採用。  
既存テーブル（`employee_skill_assignments`・`employee_skill_requirement_selections`）への影響ゼロ。承認完了時に既存テーブルへ INSERT する副作用パターン。

---

## データモデル（新規テーブル3本）

### `skill_approvers`（承認者マスタ）

```sql
CREATE TABLE public.skill_approvers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  approver_id UUID NOT NULL REFERENCES public.employees(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, employee_id, approver_id)
);
ALTER TABLE public.skill_approvers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.skill_approvers
  FOR ALL USING (tenant_id = (
    SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid()
  ));
```

### `skill_role_applications`（職種割り当て申請）

```sql
CREATE TABLE public.skill_role_applications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id),
  employee_id         UUID NOT NULL REFERENCES public.employees(id),
  skill_id            UUID NOT NULL REFERENCES public.tenant_skills(id),
  status              TEXT NOT NULL DEFAULT 'pending_manager'
                      CHECK (status IN ('pending_manager','pending_hr','approved','rejected')),
  note                TEXT,
  manager_comment     TEXT,
  hr_comment          TEXT,
  manager_approved_by UUID REFERENCES public.employees(id),
  manager_approved_at TIMESTAMPTZ,
  hr_approved_by      UUID REFERENCES public.employees(id),
  hr_approved_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.skill_role_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.skill_role_applications
  FOR ALL USING (tenant_id = (
    SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid()
  ));
```

**承認完了時:** `employee_skill_assignments` に INSERT

### `skill_requirement_applications`（要件達成申請）

```sql
CREATE TABLE public.skill_requirement_applications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id),
  employee_id         UUID NOT NULL REFERENCES public.employees(id),
  requirement_id      UUID NOT NULL REFERENCES public.skill_requirements(id),
  status              TEXT NOT NULL DEFAULT 'pending_manager'
                      CHECK (status IN ('pending_manager','pending_hr','approved','rejected')),
  evidence            TEXT,
  manager_comment     TEXT,
  hr_comment          TEXT,
  manager_approved_by UUID REFERENCES public.employees(id),
  manager_approved_at TIMESTAMPTZ,
  hr_approved_by      UUID REFERENCES public.employees(id),
  hr_approved_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.skill_requirement_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON public.skill_requirement_applications
  FOR ALL USING (tenant_id = (
    SELECT tenant_id FROM public.employees WHERE auth_user_id = auth.uid()
  ));
```

**承認完了時:** `employee_skill_requirement_selections` に INSERT

---

## ステータス遷移

```
従業員申請 → pending_manager
  → [上長承認] → pending_hr
    → [人事承認] → approved（既存テーブルへ反映）
    → [人事却下] → rejected
  → [上長却下] → rejected
```

---

## UI構成（新規ページ4本）

### 1. `/my-skills`（従業員ポータル）
- 自分の割り当て済み職種バッジ一覧
- 「職種を申請する」ボタン → 未割り当て職種を選択・理由入力モーダル
- 職種ごとの要件一覧 + 各要件に「達成申請」ボタン
- 申請ステータスバッジ（申請中 / 上長承認待ち / 却下）

### 2. `/skill-approvals`（上長承認）
- 自分が承認者の従業員の申請一覧
- 「職種申請」「要件申請」タブ
- 承認 / 却下（コメント付き）→ status を `pending_hr` に更新

### 3. `/adm/skill-map/applications`（人事最終承認）
- `pending_hr` の申請一覧
- 最終承認 → 既存テーブルへ反映 + `approved`
- 却下 → コメント付きで `rejected`

### 4. `/adm/skill-map/approvers`（承認者マスタ管理）
- 従業員 → 上長マッピングの一覧・追加・削除

---

## 実装ファイル一覧

### マイグレーション（新規3本）
- `supabase/migrations/*_skill_approvers.sql`
- `supabase/migrations/*_skill_role_applications.sql`
- `supabase/migrations/*_skill_requirement_applications.sql`

### features（新規）
| ファイル | 役割 |
|---------|------|
| `src/features/skill-portal/types.ts` | 申請関連型定義 |
| `src/features/skill-portal/queries.ts` | 読み取りクエリ |
| `src/features/skill-portal/actions.ts` | 申請・承認・却下 Server Actions |
| `src/features/skill-portal/components/MySkillsView.tsx` | 従業員マイスキル画面 |
| `src/features/skill-portal/components/ApplyRoleModal.tsx` | 職種申請モーダル |
| `src/features/skill-portal/components/ApplyRequirementModal.tsx` | 要件申請モーダル |
| `src/features/skill-portal/components/SkillApprovalsView.tsx` | 上長承認一覧 |
| `src/features/skill-portal/components/HrApplicationsView.tsx` | 人事最終承認一覧 |
| `src/features/skill-portal/components/ApproversManager.tsx` | 承認者マスタ管理 |

### pages（新規4本）
| ルート | ファイル |
|--------|---------|
| `/my-skills` | `(default)/(skill_portal)/my-skills/page.tsx` |
| `/skill-approvals` | `(default)/(skill_portal)/skill-approvals/page.tsx` |
| `/adm/skill-map/applications` | `(colored)/adm/(skill_map)/skill-map/applications/page.tsx` |
| `/adm/skill-map/approvers` | `(colored)/adm/(skill_map)/skill-map/approvers/page.tsx` |

### config（変更）
- `src/config/routes.ts` に4ルート追加

---

## 非機能要件

- 全新規テーブルに RLS 有効（テナント分離）
- エンドユーザー向け `actions.ts` では必ず `createClient()` を使用（`createAdminClient()` 禁止）
- 人事最終承認時の副作用 INSERT は同一 Server Action 内でアトミックに処理
