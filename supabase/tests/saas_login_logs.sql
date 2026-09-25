-- SaaS管理者向けログイン履歴 DB関数のテスト（ローカルDB専用）
-- 実行: PGPASSWORD=postgres psql -h 127.0.0.1 -p 55422 -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/tests/saas_login_logs.sql
-- 全体を BEGIN ... ROLLBACK で囲み、データは残さない。失敗時は例外で停止する。
BEGIN;

-- ===== テストデータ =====
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'tst-dev@example.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'tst-admin@example.test'),
  ('00000000-0000-0000-0000-0000000000a3', 'tst-emp@example.test'),
  ('00000000-0000-0000-0000-0000000000a4', 'tst-supa@example.test'),
  ('00000000-0000-0000-0000-0000000000a5', 'tst-none@example.test');

INSERT INTO public.tenants (id, name) VALUES
  ('00000000-0000-0000-0000-0000000000b1', 'TST-TENANT-A'),
  ('00000000-0000-0000-0000-0000000000b2', 'TST-TENANT-B');

INSERT INTO public.employees (id, tenant_id, user_id, name, app_role_id) VALUES
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'DEV', 'e6c48ce5-dbdb-4b01-b409-adf26a43f3ab'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'ADMIN', '03c94882-88b0-4937-887b-c3733ab21028'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a3', 'EMP', 'f422469d-c1e0-4a10-ac6c-4b656b4fec64');

-- 2テナント x 複数月（JST 2019-11 / 2019-12 / 2020-01）+ 別 action。
-- JST月境界確認: 2019-12-31 15:30 UTC = JST 2020-01-01 00:30（2020-01 扱い）
INSERT INTO public.access_logs (tenant_id, user_id, action, path, created_at) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'LOGIN_SUCCESS', '/x', '2019-11-15 03:00:00+00'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a3', 'LOGIN_SUCCESS', '/x', '2019-11-20 03:00:00+00'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'LOGIN_SUCCESS', '/x', '2019-12-10 03:00:00+00'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a3', 'LOGIN_SUCCESS', '/x', '2019-12-31 15:30:00+00'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', 'LOGIN_SUCCESS', '/x', '2020-01-05 03:00:00+00'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a3', 'OTHER_ACTION',  '/x', '2019-11-16 03:00:00+00');

CREATE TEMP TABLE tst_result (name text, ok boolean, detail text);
GRANT ALL ON tst_result TO authenticated, anon;

-- ロール切替ヘルパー（SET LOCAL ROLE + JWT claims）
CREATE FUNCTION pg_temp.as_user(p_uid text, p_role_meta text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated',
      'user_metadata', CASE WHEN p_role_meta IS NULL THEN '{}'::json ELSE json_build_object('role', p_role_meta) END)::text, true);
  PERFORM set_config('request.jwt.claim.sub', p_uid, true);
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.as_user(text, text) TO authenticated;

