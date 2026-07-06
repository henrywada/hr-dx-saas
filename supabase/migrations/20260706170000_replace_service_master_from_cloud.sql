-- ローカル service 系マスタを全削除し、クラウド本番データで置き換える。
-- tenant_service / app_role_service も空にする（UI から再設定）。
-- employees / tenants には触れない。

-- === 削除（FK 順） ===
DELETE FROM public.tenant_service;
DELETE FROM public.app_role_service;
DELETE FROM public.service;
DELETE FROM public.service_class_index;
DELETE FROM public.service_category;
DELETE FROM public.service_class;

-- service_class: 23 rows from cloud
INSERT INTO public.service_class (id, sort_order, name)
VALUES
  ('79e26f17-f53c-42de-8c42-1fbd27e6a1fd'::uuid, 0, '概要'),
  ('4b5f8add-075a-4383-941c-7dacb8ec5b69'::uuid, 10, 'mYouシステム'),
  ('fe5d371d-80f2-41eb-be62-83b40081128a'::uuid, 1000, '------------------'),
  ('70888a18-b539-444e-a0ea-8c576a0a8841'::uuid, 1200, '人材管理'),
  ('686ec9f8-e478-473a-ad80-86816f685624'::uuid, 1300, 'ウエルビーイング'),
  ('8a25f25f-c995-4b78-abfe-07380a45a972'::uuid, 1400, '評価・成長'),
  ('c97d9317-87cf-4cae-ae2d-b66d5671369d'::uuid, 1500, 'コミュニケーション'),
  ('0ebc400f-d745-4d18-b74a-ee08f8630f0b'::uuid, 1600, '戦略人事：サーベイ・AI分析'),
  ('e5b9bff2-a193-4319-b57c-08fd80ace680'::uuid, 1700, '報酬・制度'),
  ('f0b10eba-1a85-4d27-94ed-9f634d1d4db0'::uuid, 1800, '便利ツール'),
  ('a006d3cc-ab4a-4009-8a2c-86b52926df87'::uuid, 1900, '基本設定'),
  ('d9e32d6d-9b47-4dd4-bc85-45f62189f59d'::uuid, 20, '人材管理'),
  ('60ed486b-246c-46d3-a9df-cf71a9c82999'::uuid, 2000, 'システム設定'),
  ('3c190204-9bfe-4ff2-8e2f-d6239535663e'::uuid, 30, 'ウエルビーイング'),
  ('8868d8ab-2c4c-4c71-b9cc-99f81fd36f97'::uuid, 40, '学習・評価・成長・キャリア'),
  ('0a9866a9-6007-48f5-b57c-cf9b46a2a454'::uuid, 50, 'コミュニケーション'),
  ('556e3359-9336-4a75-bb4b-531d20dc5bc6'::uuid, 60, 'サーベイ・分析'),
  ('9b15357f-14fc-421a-9060-24888a64d19d'::uuid, 70, '報酬・制度'),
  ('1b5ca12c-f32d-45fc-bd69-3449eb25869e'::uuid, 7000, '	--------------------'),
  ('8add9dee-cf02-433e-8156-f208674435ae'::uuid, 7100, '産業医');

INSERT INTO public.service_class (id, sort_order, name)
VALUES
  ('b30d2683-afb7-4918-bbb2-cdcc549a6b0e'::uuid, 80, '便利ツール'),
  ('31a7a47d-6a2b-4557-bd39-039333f7e727'::uuid, 9000, '-------------------'),
  ('33be6414-abe3-4c55-8e2e-2ed301576632'::uuid, 9100, 'SaaS管理メニュー');

-- service_category: 57 rows from cloud
INSERT INTO public.service_category (id, sort_order, name, description, release_status)
VALUES
  ('d500c1cf-95d8-4aa3-9fed-4b04d1c81064'::uuid, 0, '業務ポータル', NULL, NULL),
  ('fbbd4d45-6610-44ef-9989-3f3183ce3158'::uuid, 10, 'mYou：業務処理', NULL, NULL),
  ('194390c5-dafd-482b-b979-60f165b7ae28'::uuid, 10000, 'SaaS：基本設定', NULL, 'released'),
  ('beaf010f-4e1c-46aa-9cc0-101f933c9dd8'::uuid, 10000, '産業医メニュー', NULL, NULL),
  ('e240781b-db31-4ffb-b789-3b8abd97bc45'::uuid, 1100, 'AI・分析', NULL, NULL),
  ('3bcaea26-19a5-473f-998d-34ca4b113908'::uuid, 11000, 'SaaS：Sysテンプレート', NULL, NULL),
  ('cf57ab59-c534-4d9b-b9bd-df05de1b3123'::uuid, 12, 'mYou：基本登録', NULL, NULL),
  ('6f555967-a96d-407a-9446-ad4f3bec8305'::uuid, 1200, '勤退管理', NULL, NULL),
  ('0df0d92e-e03f-427c-8731-676d43df7130'::uuid, 1250, '勤怠：申請・設定', NULL, NULL),
  ('19e62597-28de-4380-9507-eb5e56bb75ba'::uuid, 1255, '勤務：分析', NULL, NULL),
  ('d8ad93d1-9754-4f36-8da0-4937343da780'::uuid, 2000, '	| ===▼管理▼==== |', NULL, NULL),
  ('2f310cc9-454d-4032-8e01-25a493a0a203'::uuid, 2000, '人材市場分析', NULL, 'released'),
  ('b19f12e5-2d1b-4d8a-b526-bda180fd755e'::uuid, 210, '勤怠 | 打刻', NULL, NULL),
  ('6a92a6a9-357a-46ef-81a5-a26bc2f21b64'::uuid, 2100, '採用管理', NULL, NULL),
  ('6c0cfcfc-0b9d-4a74-8bef-ceec5f616a96'::uuid, 220, '勤怠 | 申請', NULL, NULL),
  ('c9a0db38-88a8-4537-9199-596fd0fb4bf4'::uuid, 2200, 'リファラル採用', NULL, NULL),
  ('fd387834-9c6c-4f0f-ad2a-99cea7509558'::uuid, 2300, '面接フォローアップ', NULL, NULL),
  ('46e319c6-303e-482c-9134-e12363f8dc4c'::uuid, 240, 'リファラル採用', NULL, NULL),
  ('048a8fec-d4b2-42b5-adbb-1f19791130e7'::uuid, 2400, 'オンボーディング', NULL, NULL),
  ('a3b14282-98a6-4d16-9dd7-e8fefe5b2036'::uuid, 2500, 'キャリア面談', NULL, NULL);

INSERT INTO public.service_category (id, sort_order, name, description, release_status)
VALUES
  ('77fd9bae-b21f-4898-8bfb-34bce47f5648'::uuid, 260, '採用管理', NULL, NULL),
  ('7e492f11-ab5a-4025-beb7-246384559b15'::uuid, 2600, '人事評価', NULL, NULL),
  ('e3e96329-6fbd-4cf2-b86a-13f421a27b59'::uuid, 270, 'オンボーディング', NULL, NULL),
  ('ead35c96-0a68-48f9-9687-f9156e92fc2d'::uuid, 280, '人事評価', NULL, NULL),
  ('ef09ab5e-15f6-475b-88ee-e7766992c34e'::uuid, 300, 'パルス＆サーベイ', NULL, NULL),
  ('1dc338ff-19d7-407e-94e4-06e60b1339a0'::uuid, 3000, 'パルス＆サーベ', NULL, 'released'),
  ('f306b876-6889-44f3-8d84-a69922cb3d75'::uuid, 310, 'ストレスチェック', NULL, NULL),
  ('2c64738f-bee1-458d-afae-67033faeceb0'::uuid, 3100, 'ストレスチェック', NULL, NULL),
  ('a5f813af-6986-4c37-b2b2-9f8d48d3eb37'::uuid, 3200, '感謝・称賛', NULL, NULL),
  ('4fac9b2d-0398-4418-be33-c02233b0b2db'::uuid, 330, '悩み・相談窓口', NULL, NULL),
  ('4c1db2f1-f36a-4e00-b385-4c1943855bf2'::uuid, 340, '社内ベント・表彰', NULL, NULL),
  ('b5818d06-b98d-4ed1-bb94-f3a100b75ec6'::uuid, 400, 'eラーニング', NULL, NULL),
  ('ea168748-853e-4340-b240-7ebfdbf85647'::uuid, 4000, 'eラーニング', NULL, NULL),
  ('1dce7089-3f4e-4a79-8827-5f0f080b5082'::uuid, 410, 'パフォーマンス評価', NULL, NULL),
  ('1e0db0aa-1837-43f2-a558-fb09651173a8'::uuid, 4100, 'パフォーマンス評価', NULL, NULL),
  ('d39b5632-13c0-456a-bd20-b17b949de044'::uuid, 420, '1on1/フォローアップ', NULL, NULL),
  ('c5ac3118-a0f6-4a03-abaf-f0f27b62894e'::uuid, 4200, '1on1/フォローアップ', NULL, NULL),
  ('01d98789-a791-4dc6-8445-3c04eb4ac8b8'::uuid, 430, 'スキル・能力向上', NULL, NULL),
  ('621eeeeb-a62f-4b83-8c8e-5f650d7b96c2'::uuid, 4300, 'スキル・能力向上', NULL, NULL),
  ('f110cfb9-f82d-4aa1-8124-d7ab73144220'::uuid, 4300, '社内ベント・表彰', NULL, NULL);

