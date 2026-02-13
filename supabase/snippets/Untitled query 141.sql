-- 既存があれば削除してから作成
alter table employees
  drop constraint if exists employees_user_id_fkey;

alter table employees
  add constraint employees_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;