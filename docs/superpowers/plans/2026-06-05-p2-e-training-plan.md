# P2-E 育成計画テンプレート体系化 & 学習効果レポート 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 職種別育成計画テンプレート（研修コース群の定義）を作成し、ワンクリックで従業員にe-learningを一括アサインしつつ、eラーニング完了率 × スキル要件充足率を連動させた進捗レポートを既存スキルマップ画面の新タブとして提供する。

**Architecture:** 既存 `src/features/skill-map/` に3ファイル（training-plan-types / training-plan-queries / training-plan-actions）を追加し、6コンポーネントを新設。`SkillMapTabs` に「育成計画」タブを追加して `TrainingPlanView` をレンダリング。データは `page.tsx`（Server Component）から取得してprops経由で渡す。新規DBテーブル3本のみ追加し、既存テーブルへの変更なし。

**Tech Stack:** Next.js 16 App Router, Server Components + Server Actions, Supabase RLS, Tailwind CSS v4, Zod v4

---

## ファイル構成

**新規作成:**
- `supabase/migrations/20260605100000_add_training_plan_tables.sql`
- `src/features/skill-map/training-plan-types.ts`
- `src/features/skill-map/training-plan-queries.ts`
- `src/features/skill-map/training-plan-actions.ts`
- `src/features/skill-map/components/TrainingPlanView.tsx`
- `src/features/skill-map/components/TrainingTemplateManager.tsx`
- `src/features/skill-map/components/TrainingCoursePickerModal.tsx`
- `src/features/skill-map/components/TrainingPlanList.tsx`
- `src/features/skill-map/components/TrainingCreatePlanModal.tsx`
- `src/features/skill-map/components/TrainingProgressReport.tsx`

**変更:**
- `src/features/skill-map/components/SkillMapTabs.tsx` — 「育成計画」タブ追加、`trainingPlanData` prop 追加
- `src/app/(tenant)/(colored)/adm/(skill_map)/skill-map/page.tsx` — 育成計画データ取得追加
- `src/lib/supabase/types.ts` — 3テーブル型追加

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260605100000_add_training_plan_tables.sql`

- [ ] **Step 1: Create migration SQL**

```sql
-- 既存テーブルは一切変更しない。新規テーブルのみ追加。