INSERT INTO public.service_category (id, sort_order, name, description, release_status)
VALUES
  ('042f5642-072d-4af3-a070-c93f2c73622b'::uuid, 450, 'キャリア面談', NULL, NULL),
  ('e96353b7-a7a5-41d3-998f-b20ef2306e06'::uuid, 500, 'コミュニケーション', NULL, NULL),
  ('d077cb90-f8b4-40f0-8e9e-d163b1245301'::uuid, 5100, '悩み・相談窓口', NULL, NULL),
  ('bc85247e-d511-4534-9693-11c9f4f4df49'::uuid, 5110, 'パルスサーベイ', NULL, NULL),
  ('e18af98d-ac24-4ece-b2f7-689f406c3331'::uuid, 5200, 'アンケート', NULL, NULL),
  ('7e6ca00c-4268-40a3-b047-c7ccfd9582ba'::uuid, 530, '社内お知らせ', NULL, NULL),
  ('1775ced6-b43c-4561-a003-0fee026862ac'::uuid, 5300, '社内お知らせ', NULL, NULL),
  ('ca1e0c36-0f8c-49ae-bc41-86aaeed3d2d0'::uuid, 540, 'チームコネクト', NULL, NULL),
  ('a1b2c3d4-0010-4000-8000-000000000001'::uuid, 5400, 'チームコネクト', NULL, '公開'),
  ('c48f741e-66dd-48eb-8335-56eabc2eba6b'::uuid, 610, 'アンケート', NULL, NULL),
  ('e00b859d-8d0a-4b54-ad55-cf06b4c29482'::uuid, 7100, '報酬管理', NULL, NULL),
  ('13466017-d442-41d0-970b-183fbc2b26f8'::uuid, 810, 'ツールボックス', NULL, NULL),
  ('78c72c52-ccff-4989-9e65-a043cd66ecfd'::uuid, 8100, 'ツールボックス', NULL, NULL),
  ('f49d0767-aae0-4e1f-bf62-e8fba7177f3e'::uuid, 9000, '----------', NULL, NULL),
  ('1baa63db-34a4-4d8c-b54d-664a26e110ba'::uuid, 9100, '会社設定', NULL, NULL),
  ('23e3ad3e-cc0f-4b21-91a1-0b4a91812f82'::uuid, 9150, '従業員・組織登録', NULL, NULL),
  ('35c69c7f-6580-4250-a125-d15c28ead6b2'::uuid, 9200, '	基本設定', NULL, 'released');

-- service_class_index: 58 rows from cloud
INSERT INTO public.service_class_index (id, service_class_id, service_category_id)
VALUES
  ('05d1cc62-c6ad-4080-a32c-86fa36c3de1c'::uuid, '8868d8ab-2c4c-4c71-b9cc-99f81fd36f97'::uuid, 'd39b5632-13c0-456a-bd20-b17b949de044'::uuid),
  ('08e8e86a-5919-4b27-952d-044f3b854b96'::uuid, '60ed486b-246c-46d3-a9df-cf71a9c82999'::uuid, '35c69c7f-6580-4250-a125-d15c28ead6b2'::uuid),
  ('0b09b26c-8f89-4a0d-b6de-8223dd02f7bd'::uuid, '70888a18-b539-444e-a0ea-8c576a0a8841'::uuid, '19e62597-28de-4380-9507-eb5e56bb75ba'::uuid),
  ('0df6a450-91a9-4ba2-84d9-6d2a4cbd5744'::uuid, '686ec9f8-e478-473a-ad80-86816f685624'::uuid, '2c64738f-bee1-458d-afae-67033faeceb0'::uuid),
  ('10701bf3-beeb-4510-9a3d-24b4c6ffaff4'::uuid, '70888a18-b539-444e-a0ea-8c576a0a8841'::uuid, 'fd387834-9c6c-4f0f-ad2a-99cea7509558'::uuid),
  ('13e46f06-0d0c-4fc1-a3a9-3b26aec9a406'::uuid, '8868d8ab-2c4c-4c71-b9cc-99f81fd36f97'::uuid, 'b5818d06-b98d-4ed1-bb94-f3a100b75ec6'::uuid),
  ('177fd85c-9f8b-47a2-b45e-b4779c0594ae'::uuid, '3c190204-9bfe-4ff2-8e2f-d6239535663e'::uuid, '4fac9b2d-0398-4418-be33-c02233b0b2db'::uuid),
  ('1aae4440-4be0-4d29-a81e-aa0109c8ff3d'::uuid, 'f0b10eba-1a85-4d27-94ed-9f634d1d4db0'::uuid, '78c72c52-ccff-4989-9e65-a043cd66ecfd'::uuid),
  ('1f866173-70e5-429b-aa09-ed99043e42a6'::uuid, '70888a18-b539-444e-a0ea-8c576a0a8841'::uuid, '0df0d92e-e03f-427c-8731-676d43df7130'::uuid),
  ('302add2a-c4b0-47e9-a8ac-98a74a23cd63'::uuid, 'c97d9317-87cf-4cae-ae2d-b66d5671369d'::uuid, 'bc85247e-d511-4534-9693-11c9f4f4df49'::uuid),
  ('371f474c-3fbf-4bb7-ba0a-ff49805f20a6'::uuid, '70888a18-b539-444e-a0ea-8c576a0a8841'::uuid, '7e492f11-ab5a-4025-beb7-246384559b15'::uuid),
  ('380e0895-1d3c-4970-9192-0c93893e9756'::uuid, 'b30d2683-afb7-4918-bbb2-cdcc549a6b0e'::uuid, '13466017-d442-41d0-970b-183fbc2b26f8'::uuid),
  ('39650d78-abe2-40a2-b209-c143bb255d49'::uuid, 'c97d9317-87cf-4cae-ae2d-b66d5671369d'::uuid, 'e18af98d-ac24-4ece-b2f7-689f406c3331'::uuid),
  ('3c8abcb0-f571-4f9d-a234-7692bb7a2faa'::uuid, 'c97d9317-87cf-4cae-ae2d-b66d5671369d'::uuid, 'd077cb90-f8b4-40f0-8e9e-d163b1245301'::uuid),
  ('3e4aef8f-f885-4de1-aa16-e2ea4d66aad5'::uuid, '556e3359-9336-4a75-bb4b-531d20dc5bc6'::uuid, 'c48f741e-66dd-48eb-8335-56eabc2eba6b'::uuid),
  ('564380ea-7fe9-471b-a5f1-9b7ee5a9d853'::uuid, '3c190204-9bfe-4ff2-8e2f-d6239535663e'::uuid, '4c1db2f1-f36a-4e00-b385-4c1943855bf2'::uuid),
  ('5a7e9e35-238a-453f-8275-ccd205302d04'::uuid, '8add9dee-cf02-433e-8156-f208674435ae'::uuid, 'beaf010f-4e1c-46aa-9cc0-101f933c9dd8'::uuid),
  ('5c05cdf9-78e8-42f1-b3f5-24e8c18703e9'::uuid, '8a25f25f-c995-4b78-abfe-07380a45a972'::uuid, '1e0db0aa-1837-43f2-a558-fb09651173a8'::uuid),
  ('5e135c2d-fabb-4b5f-91dc-d530ae1be95c'::uuid, '0a9866a9-6007-48f5-b57c-cf9b46a2a454'::uuid, '7e6ca00c-4268-40a3-b047-c7ccfd9582ba'::uuid),
  ('6335b482-996f-40c0-816e-96f9780124cc'::uuid, '8868d8ab-2c4c-4c71-b9cc-99f81fd36f97'::uuid, '01d98789-a791-4dc6-8445-3c04eb4ac8b8'::uuid);

INSERT INTO public.service_class_index (id, service_class_id, service_category_id)
VALUES
  ('64a0fcc9-bd47-4f40-94d5-27fd8a0d3059'::uuid, '70888a18-b539-444e-a0ea-8c576a0a8841'::uuid, 'c9a0db38-88a8-4537-9199-596fd0fb4bf4'::uuid),
  ('672f7155-2a17-46aa-acda-7451ba155625'::uuid, '3c190204-9bfe-4ff2-8e2f-d6239535663e'::uuid, 'f306b876-6889-44f3-8d84-a69922cb3d75'::uuid),
  ('684cf0ae-0323-49f9-91e5-3f00cfcba180'::uuid, '79e26f17-f53c-42de-8c42-1fbd27e6a1fd'::uuid, 'd500c1cf-95d8-4aa3-9fed-4b04d1c81064'::uuid),
  ('6ee18d72-c63a-436e-8b06-b9b004106978'::uuid, '686ec9f8-e478-473a-ad80-86816f685624'::uuid, 'a5f813af-6986-4c37-b2b2-9f8d48d3eb37'::uuid),
  ('703f0d04-7784-4c52-b95e-bf15119a8910'::uuid, '0ebc400f-d745-4d18-b74a-ee08f8630f0b'::uuid, 'e240781b-db31-4ffb-b789-3b8abd97bc45'::uuid),
  ('7a11f114-589e-4f7f-ad26-d83f7ac64395'::uuid, '70888a18-b539-444e-a0ea-8c576a0a8841'::uuid, '6a92a6a9-357a-46ef-81a5-a26bc2f21b64'::uuid),
  ('7c8b46b2-43e3-41d2-97d1-f603aad58a06'::uuid, '4b5f8add-075a-4383-941c-7dacb8ec5b69'::uuid, 'cf57ab59-c534-4d9b-b9bd-df05de1b3123'::uuid),
  ('837761c9-c6e2-4234-9907-1c2f3f29b1ce'::uuid, '4b5f8add-075a-4383-941c-7dacb8ec5b69'::uuid, 'fbbd4d45-6610-44ef-9989-3f3183ce3158'::uuid),
  ('8436246c-94bd-45f8-a9a3-65017d6128c5'::uuid, 'c97d9317-87cf-4cae-ae2d-b66d5671369d'::uuid, 'a1b2c3d4-0010-4000-8000-000000000001'::uuid),
  ('8a40fca8-6c23-41d8-b3da-95b6b2858caa'::uuid, '686ec9f8-e478-473a-ad80-86816f685624'::uuid, '1dc338ff-19d7-407e-94e4-06e60b1339a0'::uuid),
  ('8b596a53-3273-4b19-ac31-21b41af95aa9'::uuid, 'c97d9317-87cf-4cae-ae2d-b66d5671369d'::uuid, '1775ced6-b43c-4561-a003-0fee026862ac'::uuid),
  ('91cbf7ce-1dce-4e9f-992f-abbf323a8a8d'::uuid, '31a7a47d-6a2b-4557-bd39-039333f7e727'::uuid, 'f49d0767-aae0-4e1f-bf62-e8fba7177f3e'::uuid),
  ('9331cfb3-9ab1-4fe1-a491-1cc5d951d0e9'::uuid, 'd9e32d6d-9b47-4dd4-bc85-45f62189f59d'::uuid, '46e319c6-303e-482c-9134-e12363f8dc4c'::uuid),
  ('978d8ea3-ba2e-46ca-8191-95007c5d7a64'::uuid, '556e3359-9336-4a75-bb4b-531d20dc5bc6'::uuid, 'e240781b-db31-4ffb-b789-3b8abd97bc45'::uuid),
  ('9935d855-aee4-4de2-a76d-c230e957fdf5'::uuid, '0a9866a9-6007-48f5-b57c-cf9b46a2a454'::uuid, 'e96353b7-a7a5-41d3-998f-b20ef2306e06'::uuid),
  ('9af0ea46-300b-42ca-a15b-485f6ce4f4c0'::uuid, 'd9e32d6d-9b47-4dd4-bc85-45f62189f59d'::uuid, '6c0cfcfc-0b9d-4a74-8bef-ceec5f616a96'::uuid),
  ('9b2f6b56-db3a-4835-8a65-f66d27fa4fec'::uuid, 'd9e32d6d-9b47-4dd4-bc85-45f62189f59d'::uuid, 'e3e96329-6fbd-4cf2-b86a-13f421a27b59'::uuid),
  ('9ca2189d-cbd9-4534-a384-99404a50eed5'::uuid, 'e5b9bff2-a193-4319-b57c-08fd80ace680'::uuid, '621eeeeb-a62f-4b83-8c8e-5f650d7b96c2'::uuid),
  ('aa754280-5187-4934-87c4-c26ec5385716'::uuid, '33be6414-abe3-4c55-8e2e-2ed301576632'::uuid, '3bcaea26-19a5-473f-998d-34ca4b113908'::uuid),
  ('abdc0329-1abe-4921-8e76-3e531d37abe6'::uuid, '3c190204-9bfe-4ff2-8e2f-d6239535663e'::uuid, 'ef09ab5e-15f6-475b-88ee-e7766992c34e'::uuid);

