-- DDL 直後に PostgREST のスキーマキャッシュを更新（「schema cache にテーブルが無い」エラー対策）
NOTIFY pgrst, 'reload schema';
