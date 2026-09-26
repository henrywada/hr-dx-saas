-- access_logs.created_at の既定値修正
--
-- 旧既定値 timezone('utc', now()) は「UTC の壁時計時刻（タイムゾーン無し）」を返す。
-- DB の timezone が Asia/Tokyo（20260317000000_set_timezone_asia_tokyo.sql）のため、
-- timestamptz へ暗黙キャストされる際に JST として解釈され、実際より9時間過去で保存されていた。
-- now()（timestamptz）に直し、以降の記録を正しい時刻にする。
-- 既存行の補正は本マイグレーションでは行わない（別途承認のうえ実施）。
ALTER TABLE public.access_logs
  ALTER COLUMN created_at SET DEFAULT now();
