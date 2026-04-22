-- eラーニング マイクロラーニング＋シナリオベース学習 拡張マイグレーション
-- 既存テーブルへの後方互換な追加 + 新テーブル3種
--
-- 変更概要:
--   1. el_courses  : bloom_level / learning_objectives カラム追加
--   2. el_slides   : slide_type CHECK 拡張（5種追加）/ video_url / estimated_seconds 追加
--   3. el_scenario_branches    : シナリオ分岐テーブル（新規）
--   4. el_checklist_items      : 現場適用チェックリスト項目（新規）
--   5. el_checklist_completions: 受講者のチェック完了記録（新規）
--   6. el_progress : scenario_branch_id / selected_choice_text カラム追加

-- ============================================================
-- 1. el_courses にマイクロラーニング用カラムを追加
-- ============================================================

ALTER TABLE public.el_courses
  ADD COLUMN IF NOT EXISTS bloom_level TEXT
    CHECK (bloom_level IN (
      'remember',   -- 記憶する
      'understand', -- 理解する
      'apply',      -- 応用する
      'analyze',    -- 分析する
      'evaluate',   -- 評価する
      'create'      -- 創造する
    )),
  ADD COLUMN IF NOT EXISTS learning_objectives TEXT[]  -- 学習目標（箇条書き配列）
    DEFAULT '{}';

COMMENT ON COLUMN public.el_courses.bloom_level IS
  'Bloom''s Taxonomy に基づく認知レベル（remember / understand / apply / analyze / evaluate / create）';
COMMENT ON COLUMN public.el_courses.learning_objectives IS
  '「〇〇できる」形式の学習目標リスト。受講者に最初に提示する。';

-- ============================================================
-- 2. el_slides の slide_type CHECK 制約を拡張し、新カラムを追加
--    既存: text | image | quiz
--    追加: objective | micro_content | scenario | reflection | checklist
-- ============================================================

ALTER TABLE public.el_slides
  DROP CONSTRAINT IF EXISTS el_slides_slide_type_check;

ALTER TABLE public.el_slides
  ADD CONSTRAINT el_slides_slide_type_check
    CHECK (slide_type IN (
      -- 既存（後方互換）
      'text',
      'image',
      'quiz',
      -- 新規（マイクロラーニング用フェーズ）
      'objective',      -- [Phase 1] 学習目標スライド
      'micro_content',  -- [Phase 2] マイクロコンテンツ（テキスト/画像/動画）
      'scenario',       -- [Phase 3] シナリオ問題（分岐）
      'reflection',     -- [Phase 4] 振り返り＋解説
      'checklist'       -- [Phase 5] 現場適用チェックリスト
    )),
  ADD COLUMN IF NOT EXISTS video_url         TEXT,  -- 動画 URL（micro_content 用）
  ADD COLUMN IF NOT EXISTS estimated_seconds INT    -- このスライドの想定所要秒数
    CHECK (estimated_seconds IS NULL OR estimated_seconds > 0);

COMMENT ON COLUMN public.el_slides.slide_type IS
  'スライド種別: text/image/quiz（既存）/ objective/micro_content/scenario/reflection/checklist（新規）';
COMMENT ON COLUMN public.el_slides.video_url IS
  'Phase 2 マイクロコンテンツで埋め込む動画 URL（YouTube / Vimeo / Supabase Storage）';
COMMENT ON COLUMN public.el_slides.estimated_seconds IS
  'スライド単位の想定学習時間（秒）。コース全体の estimated_minutes 算出にも利用。';

-- ============================================================
-- 3. el_scenario_branches — シナリオ分岐選択肢テーブル（新規）
--    slide_type = 'scenario' の el_slides に紐づく
-- ============================================================

