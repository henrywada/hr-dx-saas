-- supa_employees_all ポリシーを削除する
-- このポリシーは wada007@gmail.com (SaaS管理者) に全テナントの employees を
-- 見せるためのものだったが、/saas_adm は createAdminClient()（RLSバイパス）で
-- 動作するため不要。残しておくと /adm/employees でも全テナントが見えてしまう。
DROP POLICY IF EXISTS "supa_employees_all" ON "public"."employees";
