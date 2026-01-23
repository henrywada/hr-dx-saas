-- 1. RLSの有効化
alter table service enable row level security;
alter table service_category enable row level security;

-- 2. 全公開ポリシーの作成（serviceテーブルの例）
drop policy if exists "Global read access for service" on service;

create policy "Global read access for service" on service
for select -- 読み取り(SELECT)のみ許可
to authenticated -- ログイン済みユーザーなら誰でも
using (true); -- 無条件で許可

-- 書き込みは禁止（API経由での変更を防ぐためポリシーを作らない）
-- ※スーパーユーザーだけ書き込み許可したい場合は、FOR ALLにしてスーパーユーザー判定を入れます