-- ローカル開発 DB（seed + Studio 調整）の service_category をクラウドと一致させる。
-- 20260404120000 は古い seed スナップショットかつ DO NOTHING のため、同一 id の更新・新規 id が反映されない問題を解消。
-- ON CONFLICT DO UPDATE: 既存行の sort_order / name / description / release_status を上書きする。

INSERT INTO public.service_category (id, sort_order, name, description, release_status) VALUES
  ('194390c5-dafd-482b-b979-60f165b7ae28', 10000, 'Saas：基本設定', '', 'released'),
  ('35c69c7f-6580-4250-a125-d15c28ead6b2', 9000, '管理：基本登録', '', 'released'),
  ('ecdcf3d5-8bcd-4c30-be4e-4a6d652621e4', 100, '人事・採用支援', '', 'released'),
  ('fbbd4d45-6610-44ef-9989-3f3183ce3158', 10, 'mYou：業務処理', NULL, NULL),
  ('cf57ab59-c534-4d9b-b9bd-df05de1b3123', 11, 'mYou：管理業務', NULL, NULL),
  ('2c64738f-bee1-458d-afae-67033faeceb0', 4000, '管理：ストレスチェック', NULL, NULL),
  ('2f310cc9-454d-4032-8e01-25a493a0a203', 2000, '管理：採用支援', NULL, 'released'),
  ('20b94ed3-9847-4761-8497-8cd16363b357', 1000, '管理：人事情報登録', NULL, NULL),
  ('beaf010f-4e1c-46aa-9cc0-101f933c9dd8', 5000, '産業医・保健師専用', NULL, NULL),
  ('1dc338ff-19d7-407e-94e4-06e60b1339a0', 200, 'ストレスチェック', '', 'released'),
  ('dfa11140-e8fa-4740-83ff-6f3432466770', 3000, '管理：パルスサーベイ', NULL, NULL),
  ('6f555967-a96d-407a-9446-ad4f3bec8305', 700, '勤退管理', NULL, NULL),
  ('6a92a6a9-357a-46ef-81a5-a26bc2f21b64', 7000, '管理：勤退管理', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  release_status = EXCLUDED.release_status;
