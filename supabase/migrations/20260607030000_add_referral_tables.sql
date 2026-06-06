-- 既存テーブルは一切変更しない。新規テーブルのみ追加。
-- リファラル採用管理機能（NEW-4）

-- =========================================================
-- referral_postings — リファラル対象求人
-- =========================================================
CREATE TABLE public.referral_postings (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES public.tenants(id),
  job_posting_id   UUID        REFERENCES public.job_postings(id),
  title            TEXT        NOT NULL,
  description      TEXT,
  department       TEXT,
  employment_type  TEXT        CHECK (employment_type IN ('full_time','part_time','contract')),
  reward_amount    INTEGER     NOT NULL DEFAULT 0,
  reward_condition TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  deadline         DATE,
  created_by       UUID        REFERENCES public.employees(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.referral_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.referral_postings
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_referral_postings_tenant_active
  ON public.referral_postings(tenant_id, is_active);

CREATE TRIGGER trg_referral_postings_updated_at
  BEFORE UPDATE ON public.referral_postings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================================================
-- referral_nominations — 推薦記録
-- =========================================================
CREATE TABLE public.referral_nominations (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        NOT NULL REFERENCES public.tenants(id),
  referral_posting_id  UUID        NOT NULL REFERENCES public.referral_postings(id),
  referrer_employee_id UUID        NOT NULL REFERENCES public.employees(id),
  nominee_name         TEXT        NOT NULL,
  nominee_email        TEXT,
  nominee_phone        TEXT,
  relationship         TEXT,
  nomination_reason    TEXT,
  status               TEXT        NOT NULL DEFAULT 'pending'
                       CHECK (status IN (
                         'pending','reviewing','interview',
                         'offered','hired','rejected','withdrawn'
                       )),
  hr_notes             TEXT,
  hired_at             DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.referral_nominations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.referral_nominations
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_referral_nominations_tenant_status
  ON public.referral_nominations(tenant_id, status);
CREATE INDEX idx_referral_nominations_referrer
  ON public.referral_nominations(tenant_id, referrer_employee_id);
CREATE INDEX idx_referral_nominations_posting
  ON public.referral_nominations(referral_posting_id);

CREATE TRIGGER trg_referral_nominations_updated_at
  BEFORE UPDATE ON public.referral_nominations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =========================================================
-- referral_rewards — 報奨金支払い管理
-- =========================================================
CREATE TABLE public.referral_rewards (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES public.tenants(id),
  nomination_id         UUID        NOT NULL REFERENCES public.referral_nominations(id) UNIQUE,
  referrer_employee_id  UUID        NOT NULL REFERENCES public.employees(id),
  amount                INTEGER     NOT NULL,
  status                TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','paid','cancelled')),
  scheduled_date        DATE,
  paid_at               DATE,
  approved_by           UUID        REFERENCES public.employees(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON public.referral_rewards
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_referral_rewards_tenant_status
  ON public.referral_rewards(tenant_id, status);
CREATE INDEX idx_referral_rewards_referrer
  ON public.referral_rewards(tenant_id, referrer_employee_id);

CREATE TRIGGER trg_referral_rewards_updated_at
  BEFORE UPDATE ON public.referral_rewards
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
