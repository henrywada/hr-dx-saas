-- サインアップフロー用テーブル追加・カラム追加マイグレーション
-- tenant_contracts: 申込情報の永続化・監査ログ
-- tenants: status / stripe_customer_id / contract_end_at カラム追加

-- ─────────────────────────────────────────────
-- 1. tenants テーブルにカラム追加
-- ─────────────────────────────────────────────

ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS "stripe_customer_id" TEXT,
    ADD COLUMN IF NOT EXISTS "contract_end_at" TIMESTAMPTZ;

COMMENT ON COLUMN public.tenants."status" IS 'テナントの状態: active / pending（銀行振込入金待ち）/ suspended（停止）';
COMMENT ON COLUMN public.tenants."stripe_customer_id" IS 'Stripe 顧客 ID（高速ルックアップ用）';
COMMENT ON COLUMN public.tenants."contract_end_at" IS '契約終了日（無制限は NULL）';

-- ─────────────────────────────────────────────
-- 2. tenant_contracts テーブル作成
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tenant_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- 申込者情報
    applicant_name  TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    company_name    TEXT NOT NULL,

    -- プラン・契約情報
    plan_type       TEXT NOT NULL,
    max_employees   INTEGER NOT NULL,

    -- 支払い情報
    payment_method  TEXT NOT NULL DEFAULT 'free',
    -- 'free' / 'card' / 'bank_transfer'
    paid_amount     INTEGER NOT NULL DEFAULT 0,
    -- 支払金額（月額・円）

    -- Stripe 情報
    stripe_customer_id          TEXT,
    stripe_payment_intent_id    TEXT UNIQUE,
    -- UNIQUE 制約で冪等性確保

    -- 支払い状態（銀行振込の非同期状態を管理）
    payment_status  TEXT NOT NULL DEFAULT 'unpaid',
    -- 'paid'             : 支払い完了（カード即時・銀行振込入金確認済み）
    -- 'pending_transfer' : 銀行振込待ち（振込指示送付済み）
    -- 'partially_paid'   : 部分入金済み（銀行振込のみ発生しうる）
    -- 'expired'          : 入金期限切れ
    -- 'failed'           : 決済失敗
    -- 'unpaid'           : 無料プラン（課金なし）

    bank_transfer_due_date          TIMESTAMPTZ,
    -- 入金期限（enterprise のみ設定）
    bank_transfer_amount_received   INTEGER NOT NULL DEFAULT 0,
    -- 受領済み金額（部分入金追跡用）

    -- 日付情報
    application_date    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    contract_start_at   TIMESTAMPTZ,
    -- 利用開始日（銀行振込は入金確認後に設定するため NULL 許容）
    contract_end_at     TIMESTAMPTZ,
    -- 利用終了日（無制限は NULL）

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tenant_contracts IS 'テナント申込情報の永続化・監査ログ';
COMMENT ON COLUMN public.tenant_contracts.payment_method IS '支払い方法: free / card / bank_transfer';
COMMENT ON COLUMN public.tenant_contracts.payment_status IS '支払い状態: paid / pending_transfer / partially_paid / expired / failed / unpaid';
COMMENT ON COLUMN public.tenant_contracts.stripe_payment_intent_id IS 'Stripe PaymentIntent ID（UNIQUE で冪等性確保）';
COMMENT ON COLUMN public.tenant_contracts.contract_start_at IS '利用開始日（銀行振込は入金確認後に Webhook で更新）';

-- ─────────────────────────────────────────────
-- 3. RLS 設定
-- ─────────────────────────────────────────────

ALTER TABLE public.tenant_contracts ENABLE ROW LEVEL SECURITY;

-- 同一テナントのユーザーのみ SELECT 可
-- INSERT / UPDATE / DELETE は service_role（createAdminClient）のみ
CREATE POLICY "tenant_contracts_select_same_tenant"
    ON public.tenant_contracts
    FOR SELECT
    USING (tenant_id = public.current_tenant_id());

-- ─────────────────────────────────────────────
-- 4. インデックス
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tenant_contracts_tenant_id
    ON public.tenant_contracts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_contracts_applicant_email
    ON public.tenant_contracts(applicant_email);

CREATE INDEX IF NOT EXISTS idx_tenant_contracts_payment_status
    ON public.tenant_contracts(payment_status);
