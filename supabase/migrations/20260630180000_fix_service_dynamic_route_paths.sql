-- service.route_path に動的セグメント [xxx] が含まれる誤登録を修正
-- Next.js App Router の <Link> は /adm/closure/[closure_id]/timecard 形式を href に使えない

UPDATE public.service
SET route_path = '/adm/closure'
WHERE trim(route_path) ~ '^/adm/closure/\[closure_id\]';
