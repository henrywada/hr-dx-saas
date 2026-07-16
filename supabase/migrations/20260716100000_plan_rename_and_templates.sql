-- ─────────────────────────────────────────────────────────────────────────────
-- プランコード刷新（free/pro/enterprise → free/plan100/plan300/plan500/plan1000）
-- ＋ プラン別テンプレートテナント整備 ＋ 業種カラム追加
-- 背景: docs/implementation-plan-plan-based-signup.md 参照
-- 注: 既存環境には name='PlanFree' 等のテンプレート相当テナント（tenant_service
--     設定済み）や、plan_type='PlanFree'/'Plan100'/'Plan1000' の PascalCase 値が
--     存在するため、それらを採用・正規化する
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. テンプレートテナント識別フラグ
--    status は webhook 等が active/pending/suspended として更新するライフサイクル値の
--    ため流用せず、専用フラグで区別する
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.is_template IS
  'プラン別テンプレートテナント（PlanFree 等）の識別フラグ。true の場合は契約テナントではなく tenant_service のコピー元';

-- 2. 業種カラム（サインアップ時の任意入力）
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS industry TEXT;

COMMENT ON COLUMN public.tenants.industry IS '業種（サインアップ時の任意入力）';

ALTER TABLE public.tenant_contracts
  ADD COLUMN IF NOT EXISTS industry TEXT;

COMMENT ON COLUMN public.tenant_contracts.industry IS '業種（申込時の任意入力・監査用）';

-- 3. プランコードのデータ正規化
--    旧コード（pro/enterprise）と PascalCase 値（PlanFree 等）を新コードへ移行
UPDATE public.tenants SET plan_type = 'free'     WHERE plan_type = 'PlanFree';
UPDATE public.tenants SET plan_type = 'plan100'  WHERE plan_type IN ('pro', 'Plan100');
UPDATE public.tenants SET plan_type = 'plan300'  WHERE plan_type = 'Plan300';
UPDATE public.tenants SET plan_type = 'plan500'  WHERE plan_type = 'Plan500';
UPDATE public.tenants SET plan_type = 'plan1000' WHERE plan_type IN ('enterprise', 'Plan1000');

UPDATE public.tenant_contracts SET plan_type = 'free'     WHERE plan_type = 'PlanFree';
UPDATE public.tenant_contracts SET plan_type = 'plan100'  WHERE plan_type IN ('pro', 'Plan100');
UPDATE public.tenant_contracts SET plan_type = 'plan300'  WHERE plan_type = 'Plan300';
UPDATE public.tenant_contracts SET plan_type = 'plan500'  WHERE plan_type = 'Plan500';
UPDATE public.tenant_contracts SET plan_type = 'plan1000' WHERE plan_type IN ('enterprise', 'Plan1000');

COMMENT ON COLUMN public.tenants.plan_type IS
  'テナントの契約プラン (free / plan100 / plan300 / plan500 / plan1000)';

-- 4. プラン別テンプレートテナントの整備
-- 4-1. 既存の同名テナント（手動準備済みの tenant_service を持つもの）を
--      テンプレートとして採用する
UPDATE public.tenants
SET is_template = true
WHERE name IN ('PlanFree', 'Plan100', 'Plan300', 'Plan500', 'Plan1000')
  AND is_template = false;

-- 4-2. 同名テンプレートが存在しないプランのみ、固定 UUID で新規作成（冪等）
--      tenant_service の中身は SaaS 管理画面（システムマスタ）から手動設定する
INSERT INTO public.tenants (id, name, plan_type, max_employees, status, is_template)
SELECT v.id::uuid, v.name, v.plan_type, 0, 'active', true
FROM (
  VALUES
    ('a0000000-0000-4000-8000-000000000001', 'PlanFree', 'free'),
    ('a0000000-0000-4000-8000-000000000002', 'Plan100',  'plan100'),
    ('a0000000-0000-4000-8000-000000000003', 'Plan300',  'plan300'),
    ('a0000000-0000-4000-8000-000000000004', 'Plan500',  'plan500'),
    ('a0000000-0000-4000-8000-000000000005', 'Plan1000', 'plan1000')
) AS v(id, name, plan_type)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenants t
  WHERE t.name = v.name AND t.is_template = true
);
