-- 20260817060734_fix_service_menu_labels.sql の追補。
--
-- 前回は対象行を name の明示列挙で指定したため、ローカルに存在せず本番にのみ
-- 存在した行（'　自分の紹介状況（マイ推薦一覧）' / route_path = '/referral/my'）が
-- 修正されずに残った。マスタデータは環境間でドリフトするため、
-- 列挙ではなく条件ベースで一掃する。
--
-- 削除操作（DROP / TRUNCATE / DELETE）は含まない。btrim による前後空白の除去のみ。

-- 機能名：先頭・末尾の空白文字を除去する
UPDATE public.service
SET name = btrim(name, E' \t\r\n')
WHERE name <> btrim(name, E' \t\r\n');

-- メニュー項目名：同上。ただし大分類の区切り行（'▼' を含む装飾行）は
-- 意図的な表記のため対象外とする。
UPDATE public.service_category
SET name = btrim(name, E' \t\r\n')
WHERE name <> btrim(name, E' \t\r\n')
  AND name NOT LIKE '%▼%';