INSERT INTO public.service_class_index (id, service_class_id, service_category_id)
VALUES
  ('afe0d1ae-2991-4c7b-9473-58a3566c3cf2'::uuid, '8a25f25f-c995-4b78-abfe-07380a45a972'::uuid, 'ea168748-853e-4340-b240-7ebfdbf85647'::uuid),
  ('b1629715-bed2-4789-a9e3-878543226d52'::uuid, '8a25f25f-c995-4b78-abfe-07380a45a972'::uuid, 'c5ac3118-a0f6-4a03-abaf-f0f27b62894e'::uuid),
  ('ba5cbc70-5eb1-4fa9-aa08-0bbf7a102164'::uuid, '60ed486b-246c-46d3-a9df-cf71a9c82999'::uuid, '1baa63db-34a4-4d8c-b54d-664a26e110ba'::uuid),
  ('bad11518-668d-454a-9af2-d22c85b78036'::uuid, '70888a18-b539-444e-a0ea-8c576a0a8841'::uuid, '048a8fec-d4b2-42b5-adbb-1f19791130e7'::uuid),
  ('ceffebc3-9c34-4651-92ad-041a935a2a1b'::uuid, '0a9866a9-6007-48f5-b57c-cf9b46a2a454'::uuid, 'ca1e0c36-0f8c-49ae-bc41-86aaeed3d2d0'::uuid),
  ('d0127959-86ce-42dd-becf-210b5c72c775'::uuid, '70888a18-b539-444e-a0ea-8c576a0a8841'::uuid, '2f310cc9-454d-4032-8e01-25a493a0a203'::uuid),
  ('d16121c7-4a0a-4a63-a7c2-c44d31a8b553'::uuid, 'fe5d371d-80f2-41eb-be62-83b40081128a'::uuid, 'd8ad93d1-9754-4f36-8da0-4937343da780'::uuid),
  ('d203d4fb-af5f-45e0-9b86-6b992ab55d2d'::uuid, 'd9e32d6d-9b47-4dd4-bc85-45f62189f59d'::uuid, 'ead35c96-0a68-48f9-9687-f9156e92fc2d'::uuid),
  ('daccdb89-4230-4b08-bfae-d1ca3cec007e'::uuid, '686ec9f8-e478-473a-ad80-86816f685624'::uuid, 'f110cfb9-f82d-4aa1-8124-d7ab73144220'::uuid),
  ('dc72e198-68c3-4a5b-8b0f-77b91ddde1f4'::uuid, '70888a18-b539-444e-a0ea-8c576a0a8841'::uuid, 'a3b14282-98a6-4d16-9dd7-e8fefe5b2036'::uuid),
  ('e1700d07-246d-497f-bae6-6a10d01814ce'::uuid, '33be6414-abe3-4c55-8e2e-2ed301576632'::uuid, '194390c5-dafd-482b-b979-60f165b7ae28'::uuid),
  ('e352f59b-da62-4054-b9de-b03674e594c7'::uuid, 'd9e32d6d-9b47-4dd4-bc85-45f62189f59d'::uuid, 'b19f12e5-2d1b-4d8a-b526-bda180fd755e'::uuid),
  ('ed401731-bdf6-45f1-855d-dfe09a06725b'::uuid, '8868d8ab-2c4c-4c71-b9cc-99f81fd36f97'::uuid, '042f5642-072d-4af3-a070-c93f2c73622b'::uuid),
  ('f273c1d9-dc81-4bf9-8bef-12f50c29786e'::uuid, 'd9e32d6d-9b47-4dd4-bc85-45f62189f59d'::uuid, '77fd9bae-b21f-4898-8bfb-34bce47f5648'::uuid),
  ('f3c161c7-a28b-4d3d-a017-b8b9f1713f18'::uuid, '70888a18-b539-444e-a0ea-8c576a0a8841'::uuid, '6f555967-a96d-407a-9446-ad4f3bec8305'::uuid),
  ('f90e250f-92fc-4278-9c05-a34c91558916'::uuid, '60ed486b-246c-46d3-a9df-cf71a9c82999'::uuid, '23e3ad3e-cc0f-4b21-91a1-0b4a91812f82'::uuid),
  ('fbd12791-1855-42f0-ba3f-ff4aba076a7a'::uuid, '8868d8ab-2c4c-4c71-b9cc-99f81fd36f97'::uuid, '1dce7089-3f4e-4a79-8827-5f0f080b5082'::uuid),
  ('ff136107-bae7-4600-a6ba-bfa7e9897b04'::uuid, 'e5b9bff2-a193-4319-b57c-08fd80ace680'::uuid, 'e00b859d-8d0a-4b54-ad55-cf06b4c29482'::uuid);

-- service: 118 rows from cloud
INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status, created_at)
VALUES
  ('a8b54df9-0b3c-4f89-838e-34dde59843c3'::uuid, 'd8ad93d1-9754-4f36-8da0-4937343da780'::uuid, '------------▼管理▼-------------', NULL, NULL, NULL, 1, NULL, NULL, NULL, 'adm', '下書き', '2026-07-03 16:40:43.039+09'::timestamptz),
  ('e89881ed-d8a5-408c-868c-258d91cb5df4'::uuid, 'f49d0767-aae0-4e1f-bf62-e8fba7177f3e'::uuid, '---', NULL, NULL, NULL, 1, NULL, NULL, NULL, 'saas_adm', '下書き', '2026-07-03 21:47:45.886+09'::timestamptz),
  ('c8d9e0f1-a2b3-4c5d-6e7f-8a9b0c1d2e3f'::uuid, 'e240781b-db31-4ffb-b789-3b8abd97bc45'::uuid, 'AI職場改善提案エージェント', NULL, '職場改善提案の自動生成画面', 'ストレスチェックの集団分析結果をAIが読み取り、具体的な職場改善策を自動生成する画面です。データに基づいた客観的な提案により、人事担当者の負担を軽減しながら、実効性の高い改善計画の策定を支援します。', 10, '/adm/ai-workplace-improvement', NULL, NULL, 'adm', '公開', '2026-07-03 21:30:59.499+09'::timestamptz),
  ('55ad4edc-1031-4c75-89f2-5ef084bc3803'::uuid, '1775ced6-b43c-4561-a003-0fee026862ac'::uuid, 'お知らせ管理', NULL, '社内通知・お知らせの一括管理と編集画面', '人事担当者が従業員向けのお知らせを一覧表示、新規追加、編集できる管理画面です。公開日や対象範囲の確認に加え、最新情報には「NEW」バッジが表示されるなど、社内情報の円滑な共有と運用をサポートします。', 10, '/adm/announcements', NULL, NULL, 'adm', '公開', '2026-07-03 21:30:00.193+09'::timestamptz),
  ('b99ddd31-a126-4bc9-9122-d5d2aae27739'::uuid, '6f555967-a96d-407a-9446-ad4f3bec8305'::uuid, '勤怠ダッシュボード', NULL, '勤怠データ明細一覧（人事）', '人事担当者向けに、勤怠データ明細・残業・アラートを月次で一覧し、CSVの取込とエクスポートができます。', 10, '/adm/attendance/dashboard', NULL, NULL, 'adm', '公開', '2026-07-03 20:14:15.14+09'::timestamptz),
  ('83c690de-f5ed-4b4a-a24a-a1c1c2b89d50'::uuid, '78c72c52-ccff-4989-9e65-a043cd66ecfd'::uuid, '情報の自動検索・配信', NULL, 'Web検索AI要約レポート配信', '指定テーマでWebを定期検索し、AIが記事を要約・意見生成してメールへ配信するルールを管理', 10, '/adm/auto-distribution', NULL, NULL, 'adm', '公開', '2026-07-03 21:42:09.194+09'::timestamptz),
  ('740c3642-1260-4f28-80d3-9ef2153327c5'::uuid, 'a3b14282-98a6-4d16-9dd7-e8fefe5b2036'::uuid, 'キャリア面談管理', NULL, 'キャリア面談管理', '全社のキャリア面談記録の確認・登録ができます。', 10, '/adm/career-discussions', NULL, NULL, 'adm', '公開', '2026-07-03 19:59:01.317+09'::timestamptz),
  ('9c31c197-1b4b-46ec-8363-408af371b967'::uuid, '0df0d92e-e03f-427c-8731-676d43df7130'::uuid, 'テレワーク端末ペアリング', NULL, '勤怠・端末', 'テレワーク用 PC の登録申請と人事による承認', 10, '/adm/device-pairing', NULL, NULL, 'adm', '公開', '2026-07-03 20:26:59.242+09'::timestamptz),
  ('c9660140-ea54-43e0-b8d6-4d9d94a77be3'::uuid, 'ea168748-853e-4340-b240-7ebfdbf85647'::uuid, '研修コース作成', NULL, NULL, '新規の研修コースを作成し、eラーニングシステムで運用管理します。', 10, '/adm/el-courses', NULL, NULL, 'adm', '公開', '2026-07-03 21:26:51.199+09'::timestamptz),
  ('3a5034ba-06dc-4157-b1bd-351d4bc5c01f'::uuid, '23e3ad3e-cc0f-4b21-91a1-0b4a91812f82'::uuid, '従業員の登録', NULL, '従業員管理', '従業員データをCSVファイルやシステムから読み込み、一括登録・管理します。', 10, '/adm/employees', NULL, NULL, 'adm', '公開', '2026-07-03 21:43:29.661+09'::timestamptz),
  ('c865b895-5782-4af2-b783-1876e0ff5caa'::uuid, '2c64738f-bee1-458d-afae-67033faeceb0'::uuid, 'ストレスチェック（拠点・期間・対象者）の登録', NULL, ' ストレスチェック実施拠点の登録', '人事が実施拠点とアンカー部署を登録し、拠点単位でストレスチェック期間や集団分析の前提を構築します。', 10, '/adm/establishments', NULL, NULL, 'adm', '公開', '2026-07-03 21:19:37.701+09'::timestamptz),
  ('98db4100-fddd-43aa-92fe-02daabb10599'::uuid, '7e492f11-ab5a-4025-beb7-246384559b15'::uuid, '人事評価管理', NULL, NULL, NULL, 10, '/adm/evaluation', NULL, NULL, 'adm', '公開', '2026-07-03 21:04:46.428+09'::timestamptz),
  ('73039bf0-5646-4651-b6ae-c1f0723a529e'::uuid, 'e240781b-db31-4ffb-b789-3b8abd97bc45'::uuid, '経営者向け統合エグゼクティブサマリー', NULL, NULL, NULL, 10, '/adm/executive-summary', NULL, NULL, 'adm', '公開', '2026-07-03 21:31:51.968+09'::timestamptz),
  ('b9c8d7e6-f5a4-9302-cdef-034567890123'::uuid, 'beaf010f-4e1c-46aa-9cc0-101f933c9dd8'::uuid, '高ストレス者フォロー管理（産業医）', NULL, '高ストレス者の面接指導・就業措置管理画面', '産業医・保健師専用の管理画面で、高ストレス判定者のリスト化や面接予約、実施履歴を一元管理します。適切な就業措置の記録やリマインダー設定が可能で、法令遵守に基づいた迅速なフォロー体制の構築を支援します。', 10, '/adm/high-stress-followup', NULL, NULL, 'adm', '公開', '2026-07-03 21:46:49.222+09'::timestamptz),
  ('7ead7ae9-dc14-4f19-b149-552d1393ff6e'::uuid, '048a8fec-d4b2-42b5-adbb-1f19791130e7'::uuid, '入退社ライフサイクルワークフロー', NULL, NULL, NULL, 10, '/adm/lifecycle', NULL, NULL, 'adm', '公開', '2026-07-03 20:59:50.877+09'::timestamptz),
  ('090073f1-e743-4fd8-bffd-c59db6bb37ee'::uuid, '35c69c7f-6580-4250-a125-d15c28ead6b2'::uuid, 'サービスダッシュボード', NULL, NULL, NULL, 10, '/adm/service_role', NULL, NULL, 'adm', '公開', '2026-07-03 21:45:20.674+09'::timestamptz),
  ('d530a613-e94b-4f21-97d0-81193d503de6'::uuid, '621eeeeb-a62f-4b83-8c8e-5f650d7b96c2'::uuid, 'スキルテンプレートコピー', NULL, NULL, '従業員の職種とスキルレベルを管理し、組織のスキルマップを構築・運用します。', 10, '/adm/skill-tempCopy', NULL, NULL, 'adm', '公開', '2026-07-03 21:36:11.393+09'::timestamptz),
  ('1c4d33b2-db34-4c8c-918d-acd88f292141'::uuid, 'a3b14282-98a6-4d16-9dd7-e8fefe5b2036'::uuid, '後継者計画', NULL, NULL, NULL, 10, '/adm/succession', NULL, NULL, 'adm', '公開', '2026-07-03 21:03:58.284+09'::timestamptz),
  ('a1b2c3d4-e5f6-7890-abcd-123456789001'::uuid, 'e18af98d-ac24-4ece-b2f7-689f406c3331'::uuid, 'アンケート管理', NULL, 'アンケート管理', '従業員向けアンケートの作成・設問編集・対象者へのアサインを行います。システム区分（全テナント共用）とテナント区分（自社専用）の2種類を管理できます。', 10, '/adm/Survey', NULL, NULL, 'adm', '公開', '2026-07-03 21:29:24.23+09'::timestamptz),
  ('d2b6362f-648f-46f9-96b4-098c7a4a221e'::uuid, '1dc338ff-19d7-407e-94e4-06e60b1339a0'::uuid, '	パルスサーベイ設問＆開始の設定', NULL, 'Echoパルス設問セット管理', '月次パルス用の設問セットを一覧し、テンプレ複製・編集・下書きの本番確定・削除まで一連の運用ができます。', 10, '/adm/tenant_questionnaire', NULL, NULL, 'adm', '公開', '2026-07-03 21:12:26.514+09'::timestamptz);

INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status, created_at)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-123456789002'::uuid, 'c48f741e-66dd-48eb-8335-56eabc2eba6b'::uuid, '	アンケート回答履歴', NULL, 'アンケートに回答する', '担当者から依頼されたアンケートに回答します。', 10, '/answers', NULL, NULL, 'all_users', '公開', '2026-07-03 20:12:15.619+09'::timestamptz),
  ('454e15a6-11b1-4eb1-9c82-be575e66a255'::uuid, 'b19f12e5-2d1b-4d8a-b526-bda180fd755e'::uuid, '出退勤のQRコード打刻', NULL, 'スマホで完結！不正防止機能付き・QRコード出退勤打刻', 'QRを読み取るだけで打刻完了。
本人確認により、現場での不正打刻を確実に防ぎます。', 10, '/apps/attendance/scan', NULL, NULL, 'all_users', '公開', '2026-07-03 16:24:21.541+09'::timestamptz),
  ('f1942f6f-dcab-4200-9d52-f72f4f984165'::uuid, '042f5642-072d-4af3-a070-c93f2c73622b'::uuid, 'キャリア面談', NULL, 'キャリア面談', '自分のキャリア面談履歴の確認、（上長の場合）部下とのキャリア面談の記録ができます。', 10, '/career-discussions', NULL, NULL, 'all_users', '公開', '2026-07-03 19:56:57.662+09'::timestamptz),
  ('4a73af35-3858-4530-8a06-fb074c06b761'::uuid, 'b5818d06-b98d-4ed1-bb94-f3a100b75ec6'::uuid, 'eラーニング（研修）コース一覧', NULL, NULL, NULL, 10, '/el-courses', NULL, NULL, 'all_users', '公開', '2026-07-03 16:58:28.502+09'::timestamptz),
  ('a1b2c3d4-0006-4000-8000-000000000001'::uuid, '4c1db2f1-f36a-4e00-b385-4c1943855bf2'::uuid, '社内イベント一覧', 'wellbeing', '社内イベント・表彰', '社内イベントの告知・参加表明、表彰の発表を確認できます。', 10, '/events', NULL, NULL, 'all_users', '公開', '2026-07-03 16:57:13.019+09'::timestamptz),
  ('1cc1896e-2dd1-4125-9514-46844d69d555'::uuid, '4fac9b2d-0398-4418-be33-c02233b0b2db'::uuid, '1on1 記録確認', NULL, 'マイ1on1', '自分が受けた1on1の履歴を確認できます。', 10, '/my-one-on-one', NULL, NULL, 'all_users', '公開', '2026-07-03 16:51:07.516+09'::timestamptz),
  ('2208c674-4f32-4bf9-9374-415f23e54c14'::uuid, '01d98789-a791-4dc6-8445-3c04eb4ac8b8'::uuid, 'スキルポータル（マイスキル）', NULL, NULL, '従業員が自身のスキルと能力レベルを申請し、スキルマップを構築します。', 10, '/my-skills', NULL, NULL, 'all_users', '公開', '2026-07-03 19:53:05.65+09'::timestamptz),
  ('f23db37b-353f-46ee-a20e-de6396fec66d'::uuid, '042f5642-072d-4af3-a070-c93f2c73622b'::uuid, 'スキルジャーニー相談（AI）', NULL, NULL, 'ストレスや心理的悩みに関する相談を上司に申告する専用フォームです。', 10, '/my-skills/journey/consult', NULL, NULL, 'all_users', '公開', '2026-07-03 20:04:01.141+09'::timestamptz),
  ('fd1f4395-3148-4c8d-8e4a-f11f795160d8'::uuid, 'fbbd4d45-6610-44ef-9989-3f3183ce3158'::uuid, '① 納入QRスキャン（製造元より入荷時）', NULL, '納入登録（QRスキャン）', '１．（株）ミューの担当者が納入時にスマートデバイスでラベルのQRコードをスキャンします 。
２．QRコード内の「シリアル番号」と「有効期間」を読み取り、現在の「納入先」「納入日」と紐付けて delivery_logs に保存します 。', 10, '/myou/delivery-scan', NULL, NULL, 'all_users', '公開', '2026-07-03 16:01:57.794+09'::timestamptz),
  ('f2876ad2-7991-4853-bca6-6a6a9adf517d'::uuid, '46e319c6-303e-482c-9134-e12363f8dc4c'::uuid, 'リファラル採用', NULL, NULL, NULL, 10, '/referral', NULL, NULL, 'all_users', '公開', '2026-07-03 20:54:25.99+09'::timestamptz),
  ('81dae03f-2f66-4df2-ad2a-f9291d9b55e6'::uuid, '3bcaea26-19a5-473f-998d-34ca4b113908'::uuid, '「パルスサーベイ」テンプレート 作成', NULL, 'パルフサーベイのテンプレート管理', 'テンプレの登録・編集・削除までの管理。', 10, '/saas_adm/echo_template', NULL, NULL, 'saas_adm', '公開', '2026-06-23 21:01:54.994017+09'::timestamptz),
  ('2eb4f512-4129-4657-8c93-dcffdd04c7db'::uuid, '194390c5-dafd-482b-b979-60f165b7ae28'::uuid, '新規ご契約（会社：テナント）', NULL, 'テナント管理', '新規の顧客企業を登録し、マルチテナント環境を管理します。', 10, '/saas_adm/tenants', '74f8e05b-c99d-45ee-b368-fdbe35ee0e52'::uuid, NULL, 'saas_adm', '公開', '2026-07-03 21:49:50.889+09'::timestamptz),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid, 'f306b876-6889-44f3-8d84-a69922cb3d75'::uuid, 'ストレスチェック受検', NULL, '💫【毎月10回無料】あなたの心の健康診断（ストレスチェック）', '本調査は、労働安全衛生法に基づく法定検査です。回答内容は法令に基づき厳重に管理され、本人の同意なく事業者（会社側）に結果が提供されたり、回答結果を理由に不利益な取扱いを受けることはありません。現在のありのままの状態をご回答ください。ご自身のストレス状態に気づき、メンタルヘルス不調を未然に防ぐことを目的としています。', 10, '/stress-check', NULL, NULL, 'all_users', '公開', '2026-07-03 19:49:45.124+09'::timestamptz),
  ('a1b2c3d4-0011-4000-8000-000000000001'::uuid, 'e96353b7-a7a5-41d3-998f-b20ef2306e06'::uuid, '社内ディレクトリ', 'communication', 'チームコネクト', '組織図・社内ディレクトリを確認できます。', 10, '/team-connect', NULL, NULL, 'all_users', '公開', '2026-07-03 20:05:46.058+09'::timestamptz),
  ('a9300992-6b93-4f89-8007-7256c1ffb463'::uuid, '6a92a6a9-357a-46ef-81a5-a26bc2f21b64'::uuid, 'AI採用ログ', NULL, '【Proプラン限定】AI求人原稿のアーカイブ管理', 'AI求人メーカーで作成したすべての履歴を自動で保存します。
過去の質問内容と生成結果をセットで振り返り、採用チーム全体での目線合わせや媒体運用に役立てます。', 100, '/adm/recruitment-ai-log', NULL, NULL, 'adm', '公開', '2026-07-03 20:51:28.467+09'::timestamptz),
  ('b0627c08-cee0-4e09-a8f1-b0096372278b'::uuid, 'ef09ab5e-15f6-475b-88ee-e7766992c34e'::uuid, 'パルスサーベイ組織健康度ダッシュボード', NULL, '組織健康度・分析ダッシュボード', '「今月の組織健康度アンケート」の結果のダッシュボードです。
チームごとの健康度スコアや、メンバーのコンディション推移を視覚的に分析できます。
日々のマネジメントや、より良い職場環境をつくるためのアクションにお役立てください。', 100, 'survey/dashboard', NULL, NULL, 'all_users', '公開', '2026-07-03 21:16:51.804+09'::timestamptz),
  ('46443a3a-ad1a-4317-84de-40a051962022'::uuid, 'e240781b-db31-4ffb-b789-3b8abd97bc45'::uuid, '離職リスク分析', NULL, NULL, NULL, 107, '/adm/turnover-risk', NULL, NULL, 'adm', '公開', '2026-07-03 21:35:22.339+09'::timestamptz),
  ('aa5ddaaa-c8a2-4f3f-bdc2-c02b193e09c4'::uuid, 'c9a0db38-88a8-4537-9199-596fd0fb4bf4'::uuid, 'リファラル採用管理', NULL, NULL, NULL, 110, '/adm/referral', NULL, NULL, 'adm', '公開', '2026-07-03 20:56:07.901+09'::timestamptz),
  ('4d8c0d61-2548-4ba6-9658-ec02443b6a62'::uuid, '1dc338ff-19d7-407e-94e4-06e60b1339a0'::uuid, '	サーベイダッシュボード', NULL, NULL, NULL, 12, '/adm/survey/dashboard', NULL, NULL, 'adm', '公開', '2026-07-03 21:15:01.668+09'::timestamptz),
  ('a1b2c3d4-0004-4000-8000-000000000001'::uuid, 'ef09ab5e-15f6-475b-88ee-e7766992c34e'::uuid, 'コンディション記録', 'wellbeing', 'コンディション記録', '今日の気分・体調を1タップで記録します。', 12, '/condition', NULL, NULL, 'all_users', '公開', '2026-07-03 21:15:15.866+09'::timestamptz);

INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status, created_at)
VALUES
  ('33610f5f-4b14-400c-a90f-014aacff1ee6'::uuid, 'c9a0db38-88a8-4537-9199-596fd0fb4bf4'::uuid, 'リファラル報奨金設定', NULL, NULL, NULL, 120, '/adm/referral/rewards', NULL, NULL, 'adm', '公開', '2026-07-03 20:57:22.493+09'::timestamptz),
  ('a1b2c3d4-0005-4000-8000-000000000001'::uuid, '1dc338ff-19d7-407e-94e4-06e60b1339a0'::uuid, '部署別コンディション傾向', 'wellbeing', '部署別コンディション傾向', '上長・人事向けの匿名集計コンディション傾向です。', 13, '/adm/condition-trend', NULL, NULL, 'adm', '公開', '2026-07-03 21:03:32.554+09'::timestamptz),
  ('a1b2c3d4-0007-4000-8000-000000000001'::uuid, 'f110cfb9-f82d-4aa1-8124-d7ab73144220'::uuid, 'イベント・表彰管理', 'wellbeing', 'イベント・表彰管理', '社内イベントの作成・参加者管理、表彰の登録を行います。', 15, '/adm/events-awards', NULL, NULL, 'adm', '公開', '2026-07-03 21:24:44.255+09'::timestamptz),
  ('e456353b-4f4e-42e7-b2c0-595b2a844c72'::uuid, '6a92a6a9-357a-46ef-81a5-a26bc2f21b64'::uuid, '求人管理一覧', NULL, '【Proプラン限定】AI求人票・自動生成＆公開連携', '求人文の作成に頭を悩ませる必要はもうありません。
「営業経験者・年収500万まで・渋谷勤務」といった箇条書きのメモを入力するだけで、優秀なAIコピーライターが「Indeed」や「Google for Jobs」の検索アルゴリズムに最適化された魅力的な求人票を数秒で自動生成します。
内容を確認して「公開」ボタンを押せば、主要な無料求人検索エンジンへ自動でデータが連携・掲載されます。
✨ ゼロからの執筆不要: 現場の要望をそのまま入力するだけでOK。
🚀 SEO最適化: 検索結果で上位に表示されやすい、構造化されたデータで配信します。', 15, '/adm/job-positions', NULL, NULL, 'adm', '公開', '2026-07-03 20:46:55.831+09'::timestamptz),
  ('ffd9a043-e8aa-4cae-a2e1-5e36eddcfeeb'::uuid, '6a92a6a9-357a-46ef-81a5-a26bc2f21b64'::uuid, '求人票管理・媒体連携', NULL, NULL, NULL, 16, '/adm/job-positions/integration', NULL, NULL, 'adm', '下書き', '2026-07-03 20:47:52.714+09'::timestamptz),
  ('d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a'::uuid, '6a92a6a9-357a-46ef-81a5-a26bc2f21b64'::uuid, '採用ブランディング支援', NULL, '✨③ AI媒体別求人票ブランディング', '求人票をIndeed・LinkedIn・ハローワーク等の媒体向けに最適化。AIが会社の差別化ポイントを分析し、応募率を高める求人票を自動生成します。', 17, '/adm/job-branding', NULL, NULL, 'adm', '公開', '2026-07-03 20:48:39.115+09'::timestamptz),
  ('17fbfb12-0aeb-4d00-a54f-c9398f68e155'::uuid, '46e319c6-303e-482c-9134-e12363f8dc4c'::uuid, '自分の紹介状況', NULL, NULL, NULL, 20, '	/referral/my', NULL, NULL, 'all_users', '公開', '2026-07-03 16:31:12.667+09'::timestamptz),
  ('13878741-a00a-4fd1-a050-4b894bafcbd8'::uuid, '0df0d92e-e03f-427c-8731-676d43df7130'::uuid, 'リモートワークの承認', NULL, 'リモートワーク申請の端末承認', 'リモートワーク申請されたPCを承認します。
不正打刻の防止のため、「承認」されたPCのみ、勤務時間の打刻が可能です。', 20, '/adm/approve_pc', NULL, NULL, 'adm', '公開', '2026-07-03 20:27:20.646+09'::timestamptz),
  ('09274c3c-cd7a-47c8-84b6-155616e8e8ff'::uuid, '6f555967-a96d-407a-9446-ad4f3bec8305'::uuid, 'CSVインポート（勤怠）', NULL, '従業員番号で一括登録！QR表示権限のCSVインポート管理', '勤怠実績データをCSVファイルで迅速に取り込む。', 20, '/adm/csv_atendance', NULL, NULL, 'adm', '公開', '2026-07-03 20:14:57.492+09'::timestamptz),
  ('ee5e31ef-60da-4dc2-a200-de50db9009fd'::uuid, '35c69c7f-6580-4250-a125-d15c28ead6b2'::uuid, '組織の登録', NULL, '組織設定', '貴社の組織構成や部門、階層を登録し、組織管理の基盤を構築します。', 20, '/adm/divisions', NULL, NULL, 'adm', '公開', '2026-07-03 21:44:17.406+09'::timestamptz),
  ('f8ab37d1-4519-4e52-8355-f96fc6097dc7'::uuid, 'ea168748-853e-4340-b240-7ebfdbf85647'::uuid, '受講者の登録', NULL, NULL, 'eラーニング研修の受講者を登録し、進捗を管理します。', 20, '/adm/el-assignments', NULL, NULL, 'adm', '公開', '2026-07-03 21:27:22.171+09'::timestamptz),
  ('cf52caab-be85-4167-9c43-f48b9225631c'::uuid, '35c69c7f-6580-4250-a125-d15c28ead6b2'::uuid, '「お問合せ」ナレッジ登録', NULL, '人事ナレッジ（RAG）文書の登録', '管理者が社内規程や制度の本文をテキスト貼り付け・公開URL・ファイル（PDF など）から取り込み、ナレッジとして登録できます。
登録した内容は、ポータル上部の「人事へのお問合せ」モーダル内の AI チャットが回答するときの参照元になります。個人情報や不要な文書は載せず、必要な範囲だけを登録してください。', 20, '/adm/inquiry-chat-knowledge', NULL, NULL, 'adm', '公開', '2026-07-03 20:07:26.36+09'::timestamptz),
  ('a1b2c3d4-0009-4000-8000-000000000001'::uuid, 'f110cfb9-f82d-4aa1-8124-d7ab73144220'::uuid, '感謝・称賛 集計', 'wellbeing', '感謝・称賛 集計', '感謝・称賛（Kudos）の部署別・個人別の送信・受信件数を集計します。', 20, '/adm/kudos-stats', NULL, NULL, 'adm', '公開', '2026-07-03 21:26:08.823+09'::timestamptz),
  ('0b3264b8-4297-4d8d-9c4c-52125c1bb684'::uuid, '621eeeeb-a62f-4b83-8c8e-5f650d7b96c2'::uuid, '	スキルマップ管理', NULL, NULL, '従業員に対して職種を割り当て、キャリアパスを設定します。', 20, '/adm/skill-map', NULL, NULL, 'adm', '公開', '2026-07-03 21:37:32.654+09'::timestamptz),
  ('ecfd2d1d-45e8-4e2a-b465-e24008492d4c'::uuid, '2c64738f-bee1-458d-afae-67033faeceb0'::uuid, 'ストレスチェック進捗管理', NULL, 'チェック進捗', 'ストレスチェック実施時の回答進捗状況をモニタリングし、リマインダーを送信します。', 20, '/adm/stress-check/progress', NULL, NULL, 'adm', '公開', '2026-06-23 21:01:54.994017+09'::timestamptz),
  ('73231b37-4bb2-4c5f-a746-23c3c55cfb05'::uuid, '6c0cfcfc-0b9d-4a74-8bef-ceec5f616a96'::uuid, '残業申請の承認', NULL, '現場でQRを表示・承認するだけ！監督者用リアルタイム打刻管理', 'QRコードを提示し、従業員のスキャンをその場で確認・一括承認。現場に居る人だけを正確に記録できます。', 20, '/approval', NULL, NULL, 'all_users', '公開', '2026-07-03 16:27:32.211+09'::timestamptz),
  ('6a329a98-5c59-447e-ad9e-f0cac3b614bc'::uuid, 'ef09ab5e-15f6-475b-88ee-e7766992c34e'::uuid, 'コンディション傾向', NULL, NULL, NULL, 20, '/condition/team-trend', NULL, NULL, 'all_users', '公開', '2026-07-03 19:43:57.552+09'::timestamptz),
  ('a1b2c3d4-0002-4000-8000-000000000001'::uuid, '4fac9b2d-0398-4418-be33-c02233b0b2db'::uuid, '相談窓口（送信）', 'wellbeing', '悩み・相談窓口', '匿名または記名で人事・産業医に相談できる窓口です。', 20, '/consultation', NULL, NULL, 'all_users', '公開', '2026-07-03 16:51:43.466+09'::timestamptz),
  ('40f762a0-44f8-48db-b2ab-80a4d87e6186'::uuid, 'e96353b7-a7a5-41d3-998f-b20ef2306e06'::uuid, '人事ナレッジチャット', NULL, '制度・手続きのお問合せ（AI）', '登録された社内規程・制度に基づき、AI が回答します。最終判断は人事へご確認ください。', 20, '/inquiry-chat', NULL, NULL, 'all_users', '公開', '2026-07-03 20:11:31.694+09'::timestamptz),
  ('a1b2c3d4-0008-4000-8000-000000000001'::uuid, '4c1db2f1-f36a-4e00-b385-4c1943855bf2'::uuid, '感謝・称賛', 'wellbeing', '感謝・称賛', '同僚への感謝・称賛メッセージの投稿、全社フィードの確認ができます。', 20, '/kudos', NULL, NULL, 'all_users', '公開', '2026-07-03 16:56:48.752+09'::timestamptz);

INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status, created_at)
VALUES
  ('d7792f34-07ed-45e4-9540-64b22a48e133'::uuid, 'fbbd4d45-6610-44ef-9989-3f3183ce3158'::uuid, '② 出荷QRスキャン「納入先に出荷時」', NULL, '製品有効期限の自動監視とアラート通知画面', '納入済み製品の有効期限を毎日深夜に自動チェックし、残り30日以内の製品がある場合に施工会社へ注意喚起メールを送信します。アラートの送信履歴や対象件数を一目で確認でき、必要に応じた手動再送も可能です。', 20, '/myou/expiration-alerts', NULL, NULL, 'all_users', '公開', '2026-07-03 16:02:30.389+09'::timestamptz),
  ('3098c16a-5d7f-42ac-b052-586686a4617d'::uuid, '3bcaea26-19a5-473f-998d-34ca4b113908'::uuid, 'テンプレート 研修コース作成', NULL, NULL, NULL, 20, '/saas_adm/el-templates', NULL, NULL, 'saas_adm', '公開', '2026-06-23 21:01:54.994017+09'::timestamptz),
  ('31177e44-3849-42c0-83dc-5ad6341842a4'::uuid, '01d98789-a791-4dc6-8445-3c04eb4ac8b8'::uuid, 'スキル承認申請一覧', NULL, NULL, '上長が従業員からの各種申請を確認し、承認または却下する画面です。', 20, '/skill-approvals', NULL, NULL, 'all_users', '公開', '2026-07-03 19:54:51.389+09'::timestamptz),
  ('97e58b0a-2c07-43d5-b805-1dd4689f311f'::uuid, 'f306b876-6889-44f3-8d84-a69922cb3d75'::uuid, 'ストレスチェック結果の確認', NULL, NULL, NULL, 20, '/stress-check/result', NULL, NULL, 'all_users', '公開', '2026-07-03 19:50:16+09'::timestamptz),
  ('10dc4ca7-91c6-49e8-a956-fdf3b0798136'::uuid, 'c48f741e-66dd-48eb-8335-56eabc2eba6b'::uuid, 'パルスサーベイ回答', NULL, '健康度調査', '今月の組織健康度を短時間のアンケート調査で把握し、組織の状態を監視します。', 20, '/survey/answer', NULL, NULL, 'all_users', '公開', '2026-07-03 20:12:51.474+09'::timestamptz),
  ('340b1610-665c-48c9-8e64-37755da227c3'::uuid, '194390c5-dafd-482b-b979-60f165b7ae28'::uuid, 'SaaSサービス機能の登録', NULL, 'サービス管理', 'SaaSの利用可能サービスと機能を設定・管理します。', 20, '/system-master', '74f8e05b-c99d-45ee-b368-fdbe35ee0e52'::uuid, NULL, 'saas_adm', '公開', '2026-07-03 21:50:06.416+09'::timestamptz),
  ('cb126cce-555e-446b-95b4-a1db1e161e8d'::uuid, '2f310cc9-454d-4032-8e01-25a493a0a203'::uuid, '採用市場・競合分析ダッシュボード', NULL, '採用市場分析', '採用市場のトレンドや競合企業の採用動向を分析して採用戦略に活用します。', 20, 'market-analysis', NULL, NULL, 'adm', '公開', '2026-07-03 20:32:34.804+09'::timestamptz),
  ('a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'::uuid, '35c69c7f-6580-4250-a125-d15c28ead6b2'::uuid, 'テレワーク端末承認（人事）', NULL, '勤怠・端末', 'テレワーク用 PC の登録申請の承認・拒否と承認済み一覧', 200, '/adm/approve_pc', NULL, NULL, 'adm', '公開', '2026-06-23 21:01:54.994017+09'::timestamptz),
  ('e81e8ca6-8b3e-4a3a-b748-9fab0411dd6d'::uuid, '4fac9b2d-0398-4418-be33-c02233b0b2db'::uuid, '社員相談対応リスト', NULL, NULL, NULL, 30, '	/consultation/inbox', NULL, NULL, 'all_users', '公開', '2026-07-03 16:52:46.583+09'::timestamptz),
  ('61329da9-2660-445a-8368-14ebc0af1bc5'::uuid, '7e492f11-ab5a-4025-beb7-246384559b15'::uuid, '評価期間の作成・ステータス管理', NULL, NULL, '人事評価の実施期間を設定し、期間ごとのステータスを管理します。', 30, '/adm/evaluation-periods', NULL, NULL, 'adm', '公開', '2026-07-03 21:05:52.08+09'::timestamptz),
  ('7a1e46d2-31db-4f19-b0c8-243295cf2d1f'::uuid, 'e240781b-db31-4ffb-b789-3b8abd97bc45'::uuid, 'HRアシスタント（AI）', NULL, NULL, NULL, 30, '/adm/hr-assistant', NULL, NULL, 'adm', '公開', '2026-07-03 21:33:03.67+09'::timestamptz),
  ('756641fd-4ed4-4ce5-8a15-84cfec0cd36f'::uuid, '0df0d92e-e03f-427c-8731-676d43df7130'::uuid, '管理者（QRコード表示）の登録', NULL, '管理者用・QR表示権限の登録', '不正打刻を未然に防ぐ！管理者がQRを表示できる従業員を個別に許可・制限。
現場の状況に合わせた柔軟な権限管理を実現します。', 30, '/adm/qr_atendance', NULL, NULL, 'adm', '公開', '2026-07-03 20:27:58.915+09'::timestamptz),
  ('8efd1557-0f82-418e-a025-58f6631fc21f'::uuid, 'c9a0db38-88a8-4537-9199-596fd0fb4bf4'::uuid, 'リファラル求人掲載', NULL, NULL, NULL, 30, '/adm/referral/postings', NULL, NULL, 'adm', '公開', '2026-07-03 20:52:29.46+09'::timestamptz),
  ('9336fa6c-2e43-4947-9952-9505237c84dd'::uuid, '35c69c7f-6580-4250-a125-d15c28ead6b2'::uuid, 'サービス割当者一覧者', NULL, 'サービス利用ユーザーの割当・一括管理画面', '各サービスを利用する対象ユーザーを一覧形式で管理・編集できる画面です。
ユーザーごとのサービス割当状況を可視化し、新規作成や同期処理を行うことで、組織内の適切な権限管理とスムーズな運用をサポートします。', 30, '/adm/service-assignments', NULL, NULL, 'adm', '公開', '2026-07-03 21:46:11.736+09'::timestamptz),
  ('5c90df06-06f9-4a65-9ed7-74ec25e80722'::uuid, '621eeeeb-a62f-4b83-8c8e-5f650d7b96c2'::uuid, 'スキル申請管理', NULL, NULL, '人事の最終承認後、従業員のスキルマップに自動的に反映させます。', 30, '/adm/skill-map/applications', NULL, NULL, 'adm', '公開', '2026-07-03 21:38:08.421+09'::timestamptz),
  ('73b6b91e-0d90-487f-ab4c-3f4548fd320d'::uuid, '2c64738f-bee1-458d-afae-67033faeceb0'::uuid, 'ストレスチェック実施期間の管理', NULL, 'サービス利用ユーザーの割当・一括管理画面', '各サービスを利用する対象ユーザーを一覧形式で管理・編集できる画面です。ユーザーごとのサービス割当状況を可視化し、新規作成や同期処理を行うことで、組織内の適切な権限管理とスムーズな運用をサポートします。', 30, '/adm/stress-check/mnt_sets', NULL, NULL, 'adm', '公開', '2026-07-03 21:21:21.968+09'::timestamptz),
  ('022806ae-40d7-4983-b374-691924c6ebab'::uuid, '01d98789-a791-4dc6-8445-3c04eb4ac8b8'::uuid, '自分の育成ジャーニーボード', NULL, NULL, '従業員が自身のキャリア開発の進捗をボードで可視化・管理できます。', 30, '/my-skills/journey', NULL, NULL, 'all_users', '公開', '2026-07-03 19:58:01.079+09'::timestamptz),
  ('a96116f9-808f-4780-91c2-8bb6ffb3eb57'::uuid, 'cf57ab59-c534-4d9b-b9bd-df05de1b3123'::uuid, '納入先登録', NULL, '施工会社（納入先）の一括管理・登録画面', '納入登録や有効期限アラートの基盤となる施工会社情報を管理する画面です。正しいメールアドレスを登録することでアラート機能が正常に動作し、システム統計により登録済みの会社数をリアルタイムで把握可能です。', 30, '/myou/companies', NULL, NULL, 'all_users', '公開', '2026-07-03 16:03:56.381+09'::timestamptz),
  ('4b774928-742b-4db4-8993-6f692ebbf522'::uuid, 'fbbd4d45-6610-44ef-9989-3f3183ce3158'::uuid, 'トレーサビリティ検索', NULL, '流通経路の照会とシリアル番号検索画面', 'シリアル番号やQRスキャンにより、製品の流通履歴を即座に照会できます。ブロックチェーン技術を活用し、改ざん不能なデータで透明性を担保します。', 30, '/myou/traceability', NULL, NULL, 'all_users', '公開', '2026-07-03 16:02:53.939+09'::timestamptz),
  ('9f7b56d4-382e-400d-9ff2-3f26206437ca'::uuid, 'b19f12e5-2d1b-4d8a-b526-bda180fd755e'::uuid, '	リモートワーク開始・終了', NULL, '社用端末で安心打刻！テレワーク作業開始・終了の記録管理', '承認済みPCで作業時間を正確に記録。位置情報とPCログを連携し、テレワーク中の稼働状況を可視化します。', 30, '/remort_work', NULL, NULL, 'all_users', '公開', '2026-07-03 16:28:22.387+09'::timestamptz);

INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status, created_at)
VALUES
  ('2d8ba477-cab8-4e81-9ae9-cf81ead97b1c'::uuid, '3bcaea26-19a5-473f-998d-34ca4b113908'::uuid, '「スキル」テンプレート管理', NULL, NULL, NULL, 30, '/saas_adm/skill-templates', NULL, NULL, 'saas_adm', '公開', '2026-06-23 21:01:54.994017+09'::timestamptz),
  ('ac547321-e1f0-4c6b-9623-161b76cec163'::uuid, '6f555967-a96d-407a-9446-ad4f3bec8305'::uuid, '月次勤怠締め一覧', NULL, '勤退データ月次締め詳細（集計・承認）', '人事担当者向け。対象月の集計確認、再集計・承認、打刻修正への導線をまとめた画面です。', 40, '/adm/closure', NULL, NULL, 'adm', '公開', '2026-07-03 20:23:22.739+09'::timestamptz),
  ('20837730-7669-43de-a649-4a524c3dbc20'::uuid, '7e492f11-ab5a-4025-beb7-246384559b15'::uuid, '360度評価キャンペーン管理', NULL, '360度評価', '360度評価キャンペーンの管理を行います。', 40, '/adm/evaluation-360', NULL, NULL, 'adm', '公開', '2026-07-03 21:07:50.767+09'::timestamptz),
  ('abec50a1-ea78-4bdc-9950-2fb559069940'::uuid, '7e492f11-ab5a-4025-beb7-246384559b15'::uuid, '人事評価テンプレート管理', NULL, NULL, '人事評価用のテンプレートを作成・編集・削除して、評価基準を管理します。', 40, '/adm/evaluation-templates', NULL, NULL, 'adm', '公開', '2026-07-03 21:07:13.319+09'::timestamptz),
  ('63969a64-ff0a-417f-b194-97dc8683eadd'::uuid, '6a92a6a9-357a-46ef-81a5-a26bc2f21b64'::uuid, '採用ファネル', NULL, NULL, NULL, 40, '/adm/funnel', NULL, NULL, 'adm', '公開', '2026-07-03 20:50:15.498+09'::timestamptz),
  ('7d3a4972-a822-4a1d-8934-76ad59cf1501'::uuid, '6a92a6a9-357a-46ef-81a5-a26bc2f21b64'::uuid, 'ハローワーク連携', NULL, '【Proプラン限定】ハローワーク一括登録用CSV出力', '1件ずつ何十分もかけてコピペしていた、ハローワークへの求人登録作業から解放されます。
システム上で作成した求人データを、ハローワーク指定の厳格なフォーマット（HTMLタグ除去・文字化け防止BOM対応済み）に自動変換し、一括登録用のCSVファイルとしてダウンロードできます。
あとは、ハローワークの事業主マイページからファイルを読み込ませるだけで、複数の求人もあっという間に登録完了です。
⏱️ 作業時間を数十分の一に: コピペミスや、文字数オーバーによるエラーを未然に防ぎます。
💡 迷わない安心設計: ダウンロード後のアップロード手順も、画面内のガイドでしっかりサポートします。', 40, '/adm/hellowork', NULL, NULL, 'adm', '公開', '2026-07-03 20:49:20.494+09'::timestamptz),
  ('22756114-54d4-49d4-857e-436be1630231'::uuid, '2c64738f-bee1-458d-afae-67033faeceb0'::uuid, '高ストレス者一覧（人事用）', NULL, 'ストレスチェック', '高ストレス者への面談勧奨から、オンラインでの申出受付、産業医による就業上の措置の記録までを一気通貫で管理。
機密性の高い医療情報を人事データと分離して保護し、セキュアなフォローアップ体制を構築します。', 40, '/adm/high-stress', NULL, NULL, 'adm', '公開', '2026-07-03 21:22:04.924+09'::timestamptz),
  ('1be7f0e7-14b6-45dd-91a1-a68639c61339'::uuid, 'e240781b-db31-4ffb-b789-3b8abd97bc45'::uuid, '操作マニュアル', NULL, NULL, NULL, 40, '/adm/manual', NULL, NULL, 'adm', '公開', '2026-07-03 21:33:59.128+09'::timestamptz),
  ('f3ed814c-b195-4530-aa04-e0158a947bd2'::uuid, '0df0d92e-e03f-427c-8731-676d43df7130'::uuid, '労使協定（36（サブロク）協定）時間の設定', NULL, '自社の規定に最適化！残業アラート閾値の個別設定', '月間・年間・平均の残業上限と警告ラインを自社ルールで設定。', 40, '/adm/overtime-settings', NULL, NULL, 'adm', '公開', '2026-07-03 20:28:43.686+09'::timestamptz),
  ('f4f1080a-6ea2-445b-aa73-94080df33e42'::uuid, '621eeeeb-a62f-4b83-8c8e-5f650d7b96c2'::uuid, 'スキル承認者設定', NULL, NULL, '各種申請の承認者となるマスタデータを管理します。', 40, '/adm/skill-map/approvers', NULL, NULL, 'adm', '公開', '2026-07-03 21:38:50.255+09'::timestamptz),
  ('ae6a59be-b368-4236-b1bc-4c2a7aaf034c'::uuid, '2c64738f-bee1-458d-afae-67033faeceb0'::uuid, '	組織健康度分析（ヒートマップ）', NULL, 'ストレスチェック', '部署ごとの回答結果を「仕事の負担」や「周囲の支援」などの尺度別に多角的に集計。
全国平均と比較した偏差値や健康リスク値を自動算出し、組織全体の傾向と構造的な課題を客観的なデータで浮き彫りにします。', 40, '/adm/stress-check/group-analysis', NULL, NULL, 'adm', '公開', '2026-06-23 21:01:54.994017+09'::timestamptz),
  ('feb3b078-66d2-4915-8a3c-2caf7b70906d'::uuid, '6c0cfcfc-0b9d-4a74-8bef-ceec5f616a96'::uuid, '残業申請', NULL, '月別の残業申請・日次勤怠の確認', '対象月の日ごとに出退勤と残業を一覧し、未締めの月は行の申請から残業を登録できます。', 40, '/application', NULL, NULL, 'all_users', '公開', '2026-07-03 20:20:03.983+09'::timestamptz),
  ('560d2338-7ea5-4171-a74f-a4c38b2397bf'::uuid, 'b19f12e5-2d1b-4d8a-b526-bda180fd755e'::uuid, 'QR 打刻（監督者）', NULL, '現場でQRを表示・承認するだけ！監督者用リアルタイム打刻管理', 'QRコードを提示し、従業員のスキャンをその場で確認・一括承認。現場に居る人だけを正確に記録できます。', 40, '/apps/attendance/qr-punch', NULL, NULL, 'all_users', '公開', '2026-07-03 16:27:13.309+09'::timestamptz),
  ('c0a3e447-6523-4f95-9b1e-77b944f71bde'::uuid, '01d98789-a791-4dc6-8445-3c04eb4ac8b8'::uuid, '360度評価一覧', NULL, '360度評価 依頼一覧', '依頼された360度評価への回答ができます。', 40, '/my-evaluation-360', NULL, NULL, 'all_users', '公開', '2026-07-03 20:00:21.712+09'::timestamptz),
  ('b8c65146-2d08-45b6-9d30-50a0f851dcec'::uuid, 'fbbd4d45-6610-44ef-9989-3f3183ce3158'::uuid, '	有効期限監視と自動アラート', NULL, 'トレーサビリティ検索', '１．流通経路の透明化: 各製品が最終的にどの施工会社に納入されたかを追跡。
２．不正利用の抑止: 万が一「転売」や「不正利用」が疑われる事態が発生しても、迅速かつ正確に流通経路を特定できる体制を構築 。', 40, '/myou/expiration-alerts', NULL, NULL, 'all_users', '公開', '2026-07-03 16:03:27.332+09'::timestamptz),
  ('e884d6d3-fc30-422c-9d39-2b3cdf31a340'::uuid, '3bcaea26-19a5-473f-998d-34ca4b113908'::uuid, '人事評価テンプレート一覧', NULL, NULL, NULL, 40, '/saas_adm/evaluation-global-templates', NULL, NULL, 'saas_adm', '公開', '2026-07-03 21:49:21.078+09'::timestamptz),
  ('a1dad5a2-a393-4502-93d0-9d44a7c7c45f'::uuid, '19e62597-28de-4380-9507-eb5e56bb75ba'::uuid, '36協定分析', NULL, ' 36協定遵守状況リスク管理ダッシュボード', '36協定の上限規制に基づき、時間外労働の状況を組織・個人単位でリアルタイムに可視化します。
単月・年間の超過リスクを自動判定し、アラート表示やドリルダウン分析を通じて法的リスクの未然防止を強力に支援します。', 50, '/adm/36analysis', NULL, NULL, 'adm', '公開', '2026-07-03 20:31:52.65+09'::timestamptz),
  ('25ef4ef9-34fd-461f-adcf-755f98f5b9fe'::uuid, '621eeeeb-a62f-4b83-8c8e-5f650d7b96c2'::uuid, '評価ワークフロー管理', NULL, '評価ワークフロー', '評価フローの進捗・承認状況を管理します。', 50, '/adm/evaluation/workflow', NULL, NULL, 'adm', '公開', '2026-07-03 21:36:50.355+09'::timestamptz),
  ('dba2f099-53d5-45ef-8f7d-cf4fedfdd0b2'::uuid, '6f555967-a96d-407a-9446-ad4f3bec8305'::uuid, '労働法令コンプライアンス', NULL, NULL, NULL, 50, '/adm/labor-compliance', NULL, NULL, 'adm', '公開', '2026-07-03 20:26:08.545+09'::timestamptz),
  ('4a408aa8-ab83-4181-ab77-0395c19c3a6b'::uuid, '621eeeeb-a62f-4b83-8c8e-5f650d7b96c2'::uuid, '目標管理（OKR / MBO）ダッシュボード', NULL, NULL, NULL, 50, '/adm/okr', NULL, NULL, 'adm', '公開', '2026-07-03 21:40:57.412+09'::timestamptz);

INSERT INTO public.service (id, service_category_id, name, category, title, description, sort_order, route_path, app_role_group_id, app_role_group_uuid, target_audience, release_status, created_at)
VALUES
  ('b93ef613-38a3-4a31-94a3-1fd9d1eb9dfd'::uuid, '35c69c7f-6580-4250-a125-d15c28ead6b2'::uuid, '基本設定', NULL, 'ポータルから利用するお問合せ先メールなど、テナント単位の設定を行います。', ' 入力した人事宛先を保存し、ポータル「人事へメール」で従業員から送られるメールの宛先に反映します。', 50, '/adm/settings', NULL, NULL, 'adm', '公開', '2026-06-23 21:01:54.994017+09'::timestamptz),
  ('fa40234e-cdf9-4e03-b6f3-3767f7e22b88'::uuid, 'b19f12e5-2d1b-4d8a-b526-bda180fd755e'::uuid, '私の出退勤カレンダー（ 自己確認用）', NULL, '従業員向け勤怠確認・月次カレンダー画面', 'ログイン中の従業員が自分の出退勤記録を月次カレンダー形式で確認し、総労働時間・残業時間・休日出勤・アラート件数を一目で把握できる画面です。', 50, '/attendance/self', NULL, NULL, 'all_users', '公開', '2026-07-03 16:27:56.462+09'::timestamptz),
  ('fba20211-b73b-48d7-97cd-46f7e1095f70'::uuid, '01d98789-a791-4dc6-8445-3c04eb4ac8b8'::uuid, '自分の評価シート一覧', NULL, NULL, NULL, 50, '/my-evaluation ', NULL, NULL, 'all_users', '公開', '2026-07-03 20:01:48.493+09'::timestamptz),
  ('a31ad870-23bf-497e-b9e3-67c32b85a395'::uuid, '19e62597-28de-4380-9507-eb5e56bb75ba'::uuid, '36協定分析・残業集計', NULL, NULL, NULL, 60, '/adm/36analysis/seed', NULL, NULL, 'adm', '公開', '2026-07-03 20:36:05.471+09'::timestamptz),
  ('93407316-908c-415c-9512-9882d32c6995'::uuid, '7e492f11-ab5a-4025-beb7-246384559b15'::uuid, '退職面談分析ダッシュボード', NULL, NULL, NULL, 60, '/adm/exit-interview', NULL, NULL, 'adm', '公開', '2026-07-03 21:12:18.073+09'::timestamptz),
  ('f597bcc4-8b50-4b8f-801d-209c3fb60072'::uuid, '2f310cc9-454d-4032-8e01-25a493a0a203'::uuid, '採用市場・競合分析', NULL, NULL, NULL, 60, '/adm/market-analysis', NULL, NULL, 'adm', '公開', '2026-07-03 20:40:36.95+09'::timestamptz),
  ('ccde0b53-d49d-447d-8292-56f4cf052662'::uuid, '621eeeeb-a62f-4b83-8c8e-5f650d7b96c2'::uuid, 'OKRツリービュー', NULL, NULL, NULL, 60, '/adm/okr/tree', NULL, NULL, 'adm', '公開', '2026-07-03 21:41:15.523+09'::timestamptz),
  ('43c556f0-54ad-414e-b808-c46e1563437d'::uuid, '2c64738f-bee1-458d-afae-67033faeceb0'::uuid, '	パルス×ストレス分析', NULL, 'ストレス×パルス', 'ストレスチェック結果とEchoパルスサーベイの結果を組み合わせて分析します。', 60, '/adm/pulse-stress', NULL, NULL, 'adm', '公開', '2026-07-03 21:23:33.282+09'::timestamptz),
  ('63346225-2c85-4ccc-995e-cc68cb3b3272'::uuid, '2c64738f-bee1-458d-afae-67033faeceb0'::uuid, '行政報告書出力', NULL, '労基署報告', '労基署への報告に必要なデータを自動集計し、レポート形式で出力します。', 70, '/adm/gov-report', NULL, NULL, 'adm', '公開', '2026-07-03 21:24:11.365+09'::timestamptz),
  ('d73c4c74-6594-4e53-80f7-2d2cb1bd7b9e'::uuid, '2f310cc9-454d-4032-8e01-25a493a0a203'::uuid, '内定条件検証', NULL, 'AIによるオファー条件の妥当性診断画面', '採用ターゲットの職種や想定給与を入力すると、最新の市場データとAI推論を掛け合わせ、提示オファーの競争力を即座に診断します。データに基づいた客観的な判断により、採用成功率の向上を強力にバックアップします。', 70, '/adm/offer-validation', NULL, NULL, 'adm', '公開', '2026-07-03 20:44:31.078+09'::timestamptz),
  ('b8124192-67db-437f-b58d-39f61a181e58'::uuid, '6c0cfcfc-0b9d-4a74-8bef-ceec5f616a96'::uuid, 'リモートワーク申請＆端末登録', NULL, 'テレワーク端末を安全登録！管理者承認で秘密鍵を自動発行', '従業員が端末を申請し、人事が「承認」すると端末エージェントが秘密鍵で認証され、出勤・退勤の打刻が可能になります。', 70, '/device-pairing', NULL, NULL, 'all_users', '公開', '2026-07-03 20:20:34.792+09'::timestamptz),
  ('583a2692-1336-4682-af35-b35a1e06a937'::uuid, 'e240781b-db31-4ffb-b789-3b8abd97bc45'::uuid, '「横断KPI」ダッシュボード', NULL, '役員会議資料を自動生成できる。人事の状況を数字で語れる', '- 採用KPI：応募数・選考通過率・充足率
- 定着KPI：離職率・平均在籍年数
- 生産性KPI：平均残業時間・有休取得率
- エンゲージメントKPI：パルスサーベイ平均スコア・高ストレス率
- 育成KPI：スキルギャップ率・研修完了率
- PDF／CSVエクスポートボタン', 75, '/adm/hr-kpi', NULL, NULL, 'adm', '公開', '2026-07-03 18:49:12.791+09'::timestamptz),
  ('1919bb92-e568-49ec-9a59-06f3ec72ccce'::uuid, 'e240781b-db31-4ffb-b789-3b8abd97bc45'::uuid, '「統合エンゲージメント」ダッシュボード', NULL, NULL, NULL, 79, '/adm/engagement', NULL, NULL, 'adm', '公開', '2026-07-03 21:34:39.988+09'::timestamptz),
  ('3aa46cd8-2699-4c8f-9a6b-9af7c4976dce'::uuid, 'c5ac3118-a0f6-4a03-abaf-f0f27b62894e'::uuid, '	1on1支援機能', NULL, '1on1支援機能', '部下との1on1記録・フォローアップを管理します。', 80, '/adm/one-on-one', NULL, NULL, 'adm', '公開', '2026-07-03 21:28:12.1+09'::timestamptz),
  ('89c10335-ac97-4c7a-b83f-a7f2e51de966'::uuid, 'fd387834-9c6c-4f0f-ad2a-99cea7509558'::uuid, '採用パルス・面接後フィードバック', NULL, '【Proプラン限定】面接後の「本音」をキャッチし、辞退を未然に防ぐ。', '「面接の感触は良かったのに、なぜ辞退されたのかわからない…」そんな採用のブラックボックスを解消します。
面接終了後、候補者のスマホに約30秒で終わるショートアンケートを自動送信。面接の場では直接言いにくい「懸念点」や「志望度の変化」をリアルタイムに可視化します。', 80, '/adm/pulse', NULL, NULL, 'adm', '公開', '2026-07-03 20:58:05.953+09'::timestamptz),
  ('3fd119fa-677c-4a01-8de5-e739e8d862b6'::uuid, '6a92a6a9-357a-46ef-81a5-a26bc2f21b64'::uuid, 'AI採用スクリーニング', NULL, '💫【毎月10回無料】無料媒体からスカウトまで全対応！最適な原稿と戦略をAIで。', '3つの質問に答えるだけで、あなたの会社の「リアルな魅力」が伝わる求人票・スカウト文・面接ガイドをAIが瞬時に作成します。
予算やターゲットに応じた最適な採用プラットフォームの提案もお任せください。', 90, '/adm/recruitment-ai', NULL, NULL, 'adm', '公開', '2026-07-03 20:51:03.629+09'::timestamptz),
  ('4e64daad-c2c6-4a18-b53b-f89f18ebbf7f'::uuid, '35c69c7f-6580-4250-a125-d15c28ead6b2'::uuid, '実施対象者管理', NULL, '基本設定', 'ストレスチェック・パルスサーベイ等の実施枠ごとに対象者を管理。
産業医 は常に対象者外。', 900, '/adm/program-targets', NULL, NULL, 'adm', '公開', '2026-06-23 21:01:54.994017+09'::timestamptz),
  ('a1b2c3d4-0003-4000-8000-000000000001'::uuid, 'd077cb90-f8b4-40f0-8e9e-d163b1245301'::uuid, '相談窓口待ち相談管理', 'wellbeing', '相談窓口キュー管理', '人事・産業医向けの相談受付一覧です。', 94, '/adm/consultation-queue', NULL, NULL, 'adm', '公開', '2026-07-03 21:28:56.321+09'::timestamptz);

