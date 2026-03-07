-- access_logs テーブルに anon ロールでの INSERT 権限を追加
-- これにより、未ログインユーザーのページビューも middleware から正しく記録されるようになります。

DROP POLICY IF EXISTS "access_logs_insert_anon" ON "public"."access_logs";
CREATE POLICY "access_logs_insert_anon"
  ON "public"."access_logs" FOR INSERT
  TO anon
  WITH CHECK (true);
