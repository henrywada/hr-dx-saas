-- =============================================================================
-- 社内AI情報バンク: RLS / 検索RPC / 版の切替 の検証（ローカル DB 専用）
--
-- 実行: PGPASSWORD=postgres psql -h 127.0.0.1 -p 55422 -U postgres -d postgres \
--         -v ON_ERROR_STOP=1 -f supabase/tests/info_bank_rls.sql
--
-- 全体を 1 トランザクションで実行し、最後に ROLLBACK する（データは残らない）。
-- 期待どおりなら最後に "info_bank_rls: ALL OK" が出力される。
-- 前提: ローカル DB に下記の既存従業員がいること（無ければ UUID を差し替える）。
--   テナント A: 従業員 01c3d09b-… / 人事 2f3f14f8-…
--   テナント B: 従業員 f4101af9-…
-- =============================================================================
\set ON_ERROR_STOP on

BEGIN;

-- ---- シード（postgres = RLS をバイパス） ----
CREATE TEMP TABLE _ids AS
SELECT
  '421f9b0d-5db0-47b3-8d48-203b9213dc00'::uuid AS tenant_a,
  '5ebb9fd2-f152-4578-999f-e3b82d5d27d5'::uuid AS tenant_b,
  '01c3d09b-849d-4591-a8f0-0daf5dd1abad'::uuid AS emp_a,
  '2f3f14f8-0937-4cb9-9dc5-476eaa5fc6dd'::uuid AS hr_a,
  'f4101af9-d662-40a4-bb4f-a4bf9cf49881'::uuid AS emp_b;
GRANT SELECT ON _ids TO authenticated, service_role;

-- A1: テナント A の公開済み資料（版 2。旧版 1 のチャンクがまだ残っている状態を再現）
INSERT INTO public.info_bank_documents
  (id, tenant_id, title, keywords, revision, published_at, storage_path, status)
SELECT 'a1000000-0000-4000-8000-000000000001', tenant_a, '就業規則', ARRAY['育児休業'], 2, now(),
       'a/old.pdf', 'ready'
FROM _ids;
-- A2: テナント A の未公開資料（取り込み中）
INSERT INTO public.info_bank_documents (id, tenant_id, title, revision, pending_revision, status)
SELECT 'a2000000-0000-4000-8000-000000000002', tenant_a, '未公開メモ', 0, 1, 'processing'
FROM _ids;
-- B1: テナント B の公開済み資料
INSERT INTO public.info_bank_documents (id, tenant_id, title, revision, published_at, status)
SELECT 'b1000000-0000-4000-8000-000000000001', tenant_b, 'テナントB規程', 1, now(), 'ready'
FROM _ids;

CREATE TEMP TABLE _vec AS
SELECT ('[1' || repeat(',0', 1535) || ']')::vector(1536) AS v;
GRANT SELECT ON _vec TO authenticated, service_role;

INSERT INTO public.info_bank_chunks (tenant_id, document_id, revision, chunk_index, content, embedding)
SELECT i.tenant_a, 'a1000000-0000-4000-8000-000000000001'::uuid, 1, 0, 'OLD内容 育休は廃止', _vec.v FROM _ids i, _vec
UNION ALL
SELECT i.tenant_a, 'a1000000-0000-4000-8000-000000000001'::uuid, 2, 0, 'NEW内容 育休は書面で申請', _vec.v FROM _ids i, _vec
UNION ALL
SELECT i.tenant_a, 'a2000000-0000-4000-8000-000000000002'::uuid, 1, 0, '未公開 育休メモ', _vec.v FROM _ids i, _vec
UNION ALL
SELECT i.tenant_b, 'b1000000-0000-4000-8000-000000000001'::uuid, 1, 0, 'テナントB 育休は不要', _vec.v FROM _ids i, _vec;

-- ---- 1. テナント A の従業員 ----
SELECT set_config('request.jwt.claims', json_build_object('sub', emp_a, 'role', 'authenticated')::text, true) FROM _ids;
SET LOCAL ROLE authenticated;

