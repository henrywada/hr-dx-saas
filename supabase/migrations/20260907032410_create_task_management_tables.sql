-- 目標（責任者が作成）
CREATE TABLE IF NOT EXISTS public.task_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  owner_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.task_objectives IS 'タスク管理: 責任者が作成する目標';

-- マイルストーン
CREATE TABLE IF NOT EXISTS public.task_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES public.task_objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.task_milestones IS 'タスク管理: 目標配下のマイルストーン';

-- タスクグループ
CREATE TABLE IF NOT EXISTS public.task_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES public.task_milestones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.task_groups IS 'タスク管理: マイルストーン配下のタスクグループ';

-- タスクグループのマネージャー割当（責任者のみが操作可）
CREATE TABLE IF NOT EXISTS public.task_group_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_group_id UUID NOT NULL REFERENCES public.task_groups(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_group_id, employee_id)
);

COMMENT ON TABLE public.task_group_managers IS 'タスク管理: タスクグループのマネージャー割当（責任者のみ操作可）';

-- タスクグループのメンバー割当（責任者・マネージャーが操作可）
CREATE TABLE IF NOT EXISTS public.task_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_group_id UUID NOT NULL REFERENCES public.task_groups(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_group_id, employee_id)
);

COMMENT ON TABLE public.task_group_members IS 'タスク管理: タスクグループのメンバー割当（責任者・マネージャーが操作可）';

-- タスク
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  task_group_id UUID NOT NULL REFERENCES public.task_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignee_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
  progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date DATE,
  sort_order INT NOT NULL DEFAULT 0,
  created_by_employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tasks IS 'タスク管理: タスクグループ配下の個別タスク';

CREATE INDEX IF NOT EXISTS idx_task_milestones_objective_id ON public.task_milestones(objective_id);
CREATE INDEX IF NOT EXISTS idx_task_groups_milestone_id ON public.task_groups(milestone_id);
CREATE INDEX IF NOT EXISTS idx_task_group_managers_task_group_id ON public.task_group_managers(task_group_id);
CREATE INDEX IF NOT EXISTS idx_task_group_members_task_group_id ON public.task_group_members(task_group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_group_id ON public.tasks(task_group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_employee_id ON public.tasks(assignee_employee_id);

CREATE OR REPLACE FUNCTION public.is_task_objective_owner(p_objective_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_objectives o
    WHERE o.id = p_objective_id AND o.owner_employee_id = public.current_employee_id()
  );
$$;

COMMENT ON FUNCTION public.is_task_objective_owner(UUID) IS 'ログインユーザーが指定した目標の責任者かどうか';

CREATE OR REPLACE FUNCTION public.is_task_group_manager(p_task_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_group_managers m
    WHERE m.task_group_id = p_task_group_id AND m.employee_id = public.current_employee_id()
  );
$$;

COMMENT ON FUNCTION public.is_task_group_manager(UUID) IS 'ログインユーザーが指定したタスクグループのマネージャーかどうか';

CREATE OR REPLACE FUNCTION public.is_task_group_member(p_task_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_group_members m
    WHERE m.task_group_id = p_task_group_id AND m.employee_id = public.current_employee_id()
  );
$$;

COMMENT ON FUNCTION public.is_task_group_member(UUID) IS 'ログインユーザーが指定したタスクグループのメンバーかどうか';

CREATE OR REPLACE FUNCTION public.is_task_group_owner(p_task_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.task_groups g
    JOIN public.task_milestones ms ON ms.id = g.milestone_id
    WHERE g.id = p_task_group_id
      AND public.is_task_objective_owner(ms.objective_id)
  );
$$;

COMMENT ON FUNCTION public.is_task_group_owner(UUID) IS 'ログインユーザーが指定したタスクグループが属する目標の責任者かどうか';

CREATE OR REPLACE FUNCTION public.is_task_group_participant(p_task_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_task_group_manager(p_task_group_id)
    OR public.is_task_group_member(p_task_group_id)
    OR public.is_task_group_owner(p_task_group_id);
$$;

COMMENT ON FUNCTION public.is_task_group_participant(UUID) IS 'ログインユーザーが指定したタスクグループの責任者/マネージャー/メンバーのいずれかかどうか';

ALTER TABLE public.task_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_group_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- task_objectives: 責任者本人 / 参加している配下グループがある / テナント管理者 が閲覧可。作成・更新・削除は責任者本人かテナント管理者のみ
CREATE POLICY "task_objectives_select" ON public.task_objectives
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      owner_employee_id = public.current_employee_id()
      OR public.current_employee_app_role() <> 'employee'
      OR EXISTS (
        SELECT 1 FROM public.task_milestones ms
        JOIN public.task_groups g ON g.milestone_id = ms.id
        WHERE ms.objective_id = task_objectives.id
          AND public.is_task_group_participant(g.id)
      )
    )
  );

CREATE POLICY "task_objectives_insert" ON public.task_objectives
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND owner_employee_id = public.current_employee_id()
  );