CREATE TABLE IF NOT EXISTS public.el_scenario_branches (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id        UUID        NOT NULL REFERENCES public.el_slides(id) ON DELETE CASCADE,
  branch_order    INT         NOT NULL DEFAULT 0,
  choice_text     TEXT        NOT NULL,          -- 選択肢ラベル（「〇〇する」等）
  feedback_text   TEXT,                          -- 選択後に表示するフィードバック本文
  is_recommended  BOOLEAN     NOT NULL DEFAULT FALSE,  -- 推奨回答フラグ（模範解答）
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_el_scenario_branches_slide_id
  ON public.el_scenario_branches(slide_id, branch_order);

COMMENT ON TABLE  public.el_scenario_branches IS
  'シナリオスライドの分岐選択肢。1スライドに2〜4件程度を想定。';
COMMENT ON COLUMN public.el_scenario_branches.is_recommended IS
  'TRUE の選択肢が「模範解答」。複数設定可（例: B と C はどちらも推奨）。';

-- RLS: el_slides → el_courses 経由でテナント分離
ALTER TABLE public.el_scenario_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "el_scenario_branches_all" ON public.el_scenario_branches
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.el_slides s
      JOIN public.el_courses c ON c.id = s.course_id
      WHERE s.id = el_scenario_branches.slide_id
        AND (c.tenant_id = public.current_tenant_id() OR c.tenant_id IS NULL)
    )
  );

-- ============================================================
-- 4. el_checklist_items — 現場適用チェックリスト項目テーブル（新規）
--    slide_type = 'checklist' の el_slides に紐づく
-- ============================================================

CREATE TABLE IF NOT EXISTS public.el_checklist_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id    UUID        NOT NULL REFERENCES public.el_slides(id) ON DELETE CASCADE,
  item_order  INT         NOT NULL DEFAULT 0,
  item_text   TEXT        NOT NULL,  -- 「〇〇を上司に報告した」等の行動記述
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_el_checklist_items_slide_id
  ON public.el_checklist_items(slide_id, item_order);

COMMENT ON TABLE  public.el_checklist_items IS
  '現場適用チェックリストの各項目。1スライドに3〜5件を推奨。';
COMMENT ON COLUMN public.el_checklist_items.item_text IS
  '「〇〇した」「〇〇を確認した」等の過去形・完了形で記述する行動文。';

-- RLS: el_slides → el_courses 経由（el_scenario_branches と同パターン）
ALTER TABLE public.el_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "el_checklist_items_all" ON public.el_checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.el_slides s
      JOIN public.el_courses c ON c.id = s.course_id
      WHERE s.id = el_checklist_items.slide_id
        AND (c.tenant_id = public.current_tenant_id() OR c.tenant_id IS NULL)
    )
  );

-- ============================================================
-- 5. el_checklist_completions — 受講者チェック完了記録テーブル（新規）
--    受講者が現場でチェック項目を「実施した」と記録する
--    コース完了後も随時更新可能（後日チェック対応）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.el_checklist_completions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assignment_id     UUID        NOT NULL REFERENCES public.el_assignments(id) ON DELETE CASCADE,
  checklist_item_id UUID        NOT NULL REFERENCES public.el_checklist_items(id) ON DELETE CASCADE,
  employee_id       UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  checked_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, checklist_item_id)  -- 同一アサイン×項目は1レコードのみ
);

CREATE INDEX IF NOT EXISTS idx_el_checklist_completions_assignment_id
  ON public.el_checklist_completions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_el_checklist_completions_tenant_id
  ON public.el_checklist_completions(tenant_id);

COMMENT ON TABLE  public.el_checklist_completions IS
  '受講者が現場適用チェックリストの各項目を完了したことを記録する。コース完了後も随時追加可能。';

-- RLS: テナント分離（el_progress と同パターン）
ALTER TABLE public.el_checklist_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "el_checklist_completions_tenant" ON public.el_checklist_completions
  FOR ALL USING (tenant_id = public.current_tenant_id());

-- ============================================================
-- 6. el_progress にシナリオ選択の記録カラムを追加
-- ============================================================

ALTER TABLE public.el_progress
  ADD COLUMN IF NOT EXISTS scenario_branch_id   UUID
    REFERENCES public.el_scenario_branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selected_choice_text TEXT;  -- 選択時点のテキストスナップショット

COMMENT ON COLUMN public.el_progress.scenario_branch_id IS
  'シナリオスライドで受講者が選択した分岐の ID。';
COMMENT ON COLUMN public.el_progress.selected_choice_text IS
  '選択時の choice_text スナップショット（分岐が後から削除されても内容を保持）。';