-- ===== 一覧: 権限別 =====
DO $$
DECLARE n int;
BEGIN
  -- developer
  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', NULL);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.get_all_tenant_login_logs() WHERE tenant_id IN ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2');
  INSERT INTO tst_result VALUES ('list: developer sees both tenants (5)', n = 5, n::text);
  SELECT count(*) INTO n FROM public.get_all_tenant_login_logs(NULL, '00000000-0000-0000-0000-0000000000b1');
  INSERT INTO tst_result VALUES ('list: tenant filter A (3)', n = 3, n::text);
  SELECT count(*) INTO n FROM public.get_all_tenant_login_logs('2019-12') WHERE tenant_id IN ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2');
  INSERT INTO tst_result VALUES ('list: ym 2019-12 (1 in A only; JST boundary row is 2020-01)', n = 1, n::text);
  SELECT count(*) INTO n FROM public.get_all_tenant_login_logs('2020-01') WHERE tenant_id IN ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2');
  INSERT INTO tst_result VALUES ('list: ym 2020-01 (2, includes JST-boundary row)', n = 2, n::text);
  SELECT count(*) INTO n FROM public.get_all_tenant_login_logs('2019-11', '00000000-0000-0000-0000-0000000000b2');
  INSERT INTO tst_result VALUES ('list: ym+tenant combined (1)', n = 1, n::text);
  SELECT count(*) INTO n FROM public.get_all_tenant_login_logs(NULL, NULL, 2);
  INSERT INTO tst_result VALUES ('list: limit honored (2)', n = 2, n::text);
  SELECT count(*) INTO n FROM public.get_all_tenant_login_logs() WHERE tenant_name = 'TST-TENANT-A' AND employee_name = 'ADMIN';
  INSERT INTO tst_result VALUES ('list: tenant_name/employee_name populated (3)', n = 3, n::text);
  RESET ROLE;

  -- supaUser（JWT メタデータのみ、employees 行なし）
  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a4', 'supaUser');
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.get_all_tenant_login_logs() WHERE tenant_id IN ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2');
  INSERT INTO tst_result VALUES ('list: supaUser sees both tenants (5)', n = 5, n::text);
  RESET ROLE;

  -- 一般管理者（hr）
  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', NULL);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.get_all_tenant_login_logs();
  INSERT INTO tst_result VALUES ('list: tenant admin gets empty', n = 0, n::text);
  RESET ROLE;

  -- 従業員
  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', NULL);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.get_all_tenant_login_logs();
  INSERT INTO tst_result VALUES ('list: employee gets empty', n = 0, n::text);
  RESET ROLE;
END $$;

-- ===== count/delete: 例外ケース =====
DO $$
DECLARE
  v_uid text; v_meta text; v_label text; v_fn text; v_ym text; v_raised boolean;
  cases text[][] := ARRAY[
    -- {uid, meta, label, ym}
    ['00000000-0000-0000-0000-0000000000a2', '', 'tenant admin', '2019-12'],
    ['00000000-0000-0000-0000-0000000000a3', '', 'employee', '2019-12'],
    ['00000000-0000-0000-0000-0000000000a1', '', 'dev: current month', to_char(now() AT TIME ZONE 'Asia/Tokyo','YYYY-MM')],
    ['00000000-0000-0000-0000-0000000000a1', '', 'dev: future month', '2999-01'],
    ['00000000-0000-0000-0000-0000000000a1', '', 'dev: 2026-13', '2026-13'],
    ['00000000-0000-0000-0000-0000000000a1', '', 'dev: abc', 'abc'],
    ['00000000-0000-0000-0000-0000000000a4', 'supaUser', 'supaUser only (valid month)', '2019-12'],
    ['00000000-0000-0000-0000-0000000000a5', '', 'no employee row nor supaUser', '2019-12']
  ];
  i int; fn text; v_msg text; v_perm boolean;
BEGIN
  FOR i IN 1..array_length(cases, 1) LOOP
    FOREACH fn IN ARRAY ARRAY['count_login_logs_before', 'delete_login_logs_before'] LOOP
      PERFORM pg_temp.as_user(cases[i][1], NULLIF(cases[i][2], ''));
      SET LOCAL ROLE authenticated;
      v_raised := false; v_msg := NULL;
      BEGIN
        EXECUTE format('SELECT public.%I(%L)', fn, cases[i][4]);
      EXCEPTION WHEN OTHERS THEN
        v_raised := true; v_msg := SQLERRM;
      END;
      RESET ROLE;
      -- 権限系ケース(先頭4グループ以外の権限拒否)は 'permission denied'、それ以外は形式/月エラーを期待
      v_perm := cases[i][3] IN ('tenant admin','employee','supaUser only (valid month)','no employee row nor supaUser');
      INSERT INTO tst_result VALUES (fn || ' raises: ' || cases[i][3] || ' [' || cases[i][4] || ']',
        v_raised AND ((v_perm AND v_msg = 'permission denied') OR (NOT v_perm AND v_msg <> 'permission denied')), coalesce(v_msg,'no error'));
    END LOOP;
  END LOOP;
END $$;

