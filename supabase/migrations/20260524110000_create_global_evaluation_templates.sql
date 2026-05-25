-- グローバル評価テンプレート（SaaS管理者専用）
-- global_skill_templates パターンに倣い、SELECT は全テナントが参照可、変更は service_role のみ

CREATE TABLE public.global_evaluation_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  template_type TEXT NOT NULL
    CHECK (template_type IN ('general', 'manager', 'parttime')),
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.global_evaluation_templates IS 'SaaS管理者が管理するグローバル評価テンプレート。テナントはここからコピーしてカスタマイズする。';
COMMENT ON COLUMN public.global_evaluation_templates.template_type IS 'general=一般社員用, manager=管理職用, parttime=パート用';

CREATE TABLE public.global_evaluation_template_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID NOT NULL REFERENCES public.global_evaluation_templates(id) ON DELETE CASCADE,
  axis         TEXT NOT NULL
    CHECK (axis IN ('performance', 'ability', 'attitude', 'mbo')),
  mbo_category TEXT
    CHECK (mbo_category IN ('A', 'B', 'C', 'D') OR mbo_category IS NULL),
  name         TEXT NOT NULL,
  description  TEXT,
  weight       NUMERIC(5,2) NOT NULL DEFAULT 0,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.global_evaluation_template_items.axis IS 'performance=業績, ability=能力, attitude=情意, mbo=MBO目標';
COMMENT ON COLUMN public.global_evaluation_template_items.mbo_category IS 'MBO目標のカテゴリ(A〜D)。axis=mbo のときのみ使用';
COMMENT ON COLUMN public.global_evaluation_template_items.weight IS '評価比重(%)。テンプレート内合計が100になるよう設計';

CREATE INDEX idx_global_eval_template_items_template_id
  ON public.global_evaluation_template_items(template_id);

-- RLS: SELECT は全員可、書き込みポリシーなし（service_role のみ書き込み可能）
ALTER TABLE public.global_evaluation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_evaluation_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "global_eval_templates_select"
  ON public.global_evaluation_templates FOR SELECT USING (true);

CREATE POLICY "global_eval_template_items_select"
  ON public.global_evaluation_template_items FOR SELECT USING (true);

-- シードデータ: 3種のグローバルテンプレート
INSERT INTO public.global_evaluation_templates (id, name, template_type, description, sort_order)
VALUES
  ('00000000-0000-0000-0001-000000000001', '一般社員用 標準テンプレート', 'general', '業績・能力・情意の3軸評価（100点満点）', 1),
  ('00000000-0000-0000-0001-000000000002', '管理職用 標準テンプレート',   'manager',  '業績・能力・情意の3軸評価＋部下育成項目', 2),
  ('00000000-0000-0000-0001-000000000003', 'パート用 標準テンプレート',   'parttime', '業績・情意の2軸評価（簡易版）', 3);

-- 一般社員用 項目
INSERT INTO public.global_evaluation_template_items
  (template_id, axis, name, description, weight, sort_order)
VALUES
  ('00000000-0000-0000-0001-000000000001', 'performance', '目標達成度',       '設定した目標に対する達成率', 15, 1),
  ('00000000-0000-0000-0001-000000000001', 'performance', '業務量・処理速度', '担当業務の量と処理速度の適切さ', 10, 2),
  ('00000000-0000-0000-0001-000000000001', 'performance', '業務の質・正確性', '成果物の品質と正確さ', 10, 3),
  ('00000000-0000-0000-0001-000000000001', 'performance', '期限遵守',         '締め切りや納期の遵守状況', 5,  4),
  ('00000000-0000-0000-0001-000000000001', 'ability', '専門知識・技術',       '業務に必要な専門知識・技術の習得と活用', 15, 5),
  ('00000000-0000-0000-0001-000000000001', 'ability', '判断力・応用力',       '状況に応じた適切な判断と応用', 10, 6),
  ('00000000-0000-0000-0001-000000000001', 'ability', 'コミュニケーション力', '社内外との円滑なコミュニケーション', 10, 7),
  ('00000000-0000-0000-0001-000000000001', 'attitude', '積極性・主体性', '自ら課題を見つけ積極的に行動する姿勢', 10, 8),
  ('00000000-0000-0000-0001-000000000001', 'attitude', '責任感',         '担当業務への責任感と最後までやり遂げる姿勢', 10, 9),
  ('00000000-0000-0000-0001-000000000001', 'attitude', '協調性',         'チームワークを大切にし協力する姿勢', 5,  10);

-- 管理職用 項目
INSERT INTO public.global_evaluation_template_items
  (template_id, axis, name, description, weight, sort_order)
VALUES
  ('00000000-0000-0000-0001-000000000002', 'performance', '組織目標達成度',   '部署・チームの目標に対する達成率', 20, 1),
  ('00000000-0000-0000-0001-000000000002', 'performance', '収益・コスト管理', '予算管理と収益への貢献', 10, 2),
  ('00000000-0000-0000-0001-000000000002', 'ability', 'マネジメント力',       '部下の管理・育成・動機付け', 20, 3),
  ('00000000-0000-0000-0001-000000000002', 'ability', '問題解決力',           '組織課題の特定と解決', 10, 4),
  ('00000000-0000-0000-0001-000000000002', 'ability', 'リーダーシップ',       'ビジョンを示し組織を牽引する力', 10, 5),
  ('00000000-0000-0000-0001-000000000002', 'attitude', '部下育成・指導',      '部下の成長支援と公正な評価', 15, 6),
  ('00000000-0000-0000-0001-000000000002', 'attitude', '変革への積極性',      '組織改善や新しい取り組みへの推進力', 10, 7),
  ('00000000-0000-0000-0001-000000000002', 'attitude', '誠実さ・信頼性',      '約束を守り信頼される行動', 5,  8);

-- パート用 項目
INSERT INTO public.global_evaluation_template_items
  (template_id, axis, name, description, weight, sort_order)
VALUES
  ('00000000-0000-0000-0001-000000000003', 'performance', '業務遂行能力',         '担当業務を正確に遂行できているか', 40, 1),
  ('00000000-0000-0000-0001-000000000003', 'performance', '業務量・速度',         '担当業務の処理量と速度', 20, 2),
  ('00000000-0000-0000-0001-000000000003', 'attitude',    '勤務態度・時間管理',   '出退勤・勤務態度の適切さ', 20, 3),
  ('00000000-0000-0000-0001-000000000003', 'attitude',    '協調性・チームワーク', 'チームとの連携と協調', 20, 4);
