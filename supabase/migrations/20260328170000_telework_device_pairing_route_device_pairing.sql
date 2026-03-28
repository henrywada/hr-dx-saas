-- テレワーク端末登録をポータル URL /device-pairing へ（(default) レイアウト）

UPDATE public.service
SET route_path = '/device-pairing'
WHERE id = 'b7c8d9e0-f1a2-4b3c-9d8e-7f6e5d4c3b2a';
