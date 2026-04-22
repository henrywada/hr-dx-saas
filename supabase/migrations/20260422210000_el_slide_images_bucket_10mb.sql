-- 既存環境: スライド画像バケットの上限を 5MB → 10MB（新規は 20260422200000 で 10MB 作成）
UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id = 'el-slide-images';

