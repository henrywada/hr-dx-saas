-- 悩み・相談窓口 v2: 宛先選択・Claimロック
-- 設計: docs/superpowers/specs/2026-06-27-consultation-desk-routing-v2-design.md

ALTER TABLE public.consultations
  ADD COLUMN target_type TEXT NOT NULL DEFAULT 'other_any'
    CHECK (target_type IN ('medical_staff', 'hr', 'hr_manager', 'manager', 'hsc', 'other_any')),
  ADD COLUMN target_employee_id UUID REFERENCES public.employees(id),
  ADD COLUMN claimed_by UUID REFERENCES public.employees(id),
  ADD COLUMN claimed_at TIMESTAMPTZ;

ALTER TABLE public.consultations
  ADD CONSTRAINT consultations_target_employee_id_check
    CHECK (
      (target_type = 'manager' AND target_employee_id IS NOT NULL)
      OR (target_type <> 'manager' AND target_employee_id IS NULL)
    );

CREATE INDEX idx_consultations_target_claimed ON public.consultations (target_type, claimed_by);

-- 既存のRLSポリシーを宛先＋claim状態ベースに全面差し替える
DROP POLICY "consultations_select_staff" ON public.consultations;
DROP POLICY "consultations_update_staff" ON public.consultations;

CREATE POLICY "consultations_select_target_unclaimed" ON public.consultations
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND claimed_by IS NULL
    AND (
      (target_type = 'medical_staff' AND current_employee_app_role() = ANY (ARRAY['company_doctor', 'company_nurse']))
      OR (target_type = 'hr' AND current_employee_app_role() = 'hr')
      OR (target_type = 'hr_manager' AND current_employee_app_role() = 'hr_manager')
      OR (target_type = 'hsc' AND current_employee_app_role() = 'hsc')
      OR (target_type = 'manager' AND target_employee_id = current_employee_id())
      OR (target_type = 'other_any' AND (
            current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'hsc'])
            OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = current_employee_id() AND e.is_manager = true)
          ))
    )
  );

CREATE POLICY "consultations_select_claimed_by_me" ON public.consultations
  FOR SELECT USING (
    tenant_id = current_tenant_id()
    AND claimed_by = current_employee_id()
  );

-- claim操作専用: 未claimの行を、宛先に該当する者だけが claimed_by=自分 に更新できる
CREATE POLICY "consultations_claim" ON public.consultations
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND claimed_by IS NULL
    AND (
      (target_type = 'medical_staff' AND current_employee_app_role() = ANY (ARRAY['company_doctor', 'company_nurse']))
      OR (target_type = 'hr' AND current_employee_app_role() = 'hr')
      OR (target_type = 'hr_manager' AND current_employee_app_role() = 'hr_manager')
      OR (target_type = 'hsc' AND current_employee_app_role() = 'hsc')
      OR (target_type = 'manager' AND target_employee_id = current_employee_id())
      OR (target_type = 'other_any' AND (
            current_employee_app_role() = ANY (ARRAY['hr', 'hr_manager', 'hsc'])
            OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = current_employee_id() AND e.is_manager = true)
          ))
    )
  )
  WITH CHECK (claimed_by = current_employee_id());

-- claim済みの行に対する以後の更新（ステータス変更等）は claim した本人のみ許可
-- （設計書のRLSにはこのポリシーが無く、claim後は updateConsultationStatus が
--  マッチするUPDATEポリシーを持たなくなるため、本マイグレーションで追加する）
CREATE POLICY "consultations_update_claimed_by_me" ON public.consultations
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND claimed_by = current_employee_id()
  )
  WITH CHECK (claimed_by = current_employee_id());

-- consultations_select_self / consultations_insert_self は変更しない（相談者本人の閲覧・投稿はv1のまま）

-- consultation_replies: claim前は誰も読み書きできない
DROP POLICY "consultation_replies_select" ON public.consultation_replies;
DROP POLICY "consultation_replies_insert" ON public.consultation_replies;

CREATE POLICY "consultation_replies_select" ON public.consultation_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_replies.consultation_id
        AND c.tenant_id = current_tenant_id()
        AND (c.employee_id = current_employee_id() OR c.claimed_by = current_employee_id())
    )
  );

CREATE POLICY "consultation_replies_insert" ON public.consultation_replies
  FOR INSERT WITH CHECK (
    author_employee_id = current_employee_id()
    AND EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_replies.consultation_id
        AND c.tenant_id = current_tenant_id()
        AND c.claimed_by IS NOT NULL
        AND (c.employee_id = current_employee_id() OR c.claimed_by = current_employee_id())
    )
  );
