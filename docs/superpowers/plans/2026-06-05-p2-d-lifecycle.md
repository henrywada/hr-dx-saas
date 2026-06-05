# P2-D 入退社ライフサイクルワークフロー 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 入社・退社チェックリスト（書類収集→システム登録→備品準備→初日OT→研修割り当て / 意向確認→引き継ぎ→アカウント削除→退職手続き→離職票発行）をテナントごとに管理・追跡できる `/adm/lifecycle` 画面を実装する。

**Architecture:** `src/features/lifecycle/` を新設し、3テーブル（ライフサイクルタスクテンプレート・インスタンス・タスク）を追加。`page.tsx` からクエリ結果をクライアントコンポーネントに渡し、タスク進捗の更新は Server Actions 経由で行う。既存テーブルへの変更は一切なし。

**Tech Stack:** Next.js 16 App Router, Server Components + Server Actions, Supabase RLS, Tailwind CSS v4, Zod v4

---

## ファイル構成

**新規作成:**
- `supabase/migrations/20260605000000_add_lifecycle_tables.sql`
- `src/features/lifecycle/types.ts`
- `src/features/lifecycle/queries.ts`
- `src/features/lifecycle/actions.ts`
- `src/features/lifecycle/components/LifecycleDashboard.tsx`
- `src/features/lifecycle/components/InstanceList.tsx`
- `src/features/lifecycle/components/NewInstanceModal.tsx`
- `src/features/lifecycle/components/TaskChecklistModal.tsx`
- `src/features/lifecycle/components/TemplateManager.tsx`
- `src/app/(tenant)/(colored)/adm/(lifecycle)/lifecycle/page.tsx`
- `src/app/(tenant)/(colored)/adm/(lifecycle)/lifecycle/loading.tsx`
- `src/app/(tenant)/(colored)/adm/(lifecycle)/lifecycle/error.tsx`

**変更:**
- `src/config/routes.ts` — `ADMIN_LIFECYCLE` ルート追加
- `src/lib/supabase/types.ts` — lifecycle_* テーブル型を手動追加

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260605000000_add_lifecycle_tables.sql`

- [ ] **Step 1: Create migration SQL**

```sql
-- 既存テーブルは一切変更しない。新規テーブルのみ追加。

-- ライフサイクルタスクテンプレート（入社・退社チェックリスト定義）
CREATE TABLE public.lifecycle_task_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  lifecycle_type  TEXT NOT NULL CHECK (lifecycle_type IN ('onboarding', 'offboarding')),
  title           TEXT NOT NULL,
  description     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lifecycle_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.lifecycle_task_templates
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_lifecycle_task_templates_tenant
  ON public.lifecycle_task_templates(tenant_id, lifecycle_type, sort_order);

-- ライフサイクルインスタンス（従業員ごとの入退社ワークフロー）
CREATE TABLE public.lifecycle_instances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
  employee_id     UUID NOT NULL REFERENCES public.employees(id),
  lifecycle_type  TEXT NOT NULL CHECK (lifecycle_type IN ('onboarding', 'offboarding')),
  status          TEXT NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  scheduled_date  DATE,
  notes           TEXT,
  created_by      UUID REFERENCES public.employees(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

ALTER TABLE public.lifecycle_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.lifecycle_instances
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_lifecycle_instances_tenant_type
  ON public.lifecycle_instances(tenant_id, lifecycle_type, created_at DESC);

CREATE INDEX idx_lifecycle_instances_employee
  ON public.lifecycle_instances(tenant_id, employee_id);

-- ライフサイクルタスク（インスタンス内の個別タスク進捗）
CREATE TABLE public.lifecycle_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id  UUID NOT NULL REFERENCES public.lifecycle_instances(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
  title        TEXT NOT NULL,
  description  TEXT,
  assignee_id  UUID REFERENCES public.employees(id),
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'in_progress', 'completed')),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lifecycle_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.lifecycle_tasks
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_lifecycle_tasks_instance
  ON public.lifecycle_tasks(instance_id, sort_order);

CREATE INDEX idx_lifecycle_tasks_tenant_assignee
  ON public.lifecycle_tasks(tenant_id, assignee_id);
```

- [ ] **Step 2: Apply migration locally**

```bash
supabase migration up
```

Expected output: `Applying migration 20260605000000_add_lifecycle_tables.sql...OK`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260605000000_add_lifecycle_tables.sql
git commit -m "feat: add lifecycle tables migration (P2-D)"
```

---

## Task 2: Feature Types

**Files:**
- Create: `src/features/lifecycle/types.ts`

- [ ] **Step 1: Create types.ts**

