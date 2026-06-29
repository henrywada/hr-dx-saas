-- スキル機能のMVPスコープ外スキーマを「未使用」として明示する（データ破壊は行わない）。
-- 方針: ローカル/本番のデータは保持する。将来の機能化に備えてテーブルは残し、
--       COMMENT で現状の利用状況を記録するに留める（DROP しない）。
-- 参照: docs/implementation-plan（4機能MVP）フェーズ3 / CLAUDE.md「ローカルデータは消さない」

COMMENT ON TABLE public.qualifications IS
  '【MVP未使用 / 予約】資格マスタ。現状アプリから参照していない。将来の資格管理機能向けに保持（DROP禁止）。';

COMMENT ON TABLE public.employee_qualifications IS
  '【MVP未使用 / 予約】従業員の資格保有情報。現状アプリから参照していない。将来の資格管理機能向けに保持（DROP禁止）。';

COMMENT ON TABLE public.skill_map_drafts IS
  '【MVP未使用 / v1残存】スキルマップ下書き。現行UIから未接続。データ保持方針により残置（DROP禁止）。';
