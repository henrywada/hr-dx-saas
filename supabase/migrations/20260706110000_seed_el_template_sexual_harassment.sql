-- セクシュアルハラスメント防止 基礎（テンプレート seed / sexual-harassment.ts より）

INSERT INTO public.el_courses (
  id, tenant_id, title, description, category, status, course_type,
  estimated_minutes, learning_objectives
) VALUES (
  'aaaaaaaa-0010-4010-8010-000000000001', NULL,
  E'セクシュアルハラスメント防止 基礎',
  E'セクシュアルハラスメント（セクハラ）の類型と対応を学びます。',
  'コンプライアンス', 'published', 'template', 30,
  ARRAY[
    E'セクハラの2類型（対価型・環境型）を理解する',
    E'具体例と被害時・目撃時の適切な対応を把握する',
    E'職場文化の改善策を実践できる'
  ]
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES ('aaaaaaaa-0010-4010-8010-000000000011', 'aaaaaaaa-0010-4010-8010-000000000001', 0, 'text', E'セクシュアルハラスメントとは', E'セクシュアルハラスメント（セクハラ）とは、性的な言動により、相手方の就業環境を害する行為をいいます。

【2類型の定義】
1. 対価型 — 性的な言動を条件に、就業条件（配置・昇進・評価等）について不利益・利益を与える行為
2. 環境型 — 性的な言動により、相手方の就業環境を害する行為（優位性は問わない）

被害者・加害者の性別は問いません。同性間のセクハラも該当します。

---
【字幕】
セクハラは対価型と環境型の2類型に分けられます。被害者・加害者の性別は問いません。') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES ('aaaaaaaa-0010-4010-8010-000000000012', 'aaaaaaaa-0010-4010-8010-000000000001', 1, 'quiz', E'理解度チェック（セクション1）') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES ('aaaaaaaa-0010-4010-8010-000000000013', 'aaaaaaaa-0010-4010-8010-000000000001', 2, 'text', E'具体例と対応', E'【具体例】
- 不必要な身体の接触
- 性的な冗談・下品な話
- わいせつな画像・動画の送付や掲示
- 容姿・私生活への性的な言及

【被害を受けた場合】
1. 可能であれば本人に止めるよう伝える
2. 上司やハラスメント相談窓口に相談する
3. 記録を残す（日時・内容・状況）

【目撃した場合】
- 被害者を孤立させない
- 適切な窓口へ報告・相談する

相談は秘密が守られ、相談したこと自体が不利益になることはあってはなりません。

---
【字幕】
不必要な接触、性的な冗談、わいせつな画像の送付などが具体例です。被害時は相談窓口の利用と記録の保存が重要です。') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES ('aaaaaaaa-0010-4010-8010-000000000014', 'aaaaaaaa-0010-4010-8010-000000000001', 3, 'quiz', E'理解度チェック（セクション2）') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES ('aaaaaaaa-0010-4010-8010-000000000015', 'aaaaaaaa-0010-4010-8010-000000000001', 4, 'text', E'職場文化の改善', E'【予防のための組織施策】
- ハラスメント防止研修の定期実施
- 相談窓口の周知とアクセスしやすさの確保
- 管理職への対応方法の教育
- 再発防止のための事実確認と措置

【日常で心がけること】
- 相手の感受性に配慮した言動
- 「冗談」として許される行為はないという意識
- 多様な価値観・背景を持つ人々との協働

安全で尊重し合える職場づくりは、すべての従業員の責任です。

---
【字幕】
定期研修、相談窓口の周知、管理職教育が組織施策の柱です。日常では相手への配慮と「冗談」として許されないという意識が大切です。') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES ('aaaaaaaa-0010-4010-8010-000000000016', 'aaaaaaaa-0010-4010-8010-000000000001', 5, 'quiz', E'理解度チェック（セクション3）') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES ('aaaaaaaa-0010-4010-8010-000000000021', 'aaaaaaaa-0010-4010-8010-000000000012', E'セクシュアルハラスメントの類型として正しい組み合わせはどれですか？', 0, E'セクハラは「対価型」と「環境型」の2類型で整理されます。') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0010-4010-8010-000000000031', 'aaaaaaaa-0010-4010-8010-000000000021', E'身体的型と精神的型', false, 0),
  ('aaaaaaaa-0010-4010-8010-000000000032', 'aaaaaaaa-0010-4010-8010-000000000021', E'対価型と環境型', true, 1),
  ('aaaaaaaa-0010-4010-8010-000000000033', 'aaaaaaaa-0010-4010-8010-000000000021', E'直接型と間接型', false, 2),
  ('aaaaaaaa-0010-4010-8010-000000000034', 'aaaaaaaa-0010-4010-8010-000000000021', E'意図的型と偶発型', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES ('aaaaaaaa-0010-4010-8010-000000000022', 'aaaaaaaa-0010-4010-8010-000000000014', E'セクハラを受けた際の適切な第一歩として推奨されるものはどれですか？', 0, E'社内のハラスメント相談窓口や上司への相談が適切な第一歩です。相談内容は秘密が守られます。') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0010-4010-8010-000000000041', 'aaaaaaaa-0010-4010-8010-000000000022', E'SNSで公開する', false, 0),
  ('aaaaaaaa-0010-4010-8010-000000000042', 'aaaaaaaa-0010-4010-8010-000000000022', E'ハラスメント相談窓口への相談', true, 1),
  ('aaaaaaaa-0010-4010-8010-000000000043', 'aaaaaaaa-0010-4010-8010-000000000022', E'何もせず我慢する', false, 2),
  ('aaaaaaaa-0010-4010-8010-000000000044', 'aaaaaaaa-0010-4010-8010-000000000022', E'同僚全員に詳細を共有する', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES ('aaaaaaaa-0010-4010-8010-000000000023', 'aaaaaaaa-0010-4010-8010-000000000016', E'セクハラ予防の組織施策として適切なものはどれですか？', 0, E'相談窓口の周知とアクセスしやすさの確保は、被害者が相談しやすい環境をつくる重要な施策です。') ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0010-4010-8010-000000000051', 'aaaaaaaa-0010-4010-8010-000000000023', E'相談窓口の周知とアクセスしやすさの確保', true, 0),
  ('aaaaaaaa-0010-4010-8010-000000000052', 'aaaaaaaa-0010-4010-8010-000000000023', E'相談者の氏名を全社に公開する', false, 1),
  ('aaaaaaaa-0010-4010-8010-000000000053', 'aaaaaaaa-0010-4010-8010-000000000023', E'性的な冗談を許容する職場文化', false, 2),
  ('aaaaaaaa-0010-4010-8010-000000000054', 'aaaaaaaa-0010-4010-8010-000000000023', E'研修の実施を省略する', false, 3)
ON CONFLICT (id) DO NOTHING;
