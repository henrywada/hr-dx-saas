-- ポータル用「人事ナレッジチャット」(/inquiry-chat) を廃止し、ダッシュボード「人事へのお問合せ」モーダルに統合
-- メニュー用 service 行と tenant_service を削除（管理画面のナレッジ登録サービスは維持）

DELETE FROM public.tenant_service
WHERE service_id = 'c4d5e6f7-a8b9-4001-8002-000000000001'::uuid;

DELETE FROM public.service
WHERE id = 'c4d5e6f7-a8b9-4001-8002-000000000001'::uuid;
