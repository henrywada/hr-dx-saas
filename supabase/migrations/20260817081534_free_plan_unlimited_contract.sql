-- 無料プランの契約期間を無期限に変更する。
--
-- 従来は登録日から 3 ヶ月後を contract_end_at に設定していたが、
-- 無料プランは期限を設けない方針に変更した（2026-08-17）。
-- contract_months = NULL は「無期限」を意味し、サインアップ時の
-- calcContractEndAt()（src/features/signup/actions.ts）が contract_end_at を
-- NULL のまま登録する。
--
-- コード側のフォールバック定義（src/features/signup/types.ts の PLAN_CONFIG）も
-- あわせて contractMonths: null に変更している。
--
-- 既存テナントの contract_end_at は変更しない。本マイグレーションは
-- これ以降の新規登録に適用される。既存の無料テナントを無期限に切り替える場合は、
-- 対象を個別に確認したうえで別途対応する。

UPDATE public.plan_config
SET contract_months = NULL,
    updated_at = NOW()
WHERE plan_type = 'free';