-- 育成計画テンプレート（職種 × 研修コース群の定義）
CREATE TABLE public.training_plan_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  skill_id    UUID REFERENCES public.tenant_skills(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.training_plan_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.training_plan_templates
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_training_plan_templates_tenant
  ON public.training_plan_templates(tenant_id, sort_order);

-- テンプレートに含まれるコース
CREATE TABLE public.training_plan_template_courses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.training_plan_templates(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  course_id   UUID NOT NULL REFERENCES public.el_courses(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, course_id)
);

ALTER TABLE public.training_plan_template_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.training_plan_template_courses
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_training_plan_template_courses_template
  ON public.training_plan_template_courses(template_id, sort_order);

-- 個人育成計画（テンプレートを従業員に適用した記録）
CREATE TABLE public.employee_training_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  template_id UUID NOT NULL REFERENCES public.training_plan_templates(id),
  due_date    DATE,
  created_by  UUID REFERENCES public.employees(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.employee_training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.employee_training_plans
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_employee_training_plans_tenant_employee
  ON public.employee_training_plans(tenant_id, employee_id, created_at DESC);
```

- [ ] **Step 2: Apply migration locally**

```bash
supabase migration up
```

Expected: `Applying migration 20260605100000_add_training_plan_tables.sql...OK`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260605100000_add_training_plan_tables.sql
git commit -m "feat: add training plan tables migration (P2-E)"
```

---

## Task 2: Feature Types

**Files:**
- Create: `src/features/skill-map/training-plan-types.ts`

- [ ] **Step 1: Create training-plan-types.ts**

```typescript
/** 育成計画テンプレート */
export interface TrainingPlanTemplate {
  id: string
  tenant_id: string
  skill_id: string | null
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

/** テンプレートコース紐付け */
export interface TrainingPlanTemplateCourse {
  id: string
  template_id: string
  tenant_id: string
  course_id: string
  sort_order: number
  created_at: string
}

/** 個人育成計画 */
export interface EmployeeTrainingPlan {
  id: string
  tenant_id: string
  employee_id: string
  template_id: string
  due_date: string | null
  created_by: string | null
  created_at: string
}

/** テンプレート一覧表示用（コース一覧付き） */
export interface TrainingPlanTemplateRow {
  id: string
  skill_id: string | null
  /** 対象職種名（tenant_skills.name） */
  skill_name: string | null
  name: string
  description: string | null
  courses: { id: string; title: string; category: string }[]
}

/** 個人育成計画一覧表示用 */
export interface TrainingEmployeePlanRow {
  id: string
  employee_id: string
  employee_name: string
  department_name: string | null
  template_id: string
  template_name: string
  due_date: string | null
  created_at: string
  total_courses: number
  completed_courses: number
}

/** 進捗レポート行 */
export interface TrainingProgressRow {
  employee_id: string
  employee_name: string
  department_name: string | null
  /** eラーニング: 全アサイン数 */
  el_total: number
  /** eラーニング: 完了数 */
  el_completed: number
  /** eラーニング: 完了率 0〜100 */
  el_rate: number
  /** スキル要件: 全件数 */
  skill_total: number
  /** スキル要件: 充足数 */
  skill_completed: number
  /** スキル要件: 充足率 0〜100（職種未割り当ては null） */
  skill_rate: number | null
  /** 直近の育成計画テンプレート名 */
  active_plan_name: string | null
}

/** ダッシュボード全体データ */
export interface TrainingPlanDashboardData {
  templates: TrainingPlanTemplateRow[]
  plans: TrainingEmployeePlanRow[]
  progressRows: TrainingProgressRow[]
  /** コースピッカー用: テナントの非アーカイブコース一覧 */
  availableCourses: { id: string; title: string; category: string }[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/skill-map/training-plan-types.ts
git commit -m "feat: add training plan types (P2-E)"
```

---

## Task 3: Supabase Types Update

**Files:**
- Modify: `src/lib/supabase/types.ts`

- [ ] **Step 1: Find insertion point**

`src/lib/supabase/types.ts` でアルファベット順に `tenant_skill_level_sets:` テーブル定義の閉じ `}` を探し、その直後に以下3テーブルの型定義を挿入する。（`t` → `training` → `tenant_skills` の後）

```typescript
      training_plan_template_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          sort_order: number
          template_id: string
          tenant_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          template_id: string
          tenant_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          template_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'training_plan_template_courses_course_id_fkey'
            columns: ['course_id']
            isOneToOne: false
            referencedRelation: 'el_courses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'training_plan_template_courses_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'training_plan_templates'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'training_plan_template_courses_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      training_plan_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          skill_id: string | null
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          skill_id?: string | null
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          skill_id?: string | null
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'training_plan_templates_skill_id_fkey'
            columns: ['skill_id']
            isOneToOne: false
            referencedRelation: 'tenant_skills'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'training_plan_templates_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      employee_training_plans: {
        Row: {
          created_at: string
          created_by: string | null
          due_date: string | null
          employee_id: string
          id: string
          template_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          template_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          template_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'employee_training_plans_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employee_training_plans_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'training_plan_templates'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'employee_training_plans_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
```

- [ ] **Step 2: Verify type check**

```bash
npm run type-check 2>&1 | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/types.ts
git commit -m "feat: add training plan table types to supabase types (P2-E)"
```

---

## Task 4: Queries

**Files:**
- Create: `src/features/skill-map/training-plan-queries.ts`

- [ ] **Step 1: Create training-plan-queries.ts**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type {
  TrainingPlanTemplateRow,
  TrainingEmployeePlanRow,
  TrainingProgressRow,
  TrainingPlanDashboardData,
} from './training-plan-types'
import type { EmployeeCompletionRow } from './types'

type DB = SupabaseClient<Database>

/** 育成計画テンプレート一覧をコース付きで取得する */
export async function getTrainingPlanTemplates(supabase: DB): Promise<TrainingPlanTemplateRow[]> {
  const { data: templates, error } = await (supabase as any)
    .from('training_plan_templates')
    .select('id, skill_id, name, description')
    .eq('is_active', true)
    .order('sort_order')

  if (error || !templates || templates.length === 0) return []

  const templateIds = templates.map((t: any) => t.id)

  // コース情報を一括取得
  const { data: tpCourses } = await (supabase as any)
    .from('training_plan_template_courses')
    .select('template_id, course_id, sort_order')
    .in('template_id', templateIds)
    .order('sort_order')

  const courseIds = [...new Set((tpCourses ?? []).map((c: any) => c.course_id as string))]
  const { data: courses } =
    courseIds.length > 0
      ? await (supabase as any).from('el_courses').select('id, title, category').in('id', courseIds)
      : { data: [] }
  const courseMap = new Map((courses ?? []).map((c: any) => [c.id, c]))

  // 職種名を一括取得
  const skillIds = [
    ...new Set(templates.map((t: any) => t.skill_id).filter(Boolean)),
  ] as string[]
  const { data: skills } =
    skillIds.length > 0
      ? await (supabase as any).from('tenant_skills').select('id, name').in('id', skillIds)
      : { data: [] }
  const skillMap = new Map((skills ?? []).map((s: any) => [s.id, s.name as string]))

  // テンプレートごとにコースをグループ化
  const coursesByTemplate = new Map<string, { id: string; title: string; category: string }[]>()
  for (const tc of tpCourses ?? []) {
    const course = courseMap.get(tc.course_id)
    if (!course) continue
    const arr = coursesByTemplate.get(tc.template_id) ?? []
    arr.push({ id: course.id, title: course.title, category: course.category })
    coursesByTemplate.set(tc.template_id, arr)
  }

  return templates.map((t: any) => ({
    id: t.id,
    skill_id: t.skill_id,
    skill_name: t.skill_id ? (skillMap.get(t.skill_id) ?? null) : null,
    name: t.name,
    description: t.description,
    courses: coursesByTemplate.get(t.id) ?? [],
  }))
}

/** 個人育成計画一覧をコース完了進捗付きで取得する */
export async function getEmployeeTrainingPlans(supabase: DB): Promise<TrainingEmployeePlanRow[]> {
  const { data: plans, error } = await (supabase as any)
    .from('employee_training_plans')
    .select('id, employee_id, template_id, due_date, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error || !plans || plans.length === 0) return []

  // 従業員情報を一括取得
  const employeeIds = [...new Set(plans.map((p: any) => p.employee_id as string))]
  const { data: employees } = await (supabase as any)
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .in('id', employeeIds)
  const empMap = new Map(
    (employees ?? []).map((e: any) => {
      const divData = e.divisions as { name: string } | { name: string }[] | null
      const deptName = Array.isArray(divData)
        ? (divData[0]?.name ?? null)
        : (divData?.name ?? null)
      return [e.id, { name: e.name ?? '', deptName }]
    })
  )

  // テンプレート情報を一括取得
  const templateIds = [...new Set(plans.map((p: any) => p.template_id as string))]
  const { data: templates } = await (supabase as any)
    .from('training_plan_templates')
    .select('id, name')
    .in('id', templateIds)
  const templateMap = new Map((templates ?? []).map((t: any) => [t.id, t.name as string]))

  // テンプレートコースを一括取得
  const { data: tpCourses } = await (supabase as any)
    .from('training_plan_template_courses')
    .select('template_id, course_id')
    .in('template_id', templateIds)
  const coursesByTemplate = new Map<string, string[]>()
  for (const tc of tpCourses ?? []) {
    const arr = coursesByTemplate.get(tc.template_id) ?? []
    arr.push(tc.course_id)
    coursesByTemplate.set(tc.template_id, arr)
  }

  // eラーニング完了状況を一括取得
  const allCourseIds = [...new Set((tpCourses ?? []).map((c: any) => c.course_id as string))]
  const { data: assignments } =
    allCourseIds.length > 0
      ? await (supabase as any)
          .from('el_assignments')
          .select('employee_id, course_id, completed_at')
          .in('employee_id', employeeIds)
          .in('course_id', allCourseIds)
      : { data: [] }
  const completionSet = new Set(
    (assignments ?? [])
      .filter((a: any) => a.completed_at)
      .map((a: any) => `${a.employee_id}:${a.course_id}`)
  )

  return plans.map((p: any) => {
    const emp = empMap.get(p.employee_id)
    const courses = coursesByTemplate.get(p.template_id) ?? []
    const completed = courses.filter(cid =>
      completionSet.has(`${p.employee_id}:${cid}`)
    ).length

    return {
      id: p.id,
      employee_id: p.employee_id,
      employee_name: emp?.name ?? '',
      department_name: emp?.deptName ?? null,
      template_id: p.template_id,
      template_name: templateMap.get(p.template_id) ?? '',
      due_date: p.due_date,
      created_at: p.created_at,
      total_courses: courses.length,
      completed_courses: completed,
    }
  })
}

/** 全従業員の学習進捗レポートを取得する */
export async function getTrainingProgressRows(
  supabase: DB,
  completionRows: EmployeeCompletionRow[]
): Promise<TrainingProgressRow[]> {
  // スキル要件充足率（既存データ）
  const completionMap = new Map(
    completionRows.map(r => [
      r.employee_id,
      {
        total: r.totalRequirements,
        completed: r.completedRequirements,
        rate: r.completionRate,
      },
    ])
  )

  // 全従業員を取得
  const { data: employees } = await (supabase as any)
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .eq('active_status', 'active')
    .order('name')
  if (!employees) return []

  const employeeIds = employees.map((e: any) => e.id as string)

  // e-learning アサイン一覧（全コース）
  const { data: assignments } = await (supabase as any)
    .from('el_assignments')
    .select('employee_id, completed_at')
    .in('employee_id', employeeIds)
  const elByEmployee = new Map<string, { total: number; completed: number }>()
  for (const a of assignments ?? []) {
    const curr = elByEmployee.get(a.employee_id) ?? { total: 0, completed: 0 }
    elByEmployee.set(a.employee_id, {
      total: curr.total + 1,
      completed: curr.completed + (a.completed_at ? 1 : 0),
    })
  }

  // 直近の育成計画テンプレート名
  const { data: plans } = await (supabase as any)
    .from('employee_training_plans')
    .select('employee_id, template_id, created_at')
    .in('employee_id', employeeIds)
    .order('created_at', { ascending: false })
  const latestPlanByEmployee = new Map<string, string>()
  for (const p of plans ?? []) {
    if (!latestPlanByEmployee.has(p.employee_id)) {
      latestPlanByEmployee.set(p.employee_id, p.template_id)
    }
  }
  const planTemplateIds = [...new Set([...latestPlanByEmployee.values()])]
  const { data: planTemplates } =
    planTemplateIds.length > 0
      ? await (supabase as any)
          .from('training_plan_templates')
          .select('id, name')
          .in('id', planTemplateIds)
      : { data: [] }
  const planTemplateMap = new Map(
    (planTemplates ?? []).map((t: any) => [t.id, t.name as string])
  )

  return employees.map((e: any) => {
    const divData = e.divisions as { name: string } | { name: string }[] | null
    const deptName = Array.isArray(divData)
      ? (divData[0]?.name ?? null)
      : (divData?.name ?? null)

    const el = elByEmployee.get(e.id) ?? { total: 0, completed: 0 }
    const skill = completionMap.get(e.id)
    const latestTemplateId = latestPlanByEmployee.get(e.id)

    return {
      employee_id: e.id,
      employee_name: e.name ?? '',
      department_name: deptName,
      el_total: el.total,
      el_completed: el.completed,
      el_rate: el.total > 0 ? Math.round((el.completed / el.total) * 100) : 0,
      skill_total: skill?.total ?? 0,
      skill_completed: skill?.completed ?? 0,
      skill_rate: skill?.rate ?? null,
      active_plan_name: latestTemplateId
        ? (planTemplateMap.get(latestTemplateId) ?? null)
        : null,
    }
  })
}

/** コースピッカー用: テナントの非アーカイブコース一覧 */
export async function getAvailableCoursesForPlan(
  supabase: DB
): Promise<{ id: string; title: string; category: string }[]> {
  const { data } = await (supabase as any)
    .from('el_courses')
    .select('id, title, category')
    .eq('course_type', 'tenant')
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
  return (data ?? []).map((c: any) => ({
    id: c.id,
    title: c.title,
    category: c.category,
  }))
}

/** ダッシュボード用データをまとめて取得する */
export async function getTrainingPlanDashboardData(
  supabase: DB,
  completionRows: EmployeeCompletionRow[]
): Promise<TrainingPlanDashboardData> {
  const [templates, plans, progressRows, availableCourses] = await Promise.all([
    getTrainingPlanTemplates(supabase),
    getEmployeeTrainingPlans(supabase),
    getTrainingProgressRows(supabase, completionRows),
    getAvailableCoursesForPlan(supabase),
  ])

  return { templates, plans, progressRows, availableCourses }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/skill-map/training-plan-queries.ts
git commit -m "feat: add training plan queries (P2-E)"
```

---

## Task 5: Server Actions

**Files:**
- Create: `src/features/skill-map/training-plan-actions.ts`

- [ ] **Step 1: Create training-plan-actions.ts**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { APP_ROUTES } from '@/config/routes'

const HR_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

const templateSchema = z.object({
  name: z.string().min(1).max(200),
  skillId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
})

/** 育成計画テンプレートを作成する */
export async function createTrainingPlanTemplate(input: {
  name: string
  skillId?: string
  description?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }
  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const parsed = templateSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('training_plan_templates')
    .select('sort_order')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0

  const { error } = await supabase.from('training_plan_templates').insert({
    tenant_id: user.tenant_id,
    name: parsed.data.name,
    skill_id: parsed.data.skillId ?? null,
    description: parsed.data.description ?? null,
    sort_order: nextOrder,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}

/** 育成計画テンプレートを論理削除する */
export async function deleteTrainingPlanTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }
  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('training_plan_templates')
    .update({ is_active: false })
    .eq('id', templateId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}

/** テンプレートにコースを追加する */
export async function addCourseToTemplate(
  templateId: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }
  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('training_plan_template_courses')
    .select('sort_order')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextOrder = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0

  const { error } = await supabase.from('training_plan_template_courses').insert({
    template_id: templateId,
    tenant_id: user.tenant_id,
    course_id: courseId,
    sort_order: nextOrder,
  })

  // UNIQUE 制約違反（重複追加）はエラーとせずスキップ
  if (error && !error.message.includes('unique') && !error.message.includes('duplicate')) {
    return { success: false, error: error.message }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}

/** テンプレートからコースを削除する */
export async function removeCourseFromTemplate(
  templateId: string,
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }
  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('training_plan_template_courses')
    .delete()
    .eq('template_id', templateId)
    .eq('course_id', courseId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true }
}

const createPlanSchema = z.object({
  employeeId: z.string().uuid(),
  templateId: z.string().uuid(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

/** 個人育成計画を作成し、テンプレートのコースを一括アサインする */
export async function createEmployeeTrainingPlan(input: {
  employeeId: string
  templateId: string
  dueDate?: string
}): Promise<{ success: boolean; error?: string; assignedCount?: number }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: 'Unauthorized' }
  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const parsed = createPlanSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = await createClient()

  // 育成計画レコードを作成
  const { error: planError } = await supabase.from('employee_training_plans').insert({
    tenant_id: user.tenant_id,
    employee_id: parsed.data.employeeId,
    template_id: parsed.data.templateId,
    due_date: parsed.data.dueDate ?? null,
    created_by: user.employee_id,
  })
  if (planError) return { success: false, error: planError.message }

  // テンプレートのコース一覧を取得
  const { data: tpCourses } = await supabase
    .from('training_plan_template_courses')
    .select('course_id')
    .eq('template_id', parsed.data.templateId)
    .eq('tenant_id', user.tenant_id)
    .order('sort_order')

  if (!tpCourses || tpCourses.length === 0) {
    revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
    return { success: true, assignedCount: 0 }
  }

  const courseIds = tpCourses.map(c => c.course_id)

  // 既存のアサインを確認（重複アサインを防ぐ）
  const { data: existingAssignments } = await supabase
    .from('el_assignments')
    .select('course_id')
    .eq('employee_id', parsed.data.employeeId)
    .eq('tenant_id', user.tenant_id)
    .in('course_id', courseIds)
  const alreadyAssigned = new Set((existingAssignments ?? []).map(a => a.course_id))

  // 未アサインのコースのみ挿入
  const newAssignments = courseIds
    .filter(cid => !alreadyAssigned.has(cid))
    .map(cid => ({
      tenant_id: user.tenant_id!,
      course_id: cid,
      employee_id: parsed.data.employeeId,
      assigned_by_employee_id: user.employee_id,
      due_date: parsed.data.dueDate ?? null,
    }))

  if (newAssignments.length > 0) {
    const { error: assignError } = await supabase.from('el_assignments').insert(newAssignments)
    if (assignError) return { success: false, error: assignError.message }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_SKILL_MAP)
  return { success: true, assignedCount: newAssignments.length }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/skill-map/training-plan-actions.ts
git commit -m "feat: add training plan server actions (P2-E)"
```

---

## Task 6: Component — TrainingCoursePickerModal

**Files:**
- Create: `src/features/skill-map/components/TrainingCoursePickerModal.tsx`

- [ ] **Step 1: Create TrainingCoursePickerModal.tsx**

```tsx
'use client'

// TrainingTemplateManager の CourseListSection から import される

import { useState, useTransition } from 'react'
import { addCourseToTemplate } from '../training-plan-actions'

interface Props {
  templateId: string
  templateName: string
  availableCourses: { id: string; title: string; category: string }[]
  alreadyAddedCourseIds: string[]
  onClose: () => void
}

export function TrainingCoursePickerModal({
  templateId,
  templateName,
  availableCourses,
  alreadyAddedCourseIds,
  onClose,
}: Props) {
  const addedSet = new Set(alreadyAddedCourseIds)
  const candidates = availableCourses.filter(c => !addedSet.has(c.id))

  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const filtered = search.trim()
    ? candidates.filter(c => c.title.includes(search) || c.category.includes(search))
    : candidates

  const handleAdd = (courseId: string) => {
    startTransition(async () => {
      const result = await addCourseToTemplate(templateId, courseId)
      if (!result.success) setError(result.error ?? 'エラーが発生しました')
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[80vh] flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">コースを追加</h2>
            <p className="text-xs text-gray-500 mt-0.5">{templateName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="px-6 py-3 flex-shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="コース名・カテゴリで絞り込み..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="overflow-y-auto flex-1 px-6 pb-4">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              {candidates.length === 0 ? '追加可能なコースがありません' : '検索結果がありません'}
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map(course => (
                <li
                  key={course.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                    <p className="text-xs text-gray-500">{course.category}</p>
                  </div>
                  <button
                    onClick={() => handleAdd(course.id)}
                    disabled={isPending}
                    className="ml-3 flex-shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    追加
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="border-t border-gray-200 px-6 py-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/skill-map/components/TrainingCoursePickerModal.tsx
git commit -m "feat: add training course picker modal (P2-E)"
```

---

## Task 7: Component — TrainingTemplateManager

**Files:**
- Create: `src/features/skill-map/components/TrainingTemplateManager.tsx`

- [ ] **Step 1: Create TrainingTemplateManager.tsx**

```tsx
'use client'

// TrainingPlanView から import される。テンプレート管理サブタブ。

import { useState, useTransition } from 'react'
import {
  createTrainingPlanTemplate,
  deleteTrainingPlanTemplate,
  removeCourseFromTemplate,
} from '../training-plan-actions'
import { TrainingCoursePickerModal } from './TrainingCoursePickerModal'
import type { TrainingPlanTemplateRow } from '../training-plan-types'

interface Props {
  templates: TrainingPlanTemplateRow[]
  availableCourses: { id: string; title: string; category: string }[]
  jobRoles: { id: string; name: string }[]
}

// コース一覧 + ピッカーモーダルを管理するサブコンポーネント
function CourseListSection({
  template,
  availableCourses,
  onRemove,
  isPending,
}: {
  template: TrainingPlanTemplateRow
  availableCourses: { id: string; title: string; category: string }[]
  onRemove: (templateId: string, courseId: string) => void
  isPending: boolean
}) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {template.courses.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-400">
              コースがありません。下のボタンから追加してください。
            </p>
          </div>
        ) : (
          template.courses.map((course, idx) => (
            <div
              key={course.id}
              className={`flex items-center justify-between border-b border-gray-100 px-4 py-2.5 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">{course.title}</p>
                <p className="text-xs text-gray-400">{course.category}</p>
              </div>
              <button
                onClick={() => onRemove(template.id, course.id)}
                disabled={isPending}
                className="ml-3 flex-shrink-0 text-xs text-red-400 hover:underline disabled:opacity-50"
              >
                削除
              </button>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => setShowPicker(true)}
        className="w-full rounded-lg border border-dashed border-gray-300 py-2.5 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors"
      >
        ＋ コースを追加
      </button>

      {showPicker && (
        <TrainingCoursePickerModal
          templateId={template.id}
          templateName={template.name}
          availableCourses={availableCourses}
          alreadyAddedCourseIds={template.courses.map(c => c.id)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}

export function TrainingTemplateManager({ templates, availableCourses, jobRoles }: Props) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSkillId, setNewSkillId] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) ?? null

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) {
      setFormError('テンプレート名を入力してください')
      return
    }
    startTransition(async () => {
      const result = await createTrainingPlanTemplate({
        name: newName.trim(),
        skillId: newSkillId || undefined,
        description: newDescription.trim() || undefined,
      })
      if (!result.success) {
        setFormError(result.error ?? 'エラーが発生しました')
        return
      }
      setNewName('')
      setNewSkillId('')
      setNewDescription('')
      setShowCreateForm(false)
      setFormError(null)
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteTrainingPlanTemplate(id)
      if (selectedTemplateId === id) setSelectedTemplateId(null)
    })
  }

  const handleRemoveCourse = (templateId: string, courseId: string) => {
    startTransition(async () => {
      await removeCourseFromTemplate(templateId, courseId)
    })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* テンプレート一覧 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">テンプレート一覧</h3>
          <button
            onClick={() => setShowCreateForm(true)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            ＋ 新規作成
          </button>
        </div>

        {showCreateForm && (
          <form
            onSubmit={handleCreate}
            className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3"
          >
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                テンプレート名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="例: 営業職 新入社員研修"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                対象職種（任意）
              </label>
              <select
                value={newSkillId}
                onChange={e => setNewSkillId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">全職種共通</option>
                {jobRoles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">説明（任意）</label>
              <input
                type="text"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="このテンプレートの目的"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setFormError(null)
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                作成
              </button>
            </div>
          </form>
        )}

        {templates.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-400">テンプレートがありません</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {templates.map((t, idx) => (
              <div
                key={t.id}
                onClick={() => setSelectedTemplateId(t.id)}
                className={`flex cursor-pointer items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 transition-colors last:border-0 ${selectedTemplateId === t.id ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t.skill_name ? `対象: ${t.skill_name}` : '全職種共通'}
                    {' · '}
                    {t.courses.length} コース
                  </p>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    handleDelete(t.id)
                  }}
                  disabled={isPending}
                  className="flex-shrink-0 text-xs text-red-400 hover:underline disabled:opacity-50"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 選択テンプレートのコース管理 */}
      <div>
        {selectedTemplate ? (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">
              「{selectedTemplate.name}」のコース
            </h3>
            <CourseListSection
              template={selectedTemplate}
              availableCourses={availableCourses}
              onRemove={handleRemoveCourse}
              isPending={isPending}
            />
          </div>
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-gray-300 p-12">
            <p className="text-sm text-gray-400">左のテンプレートを選択してコースを管理</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/skill-map/components/TrainingTemplateManager.tsx
git commit -m "feat: add training template manager component (P2-E)"
```

---

## Task 8: Components — TrainingCreatePlanModal + TrainingPlanList

**Files:**
- Create: `src/features/skill-map/components/TrainingCreatePlanModal.tsx`
- Create: `src/features/skill-map/components/TrainingPlanList.tsx`

- [ ] **Step 1: Create TrainingCreatePlanModal.tsx**

```tsx
'use client'

// TrainingPlanList から import される

import { useState, useTransition } from 'react'
import { createEmployeeTrainingPlan } from '../training-plan-actions'
import type { TrainingPlanTemplateRow } from '../training-plan-types'

interface Props {
  templates: TrainingPlanTemplateRow[]
  employees: { id: string; name: string; department_name: string | null }[]
  onClose: () => void
}

export function TrainingCreatePlanModal({ templates, employees, onClose }: Props) {
  const [employeeId, setEmployeeId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selectedTemplate = templates.find(t => t.id === templateId) ?? null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId) { setError('従業員を選択してください'); return }
    if (!templateId) { setError('テンプレートを選択してください'); return }
    setError(null)

    startTransition(async () => {
      const result = await createEmployeeTrainingPlan({
        employeeId,
        templateId,
        dueDate: dueDate || undefined,
      })
      if (!result.success) {
        setError(result.error ?? 'エラーが発生しました')
        return
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">育成計画を作成</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              従業員 <span className="text-red-500">*</span>
            </label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">選択してください</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                  {emp.department_name ? ` (${emp.department_name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              テンプレート <span className="text-red-500">*</span>
            </label>
            <select
              value={templateId}
              onChange={e => setTemplateId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">選択してください</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}（{t.courses.length} コース）
                </option>
              ))}
            </select>
          </div>

          {selectedTemplate && selectedTemplate.courses.length > 0 && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">
                以下の {selectedTemplate.courses.length} 件のコースがアサインされます
              </p>
              <ul className="space-y-1">
                {selectedTemplate.courses.slice(0, 5).map(c => (
                  <li key={c.id} className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="text-gray-400">✓</span>
                    {c.title}
                  </li>
                ))}
                {selectedTemplate.courses.length > 5 && (
                  <li className="text-xs text-gray-400">
                    他 {selectedTemplate.courses.length - 5} 件...
                  </li>
                )}
              </ul>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">期限（任意）</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? '処理中...' : '計画を作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create TrainingPlanList.tsx**

```tsx
'use client'

// TrainingPlanView から import される。育成計画一覧サブタブ。

import { useState } from 'react'
import { TrainingCreatePlanModal } from './TrainingCreatePlanModal'
import type { TrainingEmployeePlanRow, TrainingPlanTemplateRow } from '../training-plan-types'

interface Props {
  plans: TrainingEmployeePlanRow[]
  templates: TrainingPlanTemplateRow[]
  employees: { id: string; name: string; department_name: string | null }[]
}

export function TrainingPlanList({ plans, templates, employees }: Props) {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{plans.length} 件の育成計画</p>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
        >
          ＋ 育成計画を作成
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
          <p className="text-sm text-gray-500">
            育成計画がありません。「育成計画を作成」から開始してください。
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                    従業員名
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                    部署
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                    テンプレート
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                    コース進捗
                  </th>
                  <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                    期限
                  </th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan, idx) => {
                  const progress =
                    plan.total_courses > 0
                      ? Math.round((plan.completed_courses / plan.total_courses) * 100)
                      : 0

                  return (
                    <tr
                      key={plan.id}
                      className={`border-b border-gray-100 transition-[background-color,box-shadow] duration-300 ease-out hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {plan.employee_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {plan.department_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{plan.template_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-2 rounded-full bg-primary transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {plan.completed_courses}/{plan.total_courses}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {plan.due_date ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <TrainingCreatePlanModal
          templates={templates}
          employees={employees}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/skill-map/components/TrainingCreatePlanModal.tsx \
        src/features/skill-map/components/TrainingPlanList.tsx
git commit -m "feat: add training plan list and create modal (P2-E)"
```

---

## Task 9: Component — TrainingProgressReport

**Files:**
- Create: `src/features/skill-map/components/TrainingProgressReport.tsx`

- [ ] **Step 1: Create TrainingProgressReport.tsx**

```tsx
'use client'

// TrainingPlanView から import される。進捗レポートサブタブ。

import type { TrainingProgressRow } from '../training-plan-types'

interface Props {
  rows: TrainingProgressRow[]
}

function rateColorClass(rate: number | null): string {
  if (rate === null) return 'bg-gray-100 text-gray-500'
  if (rate >= 80) return 'bg-green-100 text-green-700'
  if (rate >= 50) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

function RateBar({ rate, total }: { rate: number | null; total: number }) {
  if (rate === null || total === 0) {
    return <span className="text-xs text-gray-400">—</span>
  }
  const barColor =
    rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-400' : 'bg-red-400'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${rate}%` }} />
      </div>
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${rateColorClass(rate)}`}>
        {rate}%
      </span>
    </div>
  )
}

export function TrainingProgressReport({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
        <p className="text-sm text-gray-400">従業員データがありません</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-200">
              <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                従業員名
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                部署
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                eラーニング完了率
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                スキル要件充足率
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                育成計画
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.employee_id}
                className={`border-b border-gray-100 transition-[background-color,box-shadow] duration-300 ease-out hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {row.employee_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {row.department_name ?? '—'}
                </td>
                <td className="px-4 py-3 min-w-[180px]">
                  <div className="space-y-0.5">
                    <RateBar rate={row.el_total > 0 ? row.el_rate : null} total={row.el_total} />
                    {row.el_total > 0 && (
                      <p className="text-xs text-gray-400">
                        {row.el_completed}/{row.el_total} コース
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 min-w-[180px]">
                  <div className="space-y-0.5">
                    <RateBar rate={row.skill_rate} total={row.skill_total} />
                    {row.skill_rate !== null && (
                      <p className="text-xs text-gray-400">
                        {row.skill_completed}/{row.skill_total} 要件
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {row.active_plan_name ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/skill-map/components/TrainingProgressReport.tsx
git commit -m "feat: add training progress report component (P2-E)"
```

---

## Task 10: Component — TrainingPlanView

**Files:**
- Create: `src/features/skill-map/components/TrainingPlanView.tsx`

- [ ] **Step 1: Create TrainingPlanView.tsx**

```tsx
'use client'

// SkillMapTabs から import される。育成計画タブのルートコンポーネント。

import { useState } from 'react'
import type { TrainingPlanDashboardData } from '../training-plan-types'
import type { EmployeeSkillRow } from '../types'
import { TrainingTemplateManager } from './TrainingTemplateManager'
import { TrainingPlanList } from './TrainingPlanList'
import { TrainingProgressReport } from './TrainingProgressReport'

type SubTab = 'templates' | 'plans' | 'progress'

interface Props {
  data: TrainingPlanDashboardData
  employeeRows: EmployeeSkillRow[]
  jobRoles: { id: string; name: string }[]
}

export function TrainingPlanView({ data, employeeRows, jobRoles }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('templates')

  const employees = employeeRows.map(r => ({
    id: r.employee_id,
    name: r.full_name ?? '',
    department_name: r.division_name,
  }))

  return (
    <div className="space-y-4">
      {/* サブタブ */}
      <div className="flex gap-2">
        {[
          { key: 'templates' as SubTab, label: `テンプレート (${data.templates.length})` },
          { key: 'plans' as SubTab, label: `育成計画 (${data.plans.length})` },
          { key: 'progress' as SubTab, label: '進捗レポート' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={
              subTab === t.key
                ? 'rounded-full px-4 py-1.5 text-sm font-medium bg-primary text-white shadow-sm'
                : 'rounded-full px-4 py-1.5 text-sm font-medium border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'templates' && (
        <TrainingTemplateManager
          templates={data.templates}
          availableCourses={data.availableCourses}
          jobRoles={jobRoles}
        />
      )}
      {subTab === 'plans' && (
        <TrainingPlanList
          plans={data.plans}
          templates={data.templates}
          employees={employees}
        />
      )}
      {subTab === 'progress' && (
        <TrainingProgressReport rows={data.progressRows} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/skill-map/components/TrainingPlanView.tsx
git commit -m "feat: add training plan view container (P2-E)"
```

---

## Task 11: SkillMapTabs + page.tsx Integration

**Files:**
- Modify: `src/features/skill-map/components/SkillMapTabs.tsx`
- Modify: `src/app/(tenant)/(colored)/adm/(skill_map)/skill-map/page.tsx`

- [ ] **Step 1: Update SkillMapTabs.tsx**

`src/features/skill-map/components/SkillMapTabs.tsx` (line ~1) の import 末尾に追加:

```typescript
import type { TrainingPlanDashboardData } from '../training-plan-types'
import { TrainingPlanView } from './TrainingPlanView'
```

`const TABS = [` 配列（line ~31）の末尾に追加:

```typescript
  { key: 'training', label: '育成計画' },
```

`type Props = {` （line ~17）内に追加:

```typescript
  trainingPlanData: TrainingPlanDashboardData
```

`export function SkillMapTabs({` の分割代入に追加:

```typescript
  trainingPlanData,
```

JSX の `{tab === 'simulation' && ...}` ブロックの後に追加:

```tsx
      {tab === 'training' && (
        <TrainingPlanView
          data={trainingPlanData}
          employeeRows={employeeRows}
          jobRoles={skills.map(s => ({ id: s.id, name: s.name }))}
        />
      )}
```

- [ ] **Step 2: Update page.tsx**

`src/app/(tenant)/(colored)/adm/(skill_map)/skill-map/page.tsx` の import 末尾に追加:

```typescript
import { getTrainingPlanDashboardData } from '@/features/skill-map/training-plan-queries'
import type { TrainingPlanDashboardData } from '@/features/skill-map/training-plan-types'
```

`let initialSimulations: any[] = []` の直後に追加:

```typescript
  let trainingPlanData: TrainingPlanDashboardData = {
    templates: [],
    plans: [],
    progressRows: [],
    availableCourses: [],
  }
```

`completionRows` を取得する try/catch ブロックの直後に追加:

```typescript
  try {
    trainingPlanData = await getTrainingPlanDashboardData(supabase, completionRows)
  } catch (e: any) {
    console.warn('getTrainingPlanDashboardData failed:', e.message)
  }
```

`<SkillMapTabs ... />` に prop 追加:

```tsx
              <SkillMapTabs
                employeeRows={employeeRows}
                skillGroups={skillGroups}
                skills={skills}
                levels={levels}
                divisions={divisions}
                skillViewRequirementSelections={skillViewRequirementSelections}
                completionRows={completionRows}
                initialSimulations={initialSimulations}
                trainingPlanData={trainingPlanData}
              />
```

- [ ] **Step 3: Commit**

```bash
git add src/features/skill-map/components/SkillMapTabs.tsx \
        src/app/\(tenant\)/\(colored\)/adm/\(skill_map\)/skill-map/page.tsx
git commit -m "feat: add 育成計画 tab to SkillMapTabs and page (P2-E)"
```

---

## Task 12: Type Check & Lint

- [ ] **Step 1: Run type check**

```bash
npm run type-check
```

Expected: no errors。よくあるエラーと対処:
- `EmployeeSkillRow` のプロパティ確認: `employee_id`, `full_name`, `division_name` が `src/features/skill-map/types.ts` に定義されていることを確認
- `(supabase as any)` キャストは既存コードのパターンと同様

- [ ] **Step 2: Lint check on new files**

```bash
npm run lint 2>&1 | grep -E "training-plan|TrainingPlan|TrainingTemplate|TrainingProgress|TrainingCreate" | head -20
```

Expected: no errors for new files.

- [ ] **Step 3: Fix errors and commit if needed**

```bash
git add -p
git commit -m "fix: resolve type/lint errors in training plan feature (P2-E)"
```

---

## Spec Coverage チェック

| 仕様要件 | 対応タスク |
|---|---|
| 等級・職種別育成計画テンプレート（職種選択 + コース群定義） | Task 1 (DBテーブル) + Task 5 (actions) + Task 7 (TrainingTemplateManager) |
| テンプレートからの個人育成計画ワンクリック生成 | Task 5: `createEmployeeTrainingPlan`（el_assignments 一括挿入） + Task 8: TrainingCreatePlanModal |
| eラーニング完了 × スキルマップ評価の連動レポート | Task 4: `getTrainingProgressRows` + Task 9: TrainingProgressReport |
| 計画 vs 実績の進捗可視化（X/Y コース進捗バー） | Task 4: `getEmployeeTrainingPlans` + Task 8: TrainingPlanList の進捗バー |
| 既存スキルマップ画面内にタブ追加 | Task 11: SkillMapTabs + page.tsx |
| 重複 e-learning アサイン防止 | Task 5: 既存アサイン確認後に差分のみ挿入 |
| 既存テーブル非破壊 | Task 1: CREATE TABLE のみ、既存テーブルへの変更なし |
| RLS ポリシー（全テーブル） | Task 1: 3テーブルすべてに tenant_isolation ポリシー |