```typescript
export type LifecycleType = 'onboarding' | 'offboarding'
export type InstanceStatus = 'in_progress' | 'completed' | 'cancelled'
export type TaskStatus = 'pending' | 'in_progress' | 'completed'

/** タスクテンプレート（テナントカスタマイズ可能） */
export interface LifecycleTaskTemplate {
  id: string
  tenant_id: string
  lifecycle_type: LifecycleType
  title: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

/** タスク表示用（担当者名付き） */
export interface TaskRow {
  id: string
  instance_id: string
  title: string
  description: string | null
  assignee_id: string | null
  assignee_name: string | null
  status: TaskStatus
  sort_order: number
  due_date: string | null
  completed_at: string | null
}

/** インスタンス一覧表示用（従業員名・部署名・タスク進捗付き） */
export interface InstanceRow {
  id: string
  lifecycle_type: LifecycleType
  status: InstanceStatus
  employee_id: string
  employee_name: string
  department_name: string | null
  scheduled_date: string | null
  notes: string | null
  created_at: string
  completed_at: string | null
  tasks: TaskRow[]
  total_tasks: number
  completed_tasks: number
}

/** ダッシュボード全体データ */
export interface LifecycleDashboardData {
  onboardingInstances: InstanceRow[]
  offboardingInstances: InstanceRow[]
  templates: LifecycleTaskTemplate[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/lifecycle/types.ts
git commit -m "feat: add lifecycle feature types (P2-D)"
```

---

## Task 3: Supabase Types Update

**Files:**
- Modify: `src/lib/supabase/types.ts`

- [ ] **Step 1: Find insertion point**

`src/lib/supabase/types.ts` の `job_postings` テーブル定義の閉じ `}` 直後（アルファベット順: j → l → m）、`monthly_employee_overtime` の前に以下を挿入する。

```typescript
      lifecycle_instances: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          lifecycle_type: string
          notes: string | null
          scheduled_date: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          lifecycle_type: string
          notes?: string | null
          scheduled_date?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          lifecycle_type?: string
          notes?: string | null
          scheduled_date?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lifecycle_instances_employee_id_fkey'
            columns: ['employee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lifecycle_instances_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      lifecycle_task_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          lifecycle_type: string
          sort_order: number
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          lifecycle_type: string
          sort_order?: number
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          lifecycle_type?: string
          sort_order?: number
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lifecycle_task_templates_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          },
        ]
      }
      lifecycle_tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          instance_id: string
          sort_order: number
          status: string
          tenant_id: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          instance_id: string
          sort_order?: number
          status?: string
          tenant_id: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          instance_id?: string
          sort_order?: number
          status?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lifecycle_tasks_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'employees'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lifecycle_tasks_instance_id_fkey'
            columns: ['instance_id']
            isOneToOne: false
            referencedRelation: 'lifecycle_instances'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lifecycle_tasks_tenant_id_fkey'
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
npm run type-check 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/types.ts
git commit -m "feat: add lifecycle table types to supabase types (P2-D)"
```

---

## Task 4: Routes Config

**Files:**
- Modify: `src/config/routes.ts`

- [ ] **Step 1: Add ADMIN_LIFECYCLE after ADMIN_ONE_ON_ONE (line ~91)**

`ADMIN_ONE_ON_ONE: '/adm/one-on-one',` の直後に追記:

```typescript
    /** 入退社ライフサイクルワークフロー（P2-D） */
    ADMIN_LIFECYCLE: '/adm/lifecycle',
```

- [ ] **Step 2: Commit**

```bash
git add src/config/routes.ts
git commit -m "feat: add ADMIN_LIFECYCLE route (P2-D)"
```

---

## Task 5: Queries

**Files:**
- Create: `src/features/lifecycle/queries.ts`

- [ ] **Step 1: Create queries.ts**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type {
  LifecycleDashboardData,
  LifecycleTaskTemplate,
  InstanceRow,
  TaskRow,
} from './types'

/** テンプレート一覧を取得する */
export async function getTaskTemplates(): Promise<LifecycleTaskTemplate[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lifecycle_task_templates')
    .select('id, tenant_id, lifecycle_type, title, description, sort_order, is_active, created_at')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)
    .order('lifecycle_type')
    .order('sort_order')

  if (error || !data) return []
  return data as LifecycleTaskTemplate[]
}

