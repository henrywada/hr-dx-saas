-- データベースのデフォルトタイムゾーンを Asia/Tokyo（日本標準時間）に設定
-- 新規接続時にこのタイムゾーンが適用される
-- 既存の timestamp with time zone データは UTC で保存されたまま（正しい）
-- 表示・now() 等は JST で解釈される

ALTER DATABASE postgres SET timezone TO 'Asia/Tokyo';