-- ===== 拒否時に副作用なし / anon / 上限 =====
DO $$
DECLARE n int; p0 int; l0 int; v_raised boolean;
BEGIN
  SELECT count(*) INTO p0 FROM public.access_logs WHERE action='LOGIN_LOGS_PURGED';
  SELECT count(*) INTO l0 FROM public.access_logs WHERE action='LOGIN_SUCCESS';
  -- supaUser のみ・employees無し・一般管理者の delete 後も行数不変（上のループで実行済み）
  SELECT count(*) INTO n FROM public.access_logs WHERE action='LOGIN_LOGS_PURGED' AND user_id::text LIKE '00000000-0000-0000-0000-0000000000a%';
  INSERT INTO tst_result VALUES ('rejected callers left no PURGED row', n = 0, n::text);
  SELECT count(*) INTO n FROM public.access_logs WHERE action='LOGIN_SUCCESS' AND tenant_id IN ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2');
  INSERT INTO tst_result VALUES ('rejected callers deleted nothing (5 seeded LOGIN_SUCCESS)', n = 5, n::text);

  -- 認証なしユーザー(a5)は一覧も空
  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a5', NULL);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.get_all_tenant_login_logs();
  RESET ROLE;
  INSERT INTO tst_result VALUES ('list: no employee/no supaUser gets empty', n = 0, n::text);

  -- 上限: developer で p_limit 巨大値でも 5000 以内、NULL でも 5000 以内
  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', NULL);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.get_all_tenant_login_logs(NULL, NULL, 1000000);
  INSERT INTO tst_result VALUES ('list: p_limit 1000000 capped to <=5000', n <= 5000, n::text);
  SELECT count(*) INTO n FROM public.get_all_tenant_login_logs(NULL, NULL, NULL);
  INSERT INTO tst_result VALUES ('list: p_limit NULL capped to <=5000', n <= 5000, n::text);
  RESET ROLE;

  -- anon は3関数を EXECUTE できない
  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
  SET LOCAL ROLE anon;
  v_raised := false;
  BEGIN PERFORM * FROM public.get_all_tenant_login_logs(); EXCEPTION WHEN insufficient_privilege THEN v_raised := true; END;
  INSERT INTO tst_result VALUES ('anon cannot EXECUTE get_all_tenant_login_logs', v_raised, v_raised::text);
  v_raised := false;
  BEGIN PERFORM public.count_login_logs_before('2020-01'); EXCEPTION WHEN insufficient_privilege THEN v_raised := true; END;
  INSERT INTO tst_result VALUES ('anon cannot EXECUTE count_login_logs_before', v_raised, v_raised::text);
  v_raised := false;
  BEGIN PERFORM public.delete_login_logs_before('2020-01'); EXCEPTION WHEN insufficient_privilege THEN v_raised := true; END;
  INSERT INTO tst_result VALUES ('anon cannot EXECUTE delete_login_logs_before', v_raised, v_raised::text);
  RESET ROLE;
END $$;

-- ===== 正常系: count と delete の一致・残存確認（developer） =====
DO $$
DECLARE
  v_expected bigint; v_cnt bigint; v_del bigint; n int;
  v_before_purged int; v_details json;