/** インスタンス一覧とそのタスクを取得する */
export async function getLifecycleInstances(): Promise<InstanceRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()

  const { data: instances, error } = await supabase
    .from('lifecycle_instances')
    .select('id, lifecycle_type, status, employee_id, scheduled_date, notes, created_at, completed_at')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error || !instances || instances.length === 0) return []

  // 従業員情報を一括取得
  const employeeIds = [...new Set(instances.map(i => i.employee_id))]
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .in('id', employeeIds)
    .eq('tenant_id', user.tenant_id)

  const empMap = new Map(
    (employees ?? []).map(e => {
      const divData = e.divisions as { name: string } | { name: string }[] | null
      const deptName = Array.isArray(divData)
        ? (divData[0]?.name ?? null)
        : (divData?.name ?? null)
      return [e.id, { name: e.name ?? '', deptName }]
    })
  )

  // タスクを一括取得
  const instanceIds = instances.map(i => i.id)
  const { data: tasks } = await supabase
    .from('lifecycle_tasks')
    .select('id, instance_id, title, description, assignee_id, status, sort_order, due_date, completed_at')
    .in('instance_id', instanceIds)
    .eq('tenant_id', user.tenant_id)
    .order('sort_order')

  // 担当者情報を一括取得
  const assigneeIds = [
    ...new Set((tasks ?? []).map(t => t.assignee_id).filter(Boolean)),
  ] as string[]
  const { data: assignees } =
    assigneeIds.length > 0
      ? await supabase.from('employees').select('id, name').in('id', assigneeIds)
      : { data: [] }
  const assigneeMap = new Map((assignees ?? []).map(a => [a.id, a.name ?? '']))

  // インスタンスごとのタスクをグループ化
  const tasksByInstance = new Map<string, TaskRow[]>()
  for (const t of tasks ?? []) {
    const arr = tasksByInstance.get(t.instance_id) ?? []
    arr.push({
      id: t.id,
      instance_id: t.instance_id,
      title: t.title,
      description: t.description,
      assignee_id: t.assignee_id,
      assignee_name: t.assignee_id ? (assigneeMap.get(t.assignee_id) ?? null) : null,
      status: t.status as TaskRow['status'],
      sort_order: t.sort_order,
      due_date: t.due_date,
      completed_at: t.completed_at,
    })
    tasksByInstance.set(t.instance_id, arr)
  }

  return instances.map(inst => {
    const emp = empMap.get(inst.employee_id)
    const instTasks = tasksByInstance.get(inst.id) ?? []
    const completedTasks = instTasks.filter(t => t.status === 'completed').length

    return {
      id: inst.id,
      lifecycle_type: inst.lifecycle_type as InstanceRow['lifecycle_type'],
      status: inst.status as InstanceRow['status'],
      employee_id: inst.employee_id,
      employee_name: emp?.name ?? '',
      department_name: emp?.deptName ?? null,
      scheduled_date: inst.scheduled_date,
      notes: inst.notes,
      created_at: inst.created_at,
      completed_at: inst.completed_at,
      tasks: instTasks,
      total_tasks: instTasks.length,
      completed_tasks: completedTasks,
    }
  })
}

