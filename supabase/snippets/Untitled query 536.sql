-- 1) user_id カラムを追加
alter table employees
  add column if not exists user_id uuid;

-- 2) 外部キーを追加（既存があれば削除してから）
alter table employees
  drop constraint if exists employees_user_id_fkey;

alter table employees
  add constraint employees_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;