CREATE POLICY "task_objectives_update" ON public.task_objectives
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    AND (owner_employee_id = public.current_employee_id() OR public.current_employee_app_role() <> 'employee')
  );

CREATE POLICY "task_objectives_delete" ON public.task_objectives
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND (owner_employee_id = public.current_employee_id() OR public.current_employee_app_role() <> 'employee')
  );

-- task_milestones: 目標の責任者のみ作成/更新/削除。閲覧は目標参加者
CREATE POLICY "task_milestones_select" ON public.task_milestones
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_objective_owner(objective_id)
      OR public.current_employee_app_role() <> 'employee'
      OR EXISTS (
        SELECT 1 FROM public.task_groups g
        WHERE g.milestone_id = task_milestones.id
          AND public.is_task_group_participant(g.id)
      )
    )
  );

CREATE POLICY "task_milestones_insert" ON public.task_milestones
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.is_task_objective_owner(objective_id)
  );

CREATE POLICY "task_milestones_update" ON public.task_milestones
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_objective_owner(objective_id) OR public.current_employee_app_role() <> 'employee')
  );

CREATE POLICY "task_milestones_delete" ON public.task_milestones
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_objective_owner(objective_id) OR public.current_employee_app_role() <> 'employee')
  );

-- task_groups: 目標の責任者のみ作成/削除。閲覧・更新は参加者
CREATE POLICY "task_groups_select" ON public.task_groups
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_group_participant(id) OR public.current_employee_app_role() <> 'employee')
  );

CREATE POLICY "task_groups_insert" ON public.task_groups
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.task_milestones ms
      WHERE ms.id = milestone_id AND public.is_task_objective_owner(ms.objective_id)
    )
  );

CREATE POLICY "task_groups_update" ON public.task_groups
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_group_owner(id) OR public.current_employee_app_role() <> 'employee')
  );

CREATE POLICY "task_groups_delete" ON public.task_groups
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_group_owner(id) OR public.current_employee_app_role() <> 'employee')
  );

-- task_group_managers: 責任者のみ割当・解除可
CREATE POLICY "task_group_managers_select" ON public.task_group_managers
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_group_participant(task_group_id) OR public.current_employee_app_role() <> 'employee')
  );

CREATE POLICY "task_group_managers_insert" ON public.task_group_managers
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_group_owner(task_group_id) OR public.current_employee_app_role() <> 'employee')
  );

CREATE POLICY "task_group_managers_delete" ON public.task_group_managers
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_group_owner(task_group_id) OR public.current_employee_app_role() <> 'employee')
  );

-- task_group_members: 責任者またはマネージャーが割当・解除可
CREATE POLICY "task_group_members_select" ON public.task_group_members
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_group_participant(task_group_id) OR public.current_employee_app_role() <> 'employee')
  );

CREATE POLICY "task_group_members_insert" ON public.task_group_members
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_group_owner(task_group_id)
      OR public.is_task_group_manager(task_group_id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );

CREATE POLICY "task_group_members_delete" ON public.task_group_members
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_group_owner(task_group_id)
      OR public.is_task_group_manager(task_group_id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );

-- tasks: 責任者/マネージャーが作成・全項目更新・削除可。担当者(assignee)本人はstatus/progress_percentのみ更新可（カラム制限はServer Action側で行う。Task16参照）
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (public.is_task_group_participant(task_group_id) OR public.current_employee_app_role() <> 'employee')
  );

CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_group_owner(task_group_id)
      OR public.is_task_group_manager(task_group_id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );

CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE USING (
    tenant_id = public.current_tenant_id()
    AND (
      assignee_employee_id = public.current_employee_id()
      OR public.is_task_group_owner(task_group_id)
      OR public.is_task_group_manager(task_group_id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );

CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_group_owner(task_group_id)
      OR public.is_task_group_manager(task_group_id)
      OR public.current_employee_app_role() <> 'employee'
    )
  );