DO $$
DECLARE r text;
BEGIN
  ASSERT (SELECT count(*) FROM public.search_info_bank_text(ARRAY['育休'], 10)) = 1,
    '従業員のテキスト検索は公開版の 1 件だけ';
  ASSERT (SELECT content FROM public.search_info_bank_text(ARRAY['育休'], 10)) LIKE 'NEW%',
    '旧版・未公開・他テナントのチャンクが混ざってはいけない';
  ASSERT (SELECT count(*) FROM public.search_info_bank_text(ARRAY['育児休業'], 10)) >= 1,
    'キーワード（別名）に登録した語で資料が見つかる';
  ASSERT (SELECT count(*) FROM public.search_info_bank_text(ARRAY['存在しない語'], 10)) = 0,
    '一致しない語は 0 件';
  ASSERT (SELECT count(*) FROM public.search_info_bank_text(ARRAY['100%_'], 10)) = 0,
    'LIKE のワイルドカード文字はエスケープされる';
  ASSERT (SELECT count(*) FROM public.search_info_bank_text(ARRAY[' 育休 '], 10)) = 1,
    '語の前後の空白は無視される';
  ASSERT (SELECT count(*) FROM public.search_info_bank_text(ARRAY['育休'], NULL)) = 1,
    'p_limit が NULL でも例外にならず上限内で返る';
  ASSERT (SELECT count(*) FROM public.search_info_bank_text(ARRAY['a\b'], 10)) = 0,
    'バックスラッシュを含む語もエスケープされる';
  ASSERT (SELECT count(*) FROM public.search_info_bank_text(
            ARRAY(SELECT 'x' || g FROM generate_series(1, 1000) AS g), 10)) = 0,
    '語が極端に多くても例外にならない（先頭 10 語まで）';
  ASSERT public.count_info_bank_chunks() = 1, '検索対象チャンク数は公開版の 1 件';
  ASSERT (SELECT count(*) FROM public.match_info_bank_chunks((SELECT v FROM _vec), 10)) = 1,
    'ベクトル検索も公開版の 1 件だけ';
  ASSERT (SELECT count(*) FROM public.info_bank_documents) = 1,
    '従業員が見える資料は公開済みの自テナント分だけ';
  ASSERT (SELECT count(*) FROM public.info_bank_chunks) = 1,
    '従業員が直接読めるチャンクは公開版だけ';

  -- 取り込み中の版・エラー詳細・Storage パスは従業員から読めない（列単位の権限）
  BEGIN
    PERFORM pending_storage_path FROM public.info_bank_documents;
    RAISE EXCEPTION '従業員が pending_storage_path を読めてしまった';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    PERFORM error_message FROM public.info_bank_documents;
    RAISE EXCEPTION '従業員が error_message を読めてしまった';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.info_bank_documents (tenant_id, title) SELECT tenant_a, 'x' FROM _ids;
    RAISE EXCEPTION '従業員が資料を INSERT できてしまった';
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN
    NULL;
  END;

  BEGIN
    PERFORM public.publish_info_bank_revision('a1000000-0000-4000-8000-000000000001', 3);
    RAISE EXCEPTION '従業員が publish を実行できてしまった';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

-- ---- 2. テナント A の人事（管理者） ----
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', hr_a, 'role', 'authenticated')::text, true) FROM _ids;
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.info_bank_documents) = 2,
    '管理者は未公開を含む自テナントの資料 2 件を閲覧できる';
  ASSERT (SELECT count(*) FROM public.info_bank_chunks) = 3,
    '管理者は自テナントの全チャンク 3 件を閲覧できる（他テナントは不可）';
END $$;

-- ---- 3. テナント B の従業員 ----
RESET ROLE;
SELECT set_config('request.jwt.claims', json_build_object('sub', emp_b, 'role', 'authenticated')::text, true) FROM _ids;
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.search_info_bank_text(ARRAY['育休'], 10)) = 1
     AND (SELECT content FROM public.search_info_bank_text(ARRAY['育休'], 10)) LIKE 'テナントB%',
    '他テナントの資料が見えてはいけない';
END $$;

-- ---- 3.5 anon（未ログイン）は検索も公開もできない ----
RESET ROLE;
SET LOCAL ROLE anon;

DO $$
BEGIN
  BEGIN
    PERFORM public.publish_info_bank_revision('a1000000-0000-4000-8000-000000000001', 3);
    RAISE EXCEPTION 'anon が publish を実行できてしまった';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    PERFORM * FROM public.search_info_bank_text(ARRAY['育休'], 10);
    RAISE EXCEPTION 'anon が検索 RPC を実行できてしまった';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    PERFORM 1 FROM public.info_bank_chunks;
    RAISE EXCEPTION 'anon がチャンクを読めてしまった';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

RESET ROLE;
DO $$
BEGIN
  ASSERT NOT has_function_privilege('anon', 'public.publish_info_bank_revision(uuid,integer)', 'EXECUTE'),
    'anon に publish の EXECUTE が残っている';
  ASSERT NOT has_function_privilege('authenticated', 'public.publish_info_bank_revision(uuid,integer)', 'EXECUTE'),
    'authenticated に publish の EXECUTE が残っている';
  ASSERT has_function_privilege('service_role', 'public.publish_info_bank_revision(uuid,integer)', 'EXECUTE'),
    'service_role に publish の EXECUTE が無い';
  ASSERT NOT has_table_privilege('authenticated', 'public.info_bank_documents', 'INSERT'),
    'authenticated に documents の INSERT 権限が残っている';
  ASSERT NOT has_table_privilege('authenticated', 'public.info_bank_chunks', 'TRUNCATE'),
    'authenticated に chunks の全消去権限が残っている';
