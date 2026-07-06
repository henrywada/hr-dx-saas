-- パワーハラスメント防止 基礎（テンプレートコース 1 モジュール / パイロット seed）
-- el_courses (template) + el_slides (text/quiz) + el_quiz_questions + el_quiz_options

INSERT INTO public.el_courses (
  id, tenant_id, title, description, category, status, course_type,
  estimated_minutes, learning_objectives
) VALUES (
  'aaaaaaaa-0001-4001-8001-000000000001',
  NULL,
  'パワーハラスメント防止 基礎',
  '職場におけるパワーハラスメントの定義・具体例・防止策を学びます。',
  'コンプライアンス',
  'published',
  'template',
  30,
  ARRAY[
    'パワーハラスメントの定義と4類型を説明できる',
    '具体例と見分け方のポイントを理解できる',
    '事業者・従業員それぞれの防止策を実践できる'
  ]
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0001-4001-8001-000000000011',
  'aaaaaaaa-0001-4001-8001-000000000001',
  0, 'text', 'パワーハラスメントとは',
  E'パワーハラスメント（パワハラ）とは、優位性の立場にある者が、それに付随する職務上の権力などを背景に、業務上必要かつ相当な範囲を超えて、従業員の就業環境を害する行為をいいます。\n\n2019年6月施行の改正労働施策総合推進法により、すべての事業者にパワハラ防止措置の義務が課せられました。\n\n【3類型の定義】\n1. 身体的な攻撃 — 殴る、蹴る、物を投げるなど\n2. 精神的な攻撃 — 暴言、人格否定、無視、過度な叱責など\n3. 人間関係からの切り離し — 仲間外れ、席の隔離、無視の指示など\n\n【要求の拒否・低減に関する行為】\n業務上の正当な理由なく、業務内容の大幅な変更や著しく低い役割への配置替えなども該当します。\n\n---\n【字幕】\nパワハラは優位性の立場にある者が、業務上必要な範囲を超えて従業員の就業環境を害する行為です。身体的・精神的・人間関係の切り離し、要求の拒否の4類型があります。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0001-4001-8001-000000000012',
  'aaaaaaaa-0001-4001-8001-000000000001',
  1, 'quiz', '理解度チェック（セクション1）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0001-4001-8001-000000000021',
  'aaaaaaaa-0001-4001-8001-000000000012',
  'パワーハラスメントの類型に含まれないものはどれですか？', 0,
  '正当な業務指示に基づく通常の指導はパワハラには該当しません。業務上必要かつ相当な範囲を超えた行為が問題となります。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0001-4001-8001-000000000031', 'aaaaaaaa-0001-4001-8001-000000000021', '精神的な攻撃（暴言・人格否定）', false, 0),
  ('aaaaaaaa-0001-4001-8001-000000000032', 'aaaaaaaa-0001-4001-8001-000000000021', '身体的な攻撃（殴る・蹴る）', false, 1),
  ('aaaaaaaa-0001-4001-8001-000000000033', 'aaaaaaaa-0001-4001-8001-000000000021', '正当な業務指示に基づく通常の指導', true, 2),
  ('aaaaaaaa-0001-4001-8001-000000000034', 'aaaaaaaa-0001-4001-8001-000000000021', '人間関係からの切り離し', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0001-4001-8001-000000000013',
  'aaaaaaaa-0001-4001-8001-000000000001',
  2, 'text', '具体例と見分け方',
  E'【よくある具体例】\n- 人前での大声での叱責・「無能」などの人格否定\n- 業務と無関係な私的な用事の強制\n- 正当な理由なく会議や食事会への参加を拒否させる\n- 過度なノルマ設定や達成不可能な期限の設定\n\n【見分けのポイント】\n- 業務上の必要性があるか\n- 手段・程度が相当か\n- 相手の立場・経験を考慮しているか\n\n被害を受けた場合や目撃した場合は、社内相談窓口やハラスメント相談窓口への相談を検討してください。\n\n---\n【字幕】\n人前での人格否定、私的用事の強制、仲間外れなどが具体例です。業務上の必要性と手段の相当性が見分けのポイントです。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0001-4001-8001-000000000014',
  'aaaaaaaa-0001-4001-8001-000000000001',
  3, 'quiz', '理解度チェック（セクション2）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0001-4001-8001-000000000022',
  'aaaaaaaa-0001-4001-8001-000000000014',
  'パワハラの見分けで最も重要な観点はどれですか？', 0,
  '業務上必要かつ相当な範囲内かどうかが判断の基準です。厳しい指導であっても正当な業務指示はパワハラに該当しません。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0001-4001-8001-000000000041', 'aaaaaaaa-0001-4001-8001-000000000022', '叱責の回数が多いか', false, 0),
  ('aaaaaaaa-0001-4001-8001-000000000042', 'aaaaaaaa-0001-4001-8001-000000000022', '業務上の必要性と手段の相当性', true, 1),
  ('aaaaaaaa-0001-4001-8001-000000000043', 'aaaaaaaa-0001-4001-8001-000000000022', '上司の性格が厳しいか', false, 2),
  ('aaaaaaaa-0001-4001-8001-000000000044', 'aaaaaaaa-0001-4001-8001-000000000022', '残業時間が長いか', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0001-4001-8001-000000000015',
  'aaaaaaaa-0001-4001-8001-000000000001',
  4, 'text', '防止策と組織の取り組み',
  E'【事業者の義務】\n- パワハラを防止するための方針の明確化\n- 相談体制の整備（相談窓口の設置・周知）\n- 事実確認・再発防止措置の実施\n- 相談者に不利益を与えない旨の周知\n\n【従業員一人ひとりができること】\n- ハラスメント行為をしない\n- 気になる行為を見かけたら適切に報告・相談する\n- 相談者を孤立させない\n\n本モジュールを修了したら、自社の相談窓口の連絡先を確認しておきましょう。\n\n---\n【字幕】\n事業者は方針の明確化、相談体制、事実確認、相談者保護の4つを義務付けられています。従業員は加害を避け、適切な相談・報告を心がけましょう。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0001-4001-8001-000000000016',
  'aaaaaaaa-0001-4001-8001-000000000001',
  5, 'quiz', '理解度チェック（セクション3）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0001-4001-8001-000000000023',
  'aaaaaaaa-0001-4001-8001-000000000016',
  '事業者のパワハラ防止措置の義務に含まれるものはどれですか？', 0,
  '相談体制の整備と相談者に不利益を与えない旨の周知は、法律で義務付けられている防止措置の一つです。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0001-4001-8001-000000000051', 'aaaaaaaa-0001-4001-8001-000000000023', '全従業員の性格診断の実施', false, 0),
  ('aaaaaaaa-0001-4001-8001-000000000052', 'aaaaaaaa-0001-4001-8001-000000000023', '相談体制の整備と相談者保護の周知', true, 1),
  ('aaaaaaaa-0001-4001-8001-000000000053', 'aaaaaaaa-0001-4001-8001-000000000023', '毎月の全社集会の開催', false, 2),
  ('aaaaaaaa-0001-4001-8001-000000000054', 'aaaaaaaa-0001-4001-8001-000000000023', '残業時間の完全禁止', false, 3)
ON CONFLICT (id) DO NOTHING;