/** ダッシュボード用データをまとめて取得する */
export async function getLifecycleDashboardData(): Promise<LifecycleDashboardData> {
  const [instances, templates] = await Promise.all([
    getLifecycleInstances(),
    getTaskTemplates(),
  ])

  return {
    onboardingInstances: instances.filter(i => i.lifecycle_type === 'onboarding'),
    offboardingInstances: instances.filter(i => i.lifecycle_type === 'offboarding'),
    templates,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/lifecycle/queries.ts
git commit -m "feat: add lifecycle queries (P2-D)"
```

---

## Task 6: Server Actions

**Files:**
- Create: `src/features/lifecycle/actions.ts`

- [ ] **Step 1: Create actions.ts**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { APP_ROUTES } from '@/config/routes'

const HR_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

/** デフォルトタスクテンプレートをシードする（初回セットアップ用・冪等） */
export async function seedDefaultTaskTemplates(): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }

  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('lifecycle_task_templates')
    .select('id')
    .eq('tenant_id', user.tenant_id)
    .limit(1)

  if (existing && existing.length > 0) return { success: true }

  const defaults = [
    // 入社チェックリスト
    {
      lifecycle_type: 'onboarding',
      title: '雇用契約書の締結',
      description: '雇用契約書を締結し、署名済み書類を保管する',
      sort_order: 0,
    },
    {
      lifecycle_type: 'onboarding',
      title: '社会保険・雇用保険の手続き',
      description: '健康保険・厚生年金・雇用保険の加入手続きを行う',
      sort_order: 1,
    },
    {
      lifecycle_type: 'onboarding',
      title: 'マイナンバーの収集',
      description: '扶養控除等申告書と合わせてマイナンバーを収集する',
      sort_order: 2,
    },
    {
      lifecycle_type: 'onboarding',
      title: 'PCアカウントの作成',
      description: 'Google アカウント・社内システムのアカウントを発行する',
      sort_order: 3,
    },
    {
      lifecycle_type: 'onboarding',
      title: '備品・IDカードの準備',
      description: 'PC・名刺・入館証・備品を準備する',
      sort_order: 4,
    },
    {
      lifecycle_type: 'onboarding',
      title: '入社初日のオリエンテーション実施',
      description: '社内ルール・ツール説明・部署紹介を行う',
      sort_order: 5,
    },
    {
      lifecycle_type: 'onboarding',
      title: '研修スケジュールの割り当て',
      description: '入社研修・e-ラーニングコースをアサインする',
      sort_order: 6,
    },
    {
      lifecycle_type: 'onboarding',
      title: '部署への配属完了確認',
      description: '組織図・Slack チャンネルへの追加を確認する',
      sort_order: 7,
    },
    // 退社チェックリスト
    {
      lifecycle_type: 'offboarding',
      title: '退職意向の確認・退職届受領',
      description: '退職届を受領し、最終出社日を確定する',
      sort_order: 0,
    },
    {
      lifecycle_type: 'offboarding',
      title: '業務引き継ぎスケジュールの作成',
      description: '後任者への引き継ぎ計画と期限を設定する',
      sort_order: 1,
    },
    {
      lifecycle_type: 'offboarding',
      title: '引き継ぎドキュメントの作成',
      description: '業務手順・連絡先・注意事項を文書化する',
      sort_order: 2,
    },
    {
      lifecycle_type: 'offboarding',
      title: 'PCアカウントの削除',
      description: 'Google・Slack・社内システムのアカウントを削除 / 無効化する',
      sort_order: 3,
    },
    {
      lifecycle_type: 'offboarding',
      title: '備品・IDカードの回収',
      description: 'PC・名刺・入館証・貸与備品を回収する',
      sort_order: 4,
    },
    {
      lifecycle_type: 'offboarding',
      title: '健康保険・厚生年金の喪失手続き',
      description: '資格喪失届を提出する（退職日翌日から5日以内）',
      sort_order: 5,
    },
    {
      lifecycle_type: 'offboarding',
      title: '雇用保険の離職票発行',
      description: '離職票を作成し本人に交付する',
      sort_order: 6,
    },
    {
      lifecycle_type: 'offboarding',
      title: '源泉徴収票の発行',
      description: '退職月分の源泉徴収票を作成し本人に交付する',
      sort_order: 7,
    },
  ]

  const { error } = await supabase
    .from('lifecycle_task_templates')
    .insert(defaults.map(d => ({ ...d, tenant_id: user.tenant_id! })))

  if (error) return { success: false, error: error.message }

  // revalidatePath はレンダリング中に呼び出せないため省略（page.tsx から呼ばれるシード関数）
  return { success: true }
}

const createInstanceSchema = z.object({
  employeeId: z.string().uuid(),
  lifecycleType: z.enum(['onboarding', 'offboarding']),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().max(2000).optional(),
})

/** ライフサイクルインスタンスを作成し、テンプレートからタスクをコピーする */
export async function createLifecycleInstance(input: {
  employeeId: string
  lifecycleType: 'onboarding' | 'offboarding'
  scheduledDate?: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: 'Unauthorized' }

  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const parsed = createInstanceSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = await createClient()

  const { data: instance, error: instanceError } = await supabase
    .from('lifecycle_instances')
    .insert({
      tenant_id: user.tenant_id,
      employee_id: parsed.data.employeeId,
      lifecycle_type: parsed.data.lifecycleType,
      scheduled_date: parsed.data.scheduledDate ?? null,
      notes: parsed.data.notes ?? null,
      created_by: user.employee_id,
    })
    .select('id')
    .single()

  if (instanceError || !instance) {
    return { success: false, error: instanceError?.message ?? 'Failed to create instance' }
  }

  // テンプレートからタスクをコピー（担当者のデフォルトは作成者）
  const { data: templates } = await supabase
    .from('lifecycle_task_templates')
    .select('title, description, sort_order')
    .eq('tenant_id', user.tenant_id)
    .eq('lifecycle_type', parsed.data.lifecycleType)
    .eq('is_active', true)
    .order('sort_order')

  if (templates && templates.length > 0) {
    const tasks = templates.map(t => ({
      instance_id: instance.id,
      tenant_id: user.tenant_id!,
      title: t.title,
      description: t.description,
      sort_order: t.sort_order,
      assignee_id: user.employee_id,
    }))

    const { error: tasksError } = await supabase.from('lifecycle_tasks').insert(tasks)
    if (tasksError) return { success: false, error: tasksError.message }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_LIFECYCLE)
  return { success: true }
}

/** タスクのステータスを更新する */
export async function updateTaskStatus(
  taskId: string,
  status: 'pending' | 'in_progress' | 'completed'
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('lifecycle_tasks')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', taskId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_LIFECYCLE)
  return { success: true }
}

/** タスクの担当者を更新する */
export async function updateTaskAssignee(
  taskId: string,
  assigneeId: string | null
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }

  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('lifecycle_tasks')
    .update({ assignee_id: assigneeId })
    .eq('id', taskId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_LIFECYCLE)
  return { success: true }
}

/** インスタンスのメモ（引き継ぎドキュメント）を更新する */
export async function updateInstanceNotes(
  instanceId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }

  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('lifecycle_instances')
    .update({ notes })
    .eq('id', instanceId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_LIFECYCLE)
  return { success: true }
}

/** インスタンスのステータスを更新する */
export async function updateInstanceStatus(
  instanceId: string,
  status: 'in_progress' | 'completed' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }

  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('lifecycle_instances')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', instanceId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_LIFECYCLE)
  return { success: true }
}

const templateSchema = z.object({
  lifecycleType: z.enum(['onboarding', 'offboarding']),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(999),
})

/** タスクテンプレートを追加する */
export async function addTaskTemplate(input: {
  lifecycleType: 'onboarding' | 'offboarding'
  title: string
  description?: string
  sortOrder?: number
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }

  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const parsed = templateSchema.safeParse({
    lifecycleType: input.lifecycleType,
    title: input.title,
    description: input.description,
    sortOrder: input.sortOrder ?? 0,
  })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = await createClient()

  const { error } = await supabase.from('lifecycle_task_templates').insert({
    tenant_id: user.tenant_id,
    lifecycle_type: parsed.data.lifecycleType,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    sort_order: parsed.data.sortOrder,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_LIFECYCLE)
  return { success: true }
}

/** タスクテンプレートを論理削除する */
export async function deleteTaskTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }

  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('lifecycle_task_templates')
    .update({ is_active: false })
    .eq('id', templateId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_LIFECYCLE)
  return { success: true }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/lifecycle/actions.ts
git commit -m "feat: add lifecycle server actions (P2-D)"
```

---

## Task 7: Page Files

**Files:**
- Create: `src/app/(tenant)/(colored)/adm/(lifecycle)/lifecycle/page.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(lifecycle)/lifecycle/loading.tsx`
- Create: `src/app/(tenant)/(colored)/adm/(lifecycle)/lifecycle/error.tsx`

- [ ] **Step 1: Create page.tsx**

```typescript
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getLifecycleDashboardData } from '@/features/lifecycle/queries'
import { seedDefaultTaskTemplates } from '@/features/lifecycle/actions'
import { LifecycleDashboard } from '@/features/lifecycle/components/LifecycleDashboard'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: '入退社ライフサイクルワークフロー' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function LifecyclePage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  // テンプレートが空の場合にデフォルトをシード（冪等）
  await seedDefaultTaskTemplates()

  const supabase = await createClient()
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')
    .order('name')

  const employeeList = (employees ?? []).map(e => {
    const divData = e.divisions as { name: string } | { name: string }[] | null
    const deptName = Array.isArray(divData)
      ? (divData[0]?.name ?? null)
      : (divData?.name ?? null)
    return { id: e.id, name: e.name ?? '', department_name: deptName }
  })

  const data = await getLifecycleDashboardData()

  return <LifecycleDashboard data={data} employees={employeeList} />
}
```

- [ ] **Step 2: Create loading.tsx**

```typescript
export default function LifecycleLoading() {
  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm animate-pulse">
        <div className="border-b border-gray-200 bg-gray-100 h-10" />
        <div className="border-b border-gray-200 bg-gray-200 h-20" />
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 w-32 rounded-full bg-gray-100" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <div key={i} className="h-20 rounded-xl bg-gray-100" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create error.tsx**

```typescript
'use client'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function LifecycleError({ error, reset }: Props) {
  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
        <div className="border-b border-red-200 bg-red-50 px-6 py-4">
          <h2 className="text-base font-semibold text-red-700">
            入退社ライフサイクルワークフローの読み込みに失敗しました
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">{error.message}</p>
          <button
            onClick={reset}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(tenant\)/\(colored\)/adm/\(lifecycle\)/
git commit -m "feat: add lifecycle page files (P2-D)"
```

---

## Task 8: UI Components

**Files:**
- Create: `src/features/lifecycle/components/InstanceList.tsx`
- Create: `src/features/lifecycle/components/NewInstanceModal.tsx`
- Create: `src/features/lifecycle/components/TaskChecklistModal.tsx`
- Create: `src/features/lifecycle/components/TemplateManager.tsx`
- Create: `src/features/lifecycle/components/LifecycleDashboard.tsx`

### 8-A: InstanceList

- [ ] **Step 1: Create InstanceList.tsx**

```tsx
'use client'

import type { InstanceRow } from '../types'

interface Props {
  instances: InstanceRow[]
  onSelectInstance: (id: string) => void
}

const statusLabel: Record<string, string> = {
  in_progress: '対応中',
  completed: '完了',
  cancelled: 'キャンセル',
}

const statusClass: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export function InstanceList({ instances, onSelectInstance }: Props) {
  if (instances.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
        <p className="text-sm text-gray-500">
          フローはまだありません。上部のボタンから開始してください。
        </p>
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
                ステータス
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                進捗
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800">
                予定日
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800 w-20">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {instances.map((inst, idx) => {
              const progress =
                inst.total_tasks > 0
                  ? Math.round((inst.completed_tasks / inst.total_tasks) * 100)
                  : 0

              return (
                <tr
                  key={inst.id}
                  className={`border-b border-gray-100 transition-[background-color,box-shadow] duration-300 ease-out hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {inst.employee_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {inst.department_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass[inst.status] ?? 'bg-gray-100 text-gray-500'}`}
                    >
                      {statusLabel[inst.status] ?? inst.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {inst.completed_tasks}/{inst.total_tasks}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {inst.scheduled_date ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onSelectInstance(inst.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      タスク確認
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

### 8-B: NewInstanceModal

- [ ] **Step 2: Create NewInstanceModal.tsx**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { createLifecycleInstance } from '../actions'
import type { LifecycleTaskTemplate } from '../types'

interface Props {
  lifecycleType: 'onboarding' | 'offboarding'
  employees: { id: string; name: string; department_name: string | null }[]
  templates: LifecycleTaskTemplate[]
  onClose: () => void
}

export function NewInstanceModal({ lifecycleType, employees, templates, onClose }: Props) {
  const [employeeId, setEmployeeId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const title = lifecycleType === 'onboarding' ? '入社フロー開始' : '退社フロー開始'
  const dateLabel = lifecycleType === 'onboarding' ? '入社予定日' : '退社予定日'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId) {
      setError('従業員を選択してください')
      return
    }
    setError(null)

    startTransition(async () => {
      const result = await createLifecycleInstance({
        employeeId,
        lifecycleType,
        scheduledDate: scheduledDate || undefined,
        notes: notes || undefined,
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
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">{dateLabel}</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {lifecycleType === 'offboarding' ? '引き継ぎメモ' : '備考'}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder={
                lifecycleType === 'offboarding'
                  ? '引き継ぎ内容・注意事項を記入...'
                  : '備考を入力...'
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {templates.length > 0 && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">
                以下の {templates.length} 件のタスクが自動生成されます
              </p>
              <ul className="space-y-1">
                {templates.slice(0, 5).map(t => (
                  <li key={t.id} className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="text-gray-400">✓</span>
                    {t.title}
                  </li>
                ))}
                {templates.length > 5 && (
                  <li className="text-xs text-gray-400">他 {templates.length - 5} 件...</li>
                )}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? '処理中...' : 'フロー開始'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

### 8-C: TaskChecklistModal

- [ ] **Step 3: Create TaskChecklistModal.tsx**

```tsx
'use client'

import { useState, useTransition, useMemo } from 'react'
import { updateTaskStatus, updateInstanceStatus, updateInstanceNotes } from '../actions'
import type { InstanceRow, TaskStatus } from '../types'

interface Props {
  instance: InstanceRow
  onClose: () => void
}

const taskStatusLabel: Record<TaskStatus, string> = {
  pending: '未着手',
  in_progress: '対応中',
  completed: '完了',
}

const nextStatus: Record<TaskStatus, TaskStatus> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'pending',
}

const taskStatusClass: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
}

export function TaskChecklistModal({ instance, onClose }: Props) {
  // ローカルステートで楽観的更新を管理（クリックで即反映、サーバー失敗時はロールバック）
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatus>>(() =>
    Object.fromEntries(instance.tasks.map(t => [t.id, t.status]))
  )
  const [notes, setNotes] = useState(instance.notes ?? '')
  const [notesEditing, setNotesEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const completedCount = useMemo(
    () => Object.values(taskStatuses).filter(s => s === 'completed').length,
    [taskStatuses]
  )
  const totalCount = instance.tasks.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const handleTaskClick = (taskId: string) => {
    const current = taskStatuses[taskId] ?? 'pending'
    const next = nextStatus[current]
    setTaskStatuses(prev => ({ ...prev, [taskId]: next }))

    startTransition(async () => {
      const result = await updateTaskStatus(taskId, next)
      if (!result.success) {
        setTaskStatuses(prev => ({ ...prev, [taskId]: current }))
      }
    })
  }

  const handleCompleteInstance = () => {
    startTransition(async () => {
      await updateInstanceStatus(instance.id, 'completed')
      onClose()
    })
  }

  const handleSaveNotes = () => {
    startTransition(async () => {
      await updateInstanceNotes(instance.id, notes)
      setNotesEditing(false)
    })
  }

  const lifecycleLabel = instance.lifecycle_type === 'onboarding' ? '入社' : '退社'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {instance.employee_name} — {lifecycleLabel}チェックリスト
            </h2>
            {instance.scheduled_date && (
              <p className="text-xs text-gray-500 mt-0.5">
                {lifecycleLabel}予定日: {instance.scheduled_date}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* 進捗バー */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-700">
                タスク進捗 ({completedCount}/{totalCount} 完了)
              </span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* タスク一覧（ボタンクリックで未着手→対応中→完了→未着手と循環） */}
          <ul className="space-y-2">
            {instance.tasks.map(task => {
              const status = taskStatuses[task.id] ?? task.status
              return (
                <li
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                >
                  <button
                    onClick={() => handleTaskClick(task.id)}
                    disabled={isPending}
                    className={`mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80 ${taskStatusClass[status]}`}
                  >
                    {taskStatusLabel[status]}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                    )}
                    {task.assignee_name && (
                      <p className="text-xs text-gray-400 mt-0.5">担当: {task.assignee_name}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          {/* 引き継ぎメモ / 備考 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">
                {instance.lifecycle_type === 'offboarding' ? '引き継ぎドキュメント' : 'メモ'}
              </h3>
              {!notesEditing && (
                <button
                  onClick={() => setNotesEditing(true)}
                  className="text-xs text-primary hover:underline"
                >
                  編集
                </button>
              )}
            </div>
            {notesEditing ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={5}
                  placeholder={
                    instance.lifecycle_type === 'offboarding'
                      ? '引き継ぎ内容・注意事項を記入...'
                      : 'メモを入力...'
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setNotesEditing(false)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    disabled={isPending}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 min-h-[60px]">
                {notes ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
                ) : (
                  <p className="text-sm text-gray-400">メモはありません</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        {instance.status === 'in_progress' && (
          <div className="border-t border-gray-200 px-6 py-4 flex-shrink-0 flex justify-between items-center">
            <p className="text-xs text-gray-500">全タスク完了後にワークフローを終了できます</p>
            <button
              onClick={handleCompleteInstance}
              disabled={isPending || completedCount < totalCount}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ワークフロー完了
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

### 8-D: TemplateManager

- [ ] **Step 4: Create TemplateManager.tsx**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { addTaskTemplate, deleteTaskTemplate } from '../actions'
import type { LifecycleTaskTemplate } from '../types'

interface Props {
  templates: LifecycleTaskTemplate[]
}

export function TemplateManager({ templates }: Props) {
  const [activeType, setActiveType] = useState<'onboarding' | 'offboarding'>('onboarding')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = templates.filter(t => t.lifecycle_type === activeType)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      setFormError('タイトルを入力してください')
      return
    }

    startTransition(async () => {
      const result = await addTaskTemplate({
        lifecycleType: activeType,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        sortOrder: filtered.length,
      })

      if (!result.success) {
        setFormError(result.error ?? 'エラーが発生しました')
        return
      }

      setNewTitle('')
      setNewDescription('')
      setShowAddForm(false)
      setFormError(null)
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteTaskTemplate(id)
    })
  }

  return (
    <div className="space-y-4">
      {/* タイプ切替 */}
      <div className="flex gap-2">
        {(['onboarding', 'offboarding'] as const).map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={
              activeType === type
                ? 'rounded-full px-4 py-1.5 text-sm font-medium bg-primary text-white shadow-sm'
                : 'rounded-full px-4 py-1.5 text-sm font-medium border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
            }
          >
            {type === 'onboarding' ? '入社チェックリスト' : '退社チェックリスト'}
          </button>
        ))}
      </div>

      {/* テンプレート一覧 */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-200">
              <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                タスク名
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-800">
                説明
              </th>
              <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-800 w-16">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">
                  テンプレートがありません
                </td>
              </tr>
            ) : (
              filtered.map((t, idx) => (
                <tr
                  key={t.id}
                  className={`border-b border-gray-100 transition-[background-color,box-shadow] duration-300 ease-out hover:bg-gray-100 hover:shadow-[0_6px_22px_-4px_rgba(15,23,42,0.22)] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{t.description ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={isPending}
                      className="text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 追加フォーム */}
      {showAddForm ? (
        <form
          onSubmit={handleAdd}
          className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タスク名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="タスク名を入力..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">説明（任意）</label>
            <input
              type="text"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              placeholder="タスクの説明を入力..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setFormError(null)
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              追加
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-500 hover:border-primary hover:text-primary transition-colors w-full"
        >
          ＋ タスクを追加
        </button>
      )}
    </div>
  )
}
```

### 8-E: LifecycleDashboard（メインコンポーネント）

- [ ] **Step 5: Create LifecycleDashboard.tsx**

```tsx
'use client'

import { useState } from 'react'
import type { LifecycleDashboardData, InstanceRow } from '../types'
import { InstanceList } from './InstanceList'
import { NewInstanceModal } from './NewInstanceModal'
import { TaskChecklistModal } from './TaskChecklistModal'
import { TemplateManager } from './TemplateManager'

type Tab = 'onboarding' | 'offboarding' | 'templates'

interface Props {
  data: LifecycleDashboardData
  employees: { id: string; name: string; department_name: string | null }[]
}

export function LifecycleDashboard({ data, employees }: Props) {
  const [tab, setTab] = useState<Tab>('onboarding')
  const [showNewModal, setShowNewModal] = useState(false)
  const [newModalType, setNewModalType] = useState<'onboarding' | 'offboarding'>('onboarding')
  const [selectedInstance, setSelectedInstance] = useState<InstanceRow | null>(null)

  const allInstances = [...data.onboardingInstances, ...data.offboardingInstances]

  const handleSelectInstance = (id: string) => {
    setSelectedInstance(allInstances.find(i => i.id === id) ?? null)
  }

  const inProgressOnboarding = data.onboardingInstances.filter(
    i => i.status === 'in_progress'
  ).length
  const inProgressOffboarding = data.offboardingInstances.filter(
    i => i.status === 'in_progress'
  ).length

  return (
    <div className="p-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* パス */}
        <div className="border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600">
          /adm/lifecycle — 入退社ライフサイクルワークフロー
        </div>

        {/* ヘッダー */}
        <div className="bg-gray-200 border-b border-gray-300 px-6 py-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            入退社ライフサイクルワークフロー
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setNewModalType('onboarding')
                setShowNewModal(true)
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 transition-opacity"
            >
              ＋ 入社フロー開始
            </button>
            <button
              onClick={() => {
                setNewModalType('offboarding')
                setShowNewModal(true)
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              ＋ 退社フロー開始
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* タブ（-mx-6 -mt-6 でページ最上部にブリード）*/}
          <div className="-mx-6 -mt-6 px-6 py-3.5 mb-6 border-b border-gray-200 bg-white flex gap-2">
            {[
              {
                key: 'onboarding' as Tab,
                label: `入社フロー (${data.onboardingInstances.length})`,
              },
              {
                key: 'offboarding' as Tab,
                label: `退社フロー (${data.offboardingInstances.length})`,
              },
              { key: 'templates' as Tab, label: 'テンプレート管理' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={
                  tab === t.key
                    ? 'rounded-full px-4 py-1.5 text-sm font-medium bg-primary text-white shadow-sm'
                    : 'rounded-full px-4 py-1.5 text-sm font-medium border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* サマリーバッジ（テンプレートタブ以外） */}
          {tab !== 'templates' && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">入社フロー進行中</p>
                <p className="text-3xl font-bold text-gray-900">{inProgressOnboarding}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500 mb-1">退社フロー進行中</p>
                <p className="text-3xl font-bold text-gray-900">{inProgressOffboarding}</p>
              </div>
            </div>
          )}

          {/* タブコンテンツ */}
          {tab === 'onboarding' && (
            <InstanceList
              instances={data.onboardingInstances}
              onSelectInstance={handleSelectInstance}
            />
          )}
          {tab === 'offboarding' && (
            <InstanceList
              instances={data.offboardingInstances}
              onSelectInstance={handleSelectInstance}
            />
          )}
          {tab === 'templates' && <TemplateManager templates={data.templates} />}
        </div>
      </div>

      {showNewModal && (
        <NewInstanceModal
          lifecycleType={newModalType}
          employees={employees}
          templates={data.templates.filter(t => t.lifecycle_type === newModalType)}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {selectedInstance && (
        <TaskChecklistModal
          instance={selectedInstance}
          onClose={() => setSelectedInstance(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/features/lifecycle/components/
git commit -m "feat: add lifecycle UI components (P2-D)"
```

---

## Task 9: Type Check & Lint

- [ ] **Step 1: Run type check**

```bash
npm run type-check
```

Expected: no errors。よくあるエラーと対処:
- `user.tenant_id` の null エラー → ガード節で対処（既に `if (!user?.tenant_id) return ...` で保護済み）
- Supabase `divisions` ネスト型エラー → `as { name: string } | ...` のキャストで対処（既存パターン通り）

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: エラーがあれば修正してコミット**

```bash
git add -p
git commit -m "fix: resolve type/lint errors in lifecycle feature (P2-D)"
```

---

## Spec Coverage チェック

| 仕様要件 | 対応タスク |
|---|---|
| 入社CL（書類収集→システム登録→備品準備→初日OT→研修割り当て） | Task 6: `seedDefaultTaskTemplates` 入社8タスク |
| 退社CL（意向確認→引き継ぎ→アカウント削除→退職手続き→離職票発行） | Task 6: `seedDefaultTaskTemplates` 退社8タスク |
| タスク担当者の自動割り当て | Task 6: `createLifecycleInstance` — `assignee_id = user.employee_id` |
| 進捗ステータス管理（完了・対応中・未着手） | Task 6: `updateTaskStatus` + Task 8-C: クリックで循環 |
| 引き継ぎドキュメントテンプレート | Task 6: `updateInstanceNotes` + Task 8-C: メモ編集 UI |
| テンプレートのカスタマイズ（追加・削除） | Task 6 + Task 8-D: `TemplateManager` |
| `/adm/lifecycle` ルート | Task 4: `ADMIN_LIFECYCLE` + Task 7: `page.tsx` |
| `loading.tsx` / `error.tsx` 配置 | Task 7 |
| 既存テーブル非破壊 | Task 1: `CREATE TABLE` のみ、`ALTER TABLE` / `DROP` なし |
| RLS ポリシー（全テーブル） | Task 1: 3テーブルすべてに `tenant_isolation` ポリシー |