BEGIN
  -- 期待値: 2020-01 より前の LOGIN_SUCCESS 全件（既存データ含む）を postgres 権限で数える
  SELECT count(*) INTO v_expected FROM public.access_logs
   WHERE action = 'LOGIN_SUCCESS' AND created_at < '2020-01-01 00:00:00+09';
  SELECT count(*) INTO v_before_purged FROM public.access_logs WHERE action = 'LOGIN_LOGS_PURGED';

  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', NULL);
  SET LOCAL ROLE authenticated;
  v_cnt := public.count_login_logs_before('2020-01');
  RESET ROLE;
  INSERT INTO tst_result VALUES ('count matches direct count', v_cnt = v_expected, v_cnt || ' vs ' || v_expected);
  INSERT INTO tst_result VALUES ('count includes seeded 3 rows (>=3)', v_cnt >= 3, v_cnt::text);

  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', NULL);
  SET LOCAL ROLE authenticated;
  v_del := public.delete_login_logs_before('2020-01');
  RESET ROLE;
  INSERT INTO tst_result VALUES ('delete count equals count preview', v_del = v_cnt, v_del || ' vs ' || v_cnt);

  SELECT count(*) INTO n FROM public.access_logs WHERE action = 'LOGIN_SUCCESS' AND created_at < '2020-01-01 00:00:00+09';
  INSERT INTO tst_result VALUES ('no LOGIN_SUCCESS remains before cutoff', n = 0, n::text);
  SELECT count(*) INTO n FROM public.access_logs
   WHERE tenant_id IN ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2') AND action = 'LOGIN_SUCCESS';
  INSERT INTO tst_result VALUES ('specified month and later kept (2 seeded rows in 2020-01)', n = 2, n::text);
  SELECT count(*) INTO n FROM public.access_logs WHERE action = 'OTHER_ACTION' AND path = '/x';
  INSERT INTO tst_result VALUES ('other action rows kept (1)', n = 1, n::text);
  SELECT count(*) INTO n FROM public.access_logs WHERE action = 'LOGIN_LOGS_PURGED';
  INSERT INTO tst_result VALUES ('LOGIN_LOGS_PURGED +1', n = v_before_purged + 1, n || ' vs ' || v_before_purged);
  SELECT details INTO v_details FROM public.access_logs
   WHERE action = 'LOGIN_LOGS_PURGED' AND user_id = '00000000-0000-0000-0000-0000000000a1';
  INSERT INTO tst_result VALUES ('PURGED row details/user/tenant/path/method',
    (v_details->>'before_year_month') = '2020-01' AND (v_details->>'deleted_count')::bigint = v_del
    AND EXISTS (SELECT 1 FROM public.access_logs WHERE action='LOGIN_LOGS_PURGED' AND tenant_id IS NULL
                AND path='/saas_adm/login-logs' AND method='POST' AND user_id='00000000-0000-0000-0000-0000000000a1'),
    v_details::text);

  -- developer 再実行: 残り0件
  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', NULL);
  SET LOCAL ROLE authenticated;
  v_del := public.delete_login_logs_before('2020-01');
  RESET ROLE;
  INSERT INTO tst_result VALUES ('developer re-delete returns 0', v_del = 0, v_del::text);
END $$;

-- ===== テナント選択肢 =====
DO $$
DECLARE n int; v_raised boolean; v_first text; v_sorted text;
BEGIN
  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a1', NULL);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.get_login_log_tenant_options() WHERE id IN ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2');
  INSERT INTO tst_result VALUES ('options: developer sees both test tenants (2)', n = 2, n::text);
  SELECT count(*) INTO n FROM public.get_login_log_tenant_options() WHERE name = 'TST-TENANT-A';
  INSERT INTO tst_result VALUES ('options: name populated', n = 1, n::text);
  RESET ROLE;

  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a4', 'supaUser');
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.get_login_log_tenant_options() WHERE id IN ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2');
  INSERT INTO tst_result VALUES ('options: supaUser sees both test tenants (2)', n = 2, n::text);
  RESET ROLE;

  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a2', NULL);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.get_login_log_tenant_options();
  INSERT INTO tst_result VALUES ('options: tenant admin gets empty', n = 0, n::text);
  RESET ROLE;

  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a3', NULL);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.get_login_log_tenant_options();
  INSERT INTO tst_result VALUES ('options: employee gets empty', n = 0, n::text);
  RESET ROLE;

  PERFORM pg_temp.as_user('00000000-0000-0000-0000-0000000000a5', NULL);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO n FROM public.get_login_log_tenant_options();
  INSERT INTO tst_result VALUES ('options: user without employee row gets empty (fail-closed)', n = 0, n::text);
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', '', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);
  SET LOCAL ROLE anon;
  v_raised := false;
  BEGIN PERFORM * FROM public.get_login_log_tenant_options(); EXCEPTION WHEN insufficient_privilege THEN v_raised := true; END;
  INSERT INTO tst_result VALUES ('anon cannot EXECUTE get_login_log_tenant_options', v_raised, v_raised::text);
  RESET ROLE;
END $$;

SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS result, name, detail FROM tst_result ORDER BY ok, name;
SELECT CASE WHEN count(*) FILTER (WHERE NOT ok) = 0 THEN 'ALL PASS' ELSE 'SOME FAILED' END AS summary,
       count(*) AS total, count(*) FILTER (WHERE NOT ok) AS failed FROM tst_result;

ROLLBACK;
