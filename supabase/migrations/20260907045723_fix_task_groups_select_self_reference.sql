-- Task 11 の実施報告・レビューで再現されたRLSバグの修正
--
-- 症状: app_role='employee' の目標責任者が Server Action
-- `supabase.from('task_groups').insert({...}).select('id').single()`
-- （= `INSERT INTO task_groups (...) RETURNING id`）で自分の目標配下に
-- タスクグループを作成しようとすると、INSERT自体は成功するにもかかわらず
-- `new row violates row-level security policy for table "task_groups"` で失敗する。
--
-- 原因: task_groups_select ポリシーは is_task_group_participant(id) 経由で
-- is_task_group_owner(p_task_group_id) を呼ぶが、この関数は task_groups
-- テーブル自身に対して独立した SELECT を発行して行を探す実装になっている。
-- 同一の INSERT ... RETURNING コマンド内では、Postgres のコマンドカウンタ
-- 可視性ルールにより、直前に挿入した行がこの自己参照SELECTからは見えず
-- false になる。app_role <> 'employee' の場合はポリシー後段の条件で
-- 素通りするため再現しないが、主要ペルソナである employee の目標責任者は
-- 必ずこのエラーに遭遇する。
--
-- 実装上の注意（ローカルDBでの検証で判明した追加の落とし穴）:
-- 目標責任者判定を「task_groups 自身への自己参照を避けるため、
-- task_milestones への EXISTS 句を task_groups_select の USING 句に
-- 直接ベタ書きする」形で最初試したところ、ローカルDBで
-- 「infinite recursion detected in policy for relation "task_groups"」で
-- 失敗した。原因は、task_milestones_select ポリシー（Task 1 マイグレーション）
-- が既に task_groups への素の（SECURITY DEFINER関数を介さない）EXISTS参照を
-- 持っており、USING句にベタ書きしたサブクエリは実行者（authenticatedロール）
-- の権限で評価されるため RLS がスキップされず、
-- task_groups_select → task_milestones_select → task_groups_select → …
-- という本物の循環参照になってしまうため。
-- 一方、本スキーマの他の全てのクロステーブル参照（is_task_group_owner,
-- is_task_group_participant, is_task_objective_owner 等）は例外なく
-- SECURITY DEFINER 関数経由になっている。これはテーブル所有者
-- （postgres）と関数所有者（postgres）が一致しており、かつ
-- FORCE ROW LEVEL SECURITY が設定されていないため、SECURITY DEFINER
-- 関数内部のクエリは所有者権限で実行され RLS が適用されない
-- （＝再帰の芽を摘める）という前提に立った設計になっている。
-- そのため、本修正でも同じ確立されたパターンに合わせ、目標責任者判定を
-- 新しい SECURITY DEFINER 関数 is_task_group_owner_by_milestone() に
-- 切り出し、task_milestones のみを参照させる（task_groups へは触れない
-- ため、自己参照の可視性問題も、他ポリシーとの循環参照も発生しない）。
--
-- is_task_group_owner()/is_task_group_participant() 自体は変更しない
-- （task_groups_update/delete、task_group_managers_insert、tasks_insert
-- 等、対象行が既にコミット済みの別コマンドから参照される他のポリシーでは
-- 正しく機能しており、変更する必要はない）。

CREATE OR REPLACE FUNCTION public.is_task_group_owner_by_milestone(p_milestone_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.task_milestones ms
    WHERE ms.id = p_milestone_id
      AND public.is_task_objective_owner(ms.objective_id)
  );
$$;

COMMENT ON FUNCTION public.is_task_group_owner_by_milestone(UUID) IS
  'ログインユーザーが、指定したマイルストーンが属する目標の責任者かどうか。
   task_groups へは一切触れない（milestone_id を直接受け取り task_milestones
   のみを参照する）ため、task_groups_select ポリシーから呼び出しても
   自己参照の可視性問題（INSERT ... RETURNING 時に挿入直後の行が
   同一コマンド内の再スキャンで見えない）も、task_milestones_select との
   循環参照も発生しない。is_task_group_owner(p_task_group_id) との違いは
   task_groups への依存を持たない点のみ。';

DROP POLICY IF EXISTS "task_groups_select" ON public.task_groups;

CREATE POLICY "task_groups_select" ON public.task_groups
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    AND (
      public.is_task_group_participant(id)
      OR public.current_employee_app_role() <> 'employee'
      OR public.is_task_group_owner_by_milestone(milestone_id)
    )
  );

COMMENT ON POLICY "task_groups_select" ON public.task_groups IS
  '目標責任者の判定を is_task_group_owner()（task_groups への自己参照SELECT）
   ではなく is_task_group_owner_by_milestone()（milestone_id から
   task_milestones のみを参照）で行うことで、INSERT ... RETURNING 実行時に
   挿入直後の自分自身の行が task_groups への再スキャンでは可視にならない
   （Postgresのコマンドカウンタ可視性ルール）問題を回避する。
   is_task_group_participant(id) は引き続き OR 条件に残しており、
   マネージャー/メンバーとしての閲覧権限には影響しない。';