END $$;

-- ---- 4. 版の切替（service_role） ----
RESET ROLE;
SET LOCAL ROLE service_role;

DO $$
DECLARE old_path text;
BEGIN
  -- A1 に版 3 を取り込み中として追加（埋め込み未完了）
  UPDATE public.info_bank_documents
  SET pending_revision = 3, pending_storage_path = 'a/new.pdf', pending_filename = 'new.pdf'
  WHERE id = 'a1000000-0000-4000-8000-000000000001';
  INSERT INTO public.info_bank_chunks (tenant_id, document_id, revision, chunk_index, content)
  SELECT tenant_a, 'a1000000-0000-4000-8000-000000000001', 3, 0, 'V3内容 育休は電子申請' FROM _ids;

  BEGIN
    PERFORM public.publish_info_bank_revision('a1000000-0000-4000-8000-000000000001', 3);
    RAISE EXCEPTION '埋め込み未完了なのに公開できてしまった';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM LIKE '%埋め込みが未完了%', '期待外のエラー: ' || SQLERRM;
  END;
  ASSERT (SELECT revision FROM public.info_bank_documents WHERE id = 'a1000000-0000-4000-8000-000000000001') = 2,
    '公開に失敗したら旧版（2）が現行のまま';

  BEGIN
    PERFORM public.publish_info_bank_revision('a1000000-0000-4000-8000-000000000001', 9);
    RAISE EXCEPTION '取り込み中でない版を公開できてしまった';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM LIKE '%取り込み中の版ではありません%', '期待外のエラー: ' || SQLERRM;
  END;

  UPDATE public.info_bank_chunks SET embedding = (SELECT v FROM _vec)
  WHERE document_id = 'a1000000-0000-4000-8000-000000000001' AND revision = 3;

  old_path := public.publish_info_bank_revision('a1000000-0000-4000-8000-000000000001', 3);
  ASSERT old_path = 'a/old.pdf', '旧ファイルのパスが返る: ' || coalesce(old_path, 'NULL');
  ASSERT (SELECT revision FROM public.info_bank_documents WHERE id = 'a1000000-0000-4000-8000-000000000001') = 3,
    '版 3 が現行になる';
  ASSERT (SELECT storage_path FROM public.info_bank_documents WHERE id = 'a1000000-0000-4000-8000-000000000001') = 'a/new.pdf',
    'ファイル情報が新版に切り替わる';
  ASSERT (SELECT pending_revision FROM public.info_bank_documents WHERE id = 'a1000000-0000-4000-8000-000000000001') IS NULL,
    'pending が解除される';
  ASSERT (SELECT array_agg(revision ORDER BY revision) FROM public.info_bank_chunks
          WHERE document_id = 'a1000000-0000-4000-8000-000000000001') = ARRAY[3],
    '旧版のチャンクが削除される';

  -- 公開中の版以前への切替は拒否する
  UPDATE public.info_bank_documents SET pending_revision = 2
  WHERE id = 'a1000000-0000-4000-8000-000000000001';
  BEGIN
    PERFORM public.publish_info_bank_revision('a1000000-0000-4000-8000-000000000001', 2);
    RAISE EXCEPTION '現行より古い版へ切り替えできてしまった';
  EXCEPTION WHEN raise_exception THEN
    ASSERT SQLERRM LIKE '%以前の版には切り替えられません%', '期待外のエラー: ' || SQLERRM;
  END;

  -- 新規資料（A2）の初回公開: 旧ファイル無し → NULL、published_at が入る
  UPDATE public.info_bank_chunks SET embedding = (SELECT v FROM _vec)
  WHERE document_id = 'a2000000-0000-4000-8000-000000000002';
  UPDATE public.info_bank_documents SET pending_storage_path = 'a/memo.txt'
  WHERE id = 'a2000000-0000-4000-8000-000000000002';
  old_path := public.publish_info_bank_revision('a2000000-0000-4000-8000-000000000002', 1);
  ASSERT old_path IS NULL, '初回公開は旧ファイル無し';
  ASSERT (SELECT published_at IS NOT NULL AND status = 'ready' FROM public.info_bank_documents
          WHERE id = 'a2000000-0000-4000-8000-000000000002'), '初回公開で ready になる';
END $$;

RESET ROLE;
-- ここまでの DO ブロックのアサーションがすべて通ったときだけ到達する
SELECT 'info_bank_rls: ALL OK' AS result;

ROLLBACK;
