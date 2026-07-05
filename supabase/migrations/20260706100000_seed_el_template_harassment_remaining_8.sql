-- ハラスメント防止研修 残り8モジュール（テンプレート seed / STEP2b）
-- el_courses (template) + el_slides (text/quiz) + el_quiz_questions + el_quiz_options

-- なぜ今ハラスメント対策を学ぶのか
INSERT INTO public.el_courses (
  id, tenant_id, title, description, category, status, course_type,
  estimated_minutes, learning_objectives
) VALUES (
  'aaaaaaaa-0002-4002-8002-000000000001',
  NULL,
  E'なぜ今ハラスメント対策を学ぶのか',
  E'ハラスメント対策の法的義務と2026年10月義務化拡大の背景を理解します。',
  'コンプライアンス',
  'published',
  'template',
  30,
  ARRAY[
    E'ハラスメント対策が法的義務であることを理解する',
    E'対策を怠った場合のリスクを把握する',
    E'2026年10月の義務化拡大により対象範囲が広がることを知る'
  ]
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0002-4002-8002-000000000011', 'aaaaaaaa-0002-4002-8002-000000000001', 0, 'text', E'なぜ今学ぶのか', E'すべての企業に、職場におけるハラスメントを防止する法的義務があります。これはパワーハラスメント防止法（労働施策総合推進法）、男女雇用機会均等法、育児・介護休業法により、企業規模を問わず義務付けられています。「うちは小さい会社だから関係ない」は通用しません。

ハラスメント対策を怠ると、被害者への損害賠償責任、企業の社会的信用の失墜、人材の離職・採用難につながります。逆に、適切な対策を講じている企業は、従業員の安心感・生産性向上、そして人材確保の面で優位に立てます。

---
【字幕】職場のハラスメント防止は、企業規模を問わずすべての会社に課された法的義務です。対策を怠れば損害賠償や信用失墜のリスクがあります。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0002-4002-8002-000000000012', 'aaaaaaaa-0002-4002-8002-000000000001', 1, 'quiz', E'理解度チェック（セクション1）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0002-4002-8002-000000000013', 'aaaaaaaa-0002-4002-8002-000000000001', 2, 'text', E'4種類のハラスメント', E'本研修が扱う対象は、法律で防止措置が義務付けられている4種類のハラスメントです。パワーハラスメント（パワハラ）、セクシュアルハラスメント（セクハラ）、妊娠・出産・育児休業等に関するハラスメント（マタハラ）、そして育児・介護休業等の利用に関するハラスメント（育介ハラ）です。

これらはそれぞれ別の法律で規定されていますが、根底にある考え方は共通しています。「本人が意に反する言動によって、就業環境が害されること」です。この共通軸を理解しておくと、個別の判断がしやすくなります。

---
【字幕】法律で義務化されている4種類のハラスメント（パワハラ・セクハラ・マタハラ・育介ハラ）を扱います。共通軸は「意に反する言動による就業環境の悪化」です。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0002-4002-8002-000000000014', 'aaaaaaaa-0002-4002-8002-000000000001', 3, 'quiz', E'理解度チェック（セクション2）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0002-4002-8002-000000000015', 'aaaaaaaa-0002-4002-8002-000000000001', 4, 'text', E'2026年10月の義務化拡大', E'重要な変化があります。2026年10月から、カスタマーハラスメント（カスハラ）対策と、就職活動中の学生・インターン生に対するハラスメント対策が新たに義務化されます。これまでは従業員同士・上司部下間の関係が主な対象でしたが、今後は「社外の人物からの言動」「まだ入社していない人物への言動」にも会社の防止義務が及びます。

つまり、ハラスメント対策の対象は「社内の従業員間」から「会社の対外的な活動全体」へと広がっています。本研修は、この拡大後の全体像を先取りして学ぶことを目的としています。

---
【字幕】2026年10月から、カスハラ対策と就活生・インターン生へのハラスメント対策が新たに義務化されます。対象範囲は社内から対外的な活動全体へ広がります。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0002-4002-8002-000000000016', 'aaaaaaaa-0002-4002-8002-000000000001', 5, 'quiz', E'理解度チェック（セクション3）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0002-4002-8002-000000000021', 'aaaaaaaa-0002-4002-8002-000000000012', E'ハラスメント防止措置は、どの企業に義務付けられていますか？', 0, E'ハラスメント防止措置はパワハラ防止法・男女雇用機会均等法・育児介護休業法により、企業規模を問わずすべての事業者に義務付けられています。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0002-4002-8002-000000000031', 'aaaaaaaa-0002-4002-8002-000000000021', E'従業員100名以上の企業のみ', false, 0),
  ('aaaaaaaa-0002-4002-8002-000000000032', 'aaaaaaaa-0002-4002-8002-000000000021', E'上場企業のみ', false, 1),
  ('aaaaaaaa-0002-4002-8002-000000000033', 'aaaaaaaa-0002-4002-8002-000000000021', E'企業規模を問わずすべての企業', true, 2),
  ('aaaaaaaa-0002-4002-8002-000000000034', 'aaaaaaaa-0002-4002-8002-000000000021', E'過去にハラスメントが発生した企業のみ', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0002-4002-8002-000000000022', 'aaaaaaaa-0002-4002-8002-000000000014', E'本研修で扱う「法律で義務化されている4種類のハラスメント」に含まれないものはどれですか？', 0, E'カスハラは2026年10月から義務化される新たな対象であり、本研修で扱う「法律で既に義務化されている4種類」には含まれません。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0002-4002-8002-000000000041', 'aaaaaaaa-0002-4002-8002-000000000022', E'パワーハラスメント', false, 0),
  ('aaaaaaaa-0002-4002-8002-000000000042', 'aaaaaaaa-0002-4002-8002-000000000022', E'セクシュアルハラスメント', false, 1),
  ('aaaaaaaa-0002-4002-8002-000000000043', 'aaaaaaaa-0002-4002-8002-000000000022', E'カスタマーハラスメント', true, 2),
  ('aaaaaaaa-0002-4002-8002-000000000044', 'aaaaaaaa-0002-4002-8002-000000000022', E'妊娠・出産・育児休業等に関するハラスメント', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0002-4002-8002-000000000023', 'aaaaaaaa-0002-4002-8002-000000000016', E'2026年10月の義務化拡大で新たに対象となる関係性はどれですか？', 0, E'2026年10月から顧客・取引先から従業員への言動（カスハラ）と、就活生・インターン生への言動も会社の防止義務の対象となります。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0002-4002-8002-000000000051', 'aaaaaaaa-0002-4002-8002-000000000023', E'上司と部下の関係', false, 0),
  ('aaaaaaaa-0002-4002-8002-000000000052', 'aaaaaaaa-0002-4002-8002-000000000023', E'顧客と従業員の関係、および企業と就活生・インターン生の関係', true, 1),
  ('aaaaaaaa-0002-4002-8002-000000000053', 'aaaaaaaa-0002-4002-8002-000000000023', E'従業員同士の関係のみ', false, 2),
  ('aaaaaaaa-0002-4002-8002-000000000054', 'aaaaaaaa-0002-4002-8002-000000000023', E'経営者と株主の関係', false, 3)
ON CONFLICT (id) DO NOTHING;

-- ハラスメントの法的定義と全体像
INSERT INTO public.el_courses (
  id, tenant_id, title, description, category, status, course_type,
  estimated_minutes, learning_objectives
) VALUES (
  'aaaaaaaa-0003-4003-8003-000000000001',
  NULL,
  E'ハラスメントの法的定義と全体像',
  E'ハラスメント判断の3要素と適正な業務指導との境界を学びます。',
  'コンプライアンス',
  'published',
  'template',
  30,
  ARRAY[
    E'ハラスメントの法的な判断基準（3要素）を理解する',
    E'「適正な業務指導」と「ハラスメント」の境界を説明できる',
    E'単発の言動と繰り返される言動での判断の違いを理解する'
  ]
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0003-4003-8003-000000000011', 'aaaaaaaa-0003-4003-8003-000000000001', 0, 'text', E'判断基準3要素', E'ハラスメントかどうかを判断する際、法律・厚生労働省の指針では共通して3つの要素を確認します。①優位性を背景にした言動であること、②業務上必要かつ相当な範囲を超えていること、③労働者の就業環境が害されること。この3つが揃うと、ハラスメントと判断される可能性が高くなります。

逆に言えば、業務上必要かつ相当な範囲内であれば、多少厳しい指導であってもハラスメントには当たりません。ここが最も誤解されやすいポイントです。

---
【字幕】ハラスメントの判断基準は3要素です。優位性を背景にした言動、業務上必要かつ相当な範囲を超えること、就業環境が害されることです。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0003-4003-8003-000000000012', 'aaaaaaaa-0003-4003-8003-000000000001', 1, 'quiz', E'理解度チェック（セクション1）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0003-4003-8003-000000000013', 'aaaaaaaa-0003-4003-8003-000000000001', 2, 'text', E'手段・方法・頻度', E'「適正な業務指導」と「ハラスメント」を分けるのは、内容そのものではなく、手段・方法・頻度です。例えば、ミスを指摘すること自体は適正な指導です。しかし、人格を否定する言葉を使う、必要以上に長時間・大声で叱責する、他の社員の前で執拗に非難する、といった手段になると、ハラスメントに該当する可能性が高くなります。

つまり「何を指摘したか」ではなく「どう指摘したか」が問われます。

---
【字幕】適正な指導とハラスメントを分けるのは内容ではなく手段・方法・頻度です。「何を言ったか」より「どう言ったか」が問われます。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0003-4003-8003-000000000014', 'aaaaaaaa-0003-4003-8003-000000000001', 3, 'quiz', E'理解度チェック（セクション2）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0003-4003-8003-000000000015', 'aaaaaaaa-0003-4003-8003-000000000001', 4, 'text', E'単発と繰り返し', E'単発の言動か、繰り返される言動かによっても判断が変わります。強い言葉を一度だけ使った場合と、同様の言動を繰り返した場合では、繰り返しの方がハラスメントと認定されやすくなります。ただし、単発であっても、内容が極めて悪質（暴力・人格否定的な発言等）であれば、一度でもハラスメントと判断されることがあります。

「一度だから大丈夫」という考え方は危険です。内容の悪質性と頻度は、それぞれ独立して判断材料になります。

---
【字幕】単発でも内容が悪質であればハラスメントと判断されます。繰り返しは認定されやすくなる要素ですが、「一度だから大丈夫」ではありません。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0003-4003-8003-000000000016', 'aaaaaaaa-0003-4003-8003-000000000001', 5, 'quiz', E'理解度チェック（セクション3）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0003-4003-8003-000000000021', 'aaaaaaaa-0003-4003-8003-000000000012', E'ハラスメント判断の3要素に含まれないものはどれですか？', 0, E'ハラスメント判断の3要素は優位性・相当性・就業環境への害です。加害者が管理職であることは必須条件ではありません。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0003-4003-8003-000000000031', 'aaaaaaaa-0003-4003-8003-000000000021', E'優位性を背景にした言動であること', false, 0),
  ('aaaaaaaa-0003-4003-8003-000000000032', 'aaaaaaaa-0003-4003-8003-000000000021', E'業務上必要かつ相当な範囲を超えていること', false, 1),
  ('aaaaaaaa-0003-4003-8003-000000000033', 'aaaaaaaa-0003-4003-8003-000000000021', E'労働者の就業環境が害されること', false, 2),
  ('aaaaaaaa-0003-4003-8003-000000000034', 'aaaaaaaa-0003-4003-8003-000000000021', E'加害者が管理職であること', true, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0003-4003-8003-000000000022', 'aaaaaaaa-0003-4003-8003-000000000014', E'適正な業務指導とハラスメントを分ける最も重要な観点は何ですか？', 0, E'適正な業務指導とハラスメントを分けるのは「何を指摘したか」ではなく、手段・方法・頻度です。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0003-4003-8003-000000000041', 'aaaaaaaa-0003-4003-8003-000000000022', E'指摘した内容の正確さ', false, 0),
  ('aaaaaaaa-0003-4003-8003-000000000042', 'aaaaaaaa-0003-4003-8003-000000000022', E'指摘した手段・方法・頻度', true, 1),
  ('aaaaaaaa-0003-4003-8003-000000000043', 'aaaaaaaa-0003-4003-8003-000000000022', E'指摘した時間帯', false, 2),
  ('aaaaaaaa-0003-4003-8003-000000000044', 'aaaaaaaa-0003-4003-8003-000000000022', E'指摘した相手の年齢', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0003-4003-8003-000000000023', 'aaaaaaaa-0003-4003-8003-000000000016', E'単発の言動についての正しい理解はどれですか？', 0, E'単発であっても暴力や人格否定など内容が極めて悪質であれば、ハラスメントと判断される場合があります。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0003-4003-8003-000000000051', 'aaaaaaaa-0003-4003-8003-000000000023', E'単発であれば絶対にハラスメントにならない', false, 0),
  ('aaaaaaaa-0003-4003-8003-000000000052', 'aaaaaaaa-0003-4003-8003-000000000023', E'内容が悪質であれば単発でもハラスメントと判断される場合がある', true, 1),
  ('aaaaaaaa-0003-4003-8003-000000000053', 'aaaaaaaa-0003-4003-8003-000000000023', E'繰り返しがなければ会社に責任は発生しない', false, 2),
  ('aaaaaaaa-0003-4003-8003-000000000054', 'aaaaaaaa-0003-4003-8003-000000000023', E'単発の言動は指導記録に残す必要がない', false, 3)
ON CONFLICT (id) DO NOTHING;

-- マタニティハラスメント（マタハラ）
INSERT INTO public.el_courses (
  id, tenant_id, title, description, category, status, course_type,
  estimated_minutes, learning_objectives
) VALUES (
  'aaaaaaaa-0004-4004-8004-000000000001',
  NULL,
  E'マタニティハラスメント（マタハラ）',
  E'マタハラの2類型と本人意向確認の重要性を学びます。',
  'コンプライアンス',
  'published',
  'template',
  30,
  ARRAY[
    E'マタハラの2つの型を理解する',
    E'妊娠・出産を理由とした不利益取扱いの具体例を把握する',
    E'本人の意向確認の重要性を理解する'
  ]
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0004-4004-8004-000000000011', 'aaaaaaaa-0004-4004-8004-000000000001', 0, 'text', E'マタハラの2類型', E'マタニティハラスメントは、男女雇用機会均等法・育児・介護休業法により防止措置が義務付けられています。大きく2つの型に分かれます。「制度等の利用への嫌がらせ型」は、産前産後休業や時短勤務などの制度利用に対して嫌がらせを行うもの。「状態への嫌がらせ型」は、妊娠・出産そのものを理由に嫌がらせを行うものです。

例えば「産休を取るなら辞めてもらう」は制度利用への嫌がらせ型、「妊娠するなんて迷惑だ」は状態への嫌がらせ型に該当します。

---
【字幕】マタハラには2つの型があります。制度利用への嫌がらせ型と、妊娠・出産という状態そのものへの嫌がらせ型です。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0004-4004-8004-000000000012', 'aaaaaaaa-0004-4004-8004-000000000001', 1, 'quiz', E'理解度チェック（セクション1）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0004-4004-8004-000000000013', 'aaaaaaaa-0004-4004-8004-000000000001', 2, 'text', E'不利益取扱いの禁止', E'妊娠・出産・育児休業の取得等を理由とした解雇・降格・減給・不利益な配置転換は、明確に法律で禁止されています。これは「嫌がらせのつもりはなかった」という言い訳が通用しない領域です。人事評価やシフト配置の判断に、妊娠・出産の事実を反映させることそのものが違法となり得ます。

一方で、業務上の必要性から生じる配置変更（本人の健康を考慮した安全配慮としての配置転換等）は、これに該当しません。本人の意向を確認し、合意形成を図ることが重要です。

---
【字幕】妊娠・出産・育休取得を理由とした解雇・降格・不利益な配置転換は法律で禁止されています。安全配慮としての配置転換とは区別されます。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0004-4004-8004-000000000014', 'aaaaaaaa-0004-4004-8004-000000000001', 3, 'quiz', E'理解度チェック（セクション2）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0004-4004-8004-000000000015', 'aaaaaaaa-0004-4004-8004-000000000001', 4, 'text', E'本人意向確認', E'マタハラ防止で管理職が最も注意すべきは、「良かれと思った配慮」が本人の意向を無視した一方的な決定になっていないか、という点です。例えば「大変だろうから担当を外す」という判断も、本人に確認せず一方的に行えば、不利益取扱いと受け取られる可能性があります。

対策の基本は「本人の意向確認」です。制度利用の判断も業務内容の調整も、必ず本人と話し合ってから決めることが、マタハラ防止の第一歩になります。

---
【字幕】「良かれと思った配慮」も本人の意向確認なしに一方的に行えばマタハラになり得ます。決定前に必ず本人と話し合うことが基本です。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0004-4004-8004-000000000016', 'aaaaaaaa-0004-4004-8004-000000000001', 5, 'quiz', E'理解度チェック（セクション3）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0004-4004-8004-000000000021', 'aaaaaaaa-0004-4004-8004-000000000012', E'「産休を取るなら辞めてもらう」という発言は、どちらの型のマタハラに該当しますか？', 0, E'「産休を取るなら辞めてもらう」は、産休制度の利用を嫌がらせる「制度等の利用への嫌がらせ型」に該当します。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0004-4004-8004-000000000031', 'aaaaaaaa-0004-4004-8004-000000000021', E'制度等の利用への嫌がらせ型', true, 0),
  ('aaaaaaaa-0004-4004-8004-000000000032', 'aaaaaaaa-0004-4004-8004-000000000021', E'状態への嫌がらせ型', false, 1),
  ('aaaaaaaa-0004-4004-8004-000000000033', 'aaaaaaaa-0004-4004-8004-000000000021', E'どちらにも該当しない', false, 2),
  ('aaaaaaaa-0004-4004-8004-000000000034', 'aaaaaaaa-0004-4004-8004-000000000021', E'パワーハラスメントであり、マタハラではない', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0004-4004-8004-000000000022', 'aaaaaaaa-0004-4004-8004-000000000014', E'妊娠を理由とした不利益取扱いについて、正しい説明はどれですか？', 0, E'妊娠・出産等を理由とした解雇・降格・不利益な配置転換は禁止されますが、本人の健康を考慮した安全配慮としての配置転換とは区別されます。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0004-4004-8004-000000000041', 'aaaaaaaa-0004-4004-8004-000000000022', E'嫌がらせの意図がなければ問題ない', false, 0),
  ('aaaaaaaa-0004-4004-8004-000000000042', 'aaaaaaaa-0004-4004-8004-000000000022', E'安全配慮としての配置転換も含め、すべて違法である', false, 1),
  ('aaaaaaaa-0004-4004-8004-000000000043', 'aaaaaaaa-0004-4004-8004-000000000022', E'解雇・降格・不利益な配置転換等は法律で禁止されているが、安全配慮としての配置転換とは区別される', true, 2),
  ('aaaaaaaa-0004-4004-8004-000000000044', 'aaaaaaaa-0004-4004-8004-000000000022', E'本人が同意していなくても、会社が必要と判断すれば実施してよい', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0004-4004-8004-000000000023', 'aaaaaaaa-0004-4004-8004-000000000016', E'マタハラ防止のために管理職が最も重視すべきことは何ですか？', 0, E'「良かれと思った配慮」も本人の意向確認なしに一方的に行えば不利益取扱いと受け取られ得ます。決定前の話し合いが基本です。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0004-4004-8004-000000000051', 'aaaaaaaa-0004-4004-8004-000000000023', E'妊娠した従業員をできるだけ業務から外すこと', false, 0),
  ('aaaaaaaa-0004-4004-8004-000000000052', 'aaaaaaaa-0004-4004-8004-000000000023', E'決定を下す前に必ず本人の意向を確認すること', true, 1),
  ('aaaaaaaa-0004-4004-8004-000000000053', 'aaaaaaaa-0004-4004-8004-000000000023', E'他の従業員に知らせず内密に処理すること', false, 2),
  ('aaaaaaaa-0004-4004-8004-000000000054', 'aaaaaaaa-0004-4004-8004-000000000023', E'人事評価を一時的に保留すること', false, 3)
ON CONFLICT (id) DO NOTHING;

-- 育児・介護ハラスメント（育介ハラ）
INSERT INTO public.el_courses (
  id, tenant_id, title, description, category, status, course_type,
  estimated_minutes, learning_objectives
) VALUES (
  'aaaaaaaa-0005-4005-8005-000000000001',
  NULL,
  E'育児・介護ハラスメント（育介ハラ）',
  E'育児・介護休業法上のハラスメント防止義務と配慮点を学びます。',
  'コンプライアンス',
  'published',
  'template',
  30,
  ARRAY[
    E'育児・介護休業法上のハラスメント防止義務を理解する',
    E'男性従業員の育児休業取得に関する保護を理解する',
    E'介護休業取得者への配慮点を理解する'
  ]
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0005-4005-8005-000000000011', 'aaaaaaaa-0005-4005-8005-000000000001', 0, 'text', E'育介ハラの概要', E'育児・介護休業等の制度利用に対する嫌がらせは、育児・介護休業法により防止措置が義務付けられています。これはマタハラの「制度等の利用への嫌がらせ型」と重なる部分もありますが、対象が男女両方、かつ介護休業も含む点が特徴です。

「男性が育休を取るなんて」「介護なら親族に任せればいい」といった発言は、制度の利用を萎縮させるハラスメントに該当します。

---
【字幕】育児・介護休業法は、育休・介護休業等の制度利用への嫌がらせを男女問わず禁止しています。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0005-4005-8005-000000000012', 'aaaaaaaa-0005-4005-8005-000000000001', 1, 'quiz', E'理解度チェック（セクション1）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0005-4005-8005-000000000013', 'aaaaaaaa-0005-4005-8005-000000000001', 2, 'text', E'男性の育休取得', E'特に重要なのが、男性従業員の育児休業取得に関する保護です。近年、男性の育休取得推進が政策的に進められていますが、現場では「男性が育休を取ると業務に支障が出る」「女性が取るものだろう」という発言・対応が根強く残っています。

これらは制度の趣旨に反するだけでなく、育児・介護休業法上のハラスメントに該当する可能性があります。育休取得を理由とした不利益な人事評価・配置転換も同様に禁止されています。

---
【字幕】男性従業員の育児休業取得も法律で保護されています。「男性が取るのはおかしい」という発言・対応はハラスメントに該当する可能性があります。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0005-4005-8005-000000000014', 'aaaaaaaa-0005-4005-8005-000000000001', 3, 'quiz', E'理解度チェック（セクション2）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0005-4005-8005-000000000015', 'aaaaaaaa-0005-4005-8005-000000000001', 4, 'text', E'介護休業への配慮', E'介護休業についても同様の配慮が必要です。介護は育児と異なり、期間の見通しが立てにくく、当事者が声を上げにくい特性があります。「まだ大丈夫だろう」という決めつけや、介護を理由にした重要な業務からの外し（本人の意向を確認しないもの）は、育介ハラに該当し得ます。

管理職としては、制度の利用を歓迎する姿勢を明確に示し、利用しやすい職場環境を作ることが防止策の基本です。

---
【字幕】介護休業も同様に保護されます。決めつけによる業務からの一方的な除外は育介ハラに該当し得ます。制度利用を歓迎する姿勢が防止策の基本です。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0005-4005-8005-000000000016', 'aaaaaaaa-0005-4005-8005-000000000001', 5, 'quiz', E'理解度チェック（セクション3）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0005-4005-8005-000000000021', 'aaaaaaaa-0005-4005-8005-000000000012', E'育児・介護休業法上のハラスメント防止義務の対象について、正しい説明はどれですか？', 0, E'育児・介護休業法の防止義務は、男女を問わず育児・介護休業等の制度利用への嫌がらせを対象とします。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0005-4005-8005-000000000031', 'aaaaaaaa-0005-4005-8005-000000000021', E'女性従業員の育児休業取得のみが対象', false, 0),
  ('aaaaaaaa-0005-4005-8005-000000000032', 'aaaaaaaa-0005-4005-8005-000000000021', E'男女問わず、育児・介護休業等の制度利用が対象', true, 1),
  ('aaaaaaaa-0005-4005-8005-000000000033', 'aaaaaaaa-0005-4005-8005-000000000021', E'管理職の育児休業取得のみが対象', false, 2),
  ('aaaaaaaa-0005-4005-8005-000000000034', 'aaaaaaaa-0005-4005-8005-000000000021', E'介護休業は対象に含まれない', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0005-4005-8005-000000000022', 'aaaaaaaa-0005-4005-8005-000000000014', E'「男性が育休を取るなんて」という発言について、正しい説明はどれですか？', 0, E'男性の育児休業取得も法律で保護されており、「男性が取るのはおかしい」という発言はハラスメントに該当する可能性があります。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0005-4005-8005-000000000041', 'aaaaaaaa-0005-4005-8005-000000000022', E'個人の意見の範囲であり問題ない', false, 0),
  ('aaaaaaaa-0005-4005-8005-000000000042', 'aaaaaaaa-0005-4005-8005-000000000022', E'男性の育児休業取得は保護されており、この発言はハラスメントに該当する可能性がある', true, 1),
  ('aaaaaaaa-0005-4005-8005-000000000043', 'aaaaaaaa-0005-4005-8005-000000000022', E'業務上の懸念であれば問題ない', false, 2),
  ('aaaaaaaa-0005-4005-8005-000000000044', 'aaaaaaaa-0005-4005-8005-000000000022', E'経営者が発言する場合のみ問題になる', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0005-4005-8005-000000000023', 'aaaaaaaa-0005-4005-8005-000000000016', E'介護休業取得者への対応で避けるべきことはどれですか？', 0, E'本人の意向を確認せず一方的に重要な業務から外すことは、介護休業取得者への不適切な対応となり得ます。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0005-4005-8005-000000000051', 'aaaaaaaa-0005-4005-8005-000000000023', E'業務内容について本人と相談する', false, 0),
  ('aaaaaaaa-0005-4005-8005-000000000052', 'aaaaaaaa-0005-4005-8005-000000000023', E'制度の利用を歓迎する姿勢を示す', false, 1),
  ('aaaaaaaa-0005-4005-8005-000000000053', 'aaaaaaaa-0005-4005-8005-000000000023', E'本人の意向を確認せず一方的に重要な業務から外す', true, 2),
  ('aaaaaaaa-0005-4005-8005-000000000054', 'aaaaaaaa-0005-4005-8005-000000000023', E'復帰後の業務調整について事前に話し合う', false, 3)
ON CONFLICT (id) DO NOTHING;

-- アウティングとプライバシー侵害
INSERT INTO public.el_courses (
  id, tenant_id, title, description, category, status, course_type,
  estimated_minutes, learning_objectives
) VALUES (
  'aaaaaaaa-0006-4006-8006-000000000001',
  NULL,
  E'アウティングとプライバシー侵害',
  E'職場におけるアウティングの定義と防止策を学びます。',
  'コンプライアンス',
  'published',
  'template',
  30,
  ARRAY[
    E'アウティングの定義とハラスメントとしての位置づけを理解する',
    E'性的指向・性自認に関する情報の取り扱いの重要性を理解する',
    E'本人の同意のない情報開示のリスクを理解する'
  ]
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0006-4006-8006-000000000011', 'aaaaaaaa-0006-4006-8006-000000000001', 0, 'text', E'アウティングとは', E'アウティングとは、本人の同意なく、性的指向や性自認等のセンシティブな個人情報を第三者に開示することです。厚生労働省の指針では、パワーハラスメントの一類型として位置づけられており、企業に防止措置が義務付けられています。

例えば、本人から相談を受けた上司が、確認なく他の社員に「実は〇〇さんは……」と話してしまうことは、悪意がなくてもアウティングに該当します。

---
【字幕】アウティングとは、本人の同意なく性的指向・性自認等の情報を第三者に開示することです。パワーハラスメントの一類型として防止義務の対象です。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0006-4006-8006-000000000012', 'aaaaaaaa-0006-4006-8006-000000000001', 1, 'quiz', E'理解度チェック（セクション1）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0006-4006-8006-000000000013', 'aaaaaaaa-0006-4006-8006-000000000001', 2, 'text', E'開示のリスク', E'アウティングが問題となるのは、情報の性質上、開示された本人が職場での人間関係・評価・安全に深刻な影響を受けるためです。一度開示された情報は取り消すことができず、本人の意図しない形で職場全体に広がるリスクがあります。

管理職が相談を受けた場合、最も重要なのは「誰に、どこまで共有してよいか」を本人に確認することです。人事部門への報告が必要な場合でも、範囲と方法について本人の同意を得ることが原則です。

---
【字幕】アウティングは一度起きると取り消せません。相談を受けた際は「誰に、どこまで共有してよいか」を必ず本人に確認することが原則です。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0006-4006-8006-000000000014', 'aaaaaaaa-0006-4006-8006-000000000001', 3, 'quiz', E'理解度チェック（セクション2）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0006-4006-8006-000000000015', 'aaaaaaaa-0006-4006-8006-000000000001', 4, 'text', E'組織としての防止策', E'アウティングを防ぐためには、相談を受けた個人だけでなく、組織全体でセンシティブ情報の取り扱いルールを明確にしておく必要があります。相談窓口の担当者が守秘義務を徹底すること、必要最小限の範囲でのみ情報を共有すること、そして「なぜ共有が必要か」を本人に説明し理解を得ることが基本です。

「良かれと思って共有した」という動機は、アウティングの違法性・不適切性を否定する理由にはなりません。

---
【字幕】組織全体でセンシティブ情報の取扱いルールを明確にすることが防止策です。「良かれと思って」という動機は言い訳になりません。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0006-4006-8006-000000000016', 'aaaaaaaa-0006-4006-8006-000000000001', 5, 'quiz', E'理解度チェック（セクション3）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0006-4006-8006-000000000021', 'aaaaaaaa-0006-4006-8006-000000000012', E'アウティングの定義として正しいものはどれですか？', 0, E'アウティングとは、本人の同意なく性的指向・性自認等のセンシティブな情報を第三者に開示することです。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0006-4006-8006-000000000031', 'aaaaaaaa-0006-4006-8006-000000000021', E'本人の同意なく性的指向・性自認等の情報を第三者に開示すること', true, 0),
  ('aaaaaaaa-0006-4006-8006-000000000032', 'aaaaaaaa-0006-4006-8006-000000000021', E'本人の許可を得て情報を共有すること', false, 1),
  ('aaaaaaaa-0006-4006-8006-000000000033', 'aaaaaaaa-0006-4006-8006-000000000021', E'業務上必要な情報を人事部門に報告すること', false, 2),
  ('aaaaaaaa-0006-4006-8006-000000000034', 'aaaaaaaa-0006-4006-8006-000000000021', E'個人情報を匿名化して統計処理すること', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0006-4006-8006-000000000022', 'aaaaaaaa-0006-4006-8006-000000000014', E'相談を受けた上司が最も注意すべきことは何ですか？', 0, E'相談を受けた際は、誰に・どこまで共有してよいかを必ず本人に確認することが原則です。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0006-4006-8006-000000000041', 'aaaaaaaa-0006-4006-8006-000000000022', E'できるだけ多くの人に共有し、対応を検討してもらう', false, 0),
  ('aaaaaaaa-0006-4006-8006-000000000042', 'aaaaaaaa-0006-4006-8006-000000000022', E'誰に、どこまで共有してよいかを本人に確認する', true, 1),
  ('aaaaaaaa-0006-4006-8006-000000000043', 'aaaaaaaa-0006-4006-8006-000000000022', E'自分の判断だけで対応方針を決める', false, 2),
  ('aaaaaaaa-0006-4006-8006-000000000044', 'aaaaaaaa-0006-4006-8006-000000000022', E'本人に確認せず速やかに人事部門へ報告する', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0006-4006-8006-000000000023', 'aaaaaaaa-0006-4006-8006-000000000016', E'「良かれと思って情報を共有した」という動機について、正しい説明はどれですか？', 0, E'動機が善意であっても、本人の同意のない情報開示はアウティングに該当し得ます。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0006-4006-8006-000000000051', 'aaaaaaaa-0006-4006-8006-000000000023', E'動機が善意であればアウティングには該当しない', false, 0),
  ('aaaaaaaa-0006-4006-8006-000000000052', 'aaaaaaaa-0006-4006-8006-000000000023', E'動機の善意・悪意にかかわらず、同意のない開示はアウティングに該当し得る', true, 1),
  ('aaaaaaaa-0006-4006-8006-000000000053', 'aaaaaaaa-0006-4006-8006-000000000023', E'管理職であれば動機を問わず開示が許される', false, 2),
  ('aaaaaaaa-0006-4006-8006-000000000054', 'aaaaaaaa-0006-4006-8006-000000000023', E'人事評価に関わる場合のみ問題になる', false, 3)
ON CONFLICT (id) DO NOTHING;

-- アンコンシャス・バイアスとハラスメントの関係
INSERT INTO public.el_courses (
  id, tenant_id, title, description, category, status, course_type,
  estimated_minutes, learning_objectives
) VALUES (
  'aaaaaaaa-0007-4007-8007-000000000001',
  NULL,
  E'アンコンシャス・バイアスとハラスメントの関係',
  E'無意識の偏見とハラスメントの関係を学びます。',
  'コンプライアンス',
  'published',
  'template',
  30,
  ARRAY[
    E'アンコンシャス・バイアス（無意識の偏見）の概念を理解する',
    E'職場でよくあるバイアスの具体例を知る',
    E'バイアスに気づき、言動を見直す視点を持つ'
  ]
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0007-4007-8007-000000000011', 'aaaaaaaa-0007-4007-8007-000000000001', 0, 'text', E'無意識の偏見', E'アンコンシャス・バイアスとは、本人が自覚していない偏見や思い込みのことです。「女性は細かい仕事が得意」「若手は責任のある仕事はまだ早い」「育児中の女性は重要な仕事を任せられない」といった思い込みは、多くの場合、悪意ではなく無意識のうちに形成されています。

ハラスメントの多くは、明確な悪意からではなく、こうした無意識の偏見に基づく言動から発生します。だからこそ、バイアスの存在に気づくこと自体が、ハラスメント防止の重要な第一歩になります。

---
【字幕】アンコンシャス・バイアスとは無意識の偏見・思い込みです。ハラスメントの多くは悪意ではなく、こうした無意識の偏見から発生します。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0007-4007-8007-000000000012', 'aaaaaaaa-0007-4007-8007-000000000001', 1, 'quiz', E'理解度チェック（セクション1）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0007-4007-8007-000000000013', 'aaaaaaaa-0007-4007-8007-000000000001', 2, 'text', E'職場のバイアス例', E'職場でよく見られるバイアスには、性別に基づくもの（「男性は育児より仕事優先だろう」）、年齢に基づくもの（「年配社員は新しいシステムに対応できない」）、雇用形態に基づくもの（「非正規社員は責任のある発言をすべきでない」）などがあります。

これらのバイアスは、業務の割り振り、評価、育成機会の提供において、意図せず不公平な扱いを生み出します。結果として、これがマタハラ・パワハラ等の具体的なハラスメント言動につながることもあります。

---
【字幕】性別・年齢・雇用形態に関するバイアスは、業務割り振りや評価に無意識の不公平を生み、具体的なハラスメントにつながることがあります。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0007-4007-8007-000000000014', 'aaaaaaaa-0007-4007-8007-000000000001', 3, 'quiz', E'理解度チェック（セクション2）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0007-4007-8007-000000000015', 'aaaaaaaa-0007-4007-8007-000000000001', 4, 'text', E'バイアスへの気づき', E'バイアスを完全になくすことは容易ではありませんが、「自分の判断にバイアスが影響していないか」を一度立ち止まって考える習慣を持つことで、多くの言動を見直すことができます。特に、人事評価・業務アサイン・登用の判断をする際は、「その判断は本人の実績・能力に基づいているか、それとも属性に基づく思い込みではないか」を自問することが有効です。

管理職研修において、アンコンシャス・バイアスへの理解は、ハラスメント防止の土台となる重要なテーマです。

---
【字幕】判断の前に「バイアスが影響していないか」を自問する習慣が有効です。属性に基づく思い込みか、実績・能力に基づく判断かを区別しましょう。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0007-4007-8007-000000000016', 'aaaaaaaa-0007-4007-8007-000000000001', 5, 'quiz', E'理解度チェック（セクション3）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0007-4007-8007-000000000021', 'aaaaaaaa-0007-4007-8007-000000000012', E'アンコンシャス・バイアスの説明として正しいものはどれですか？', 0, E'アンコンシャス・バイアスとは、本人が自覚していない偏見や思い込みのことです。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0007-4007-8007-000000000031', 'aaaaaaaa-0007-4007-8007-000000000021', E'意図的に行う差別的な言動', false, 0),
  ('aaaaaaaa-0007-4007-8007-000000000032', 'aaaaaaaa-0007-4007-8007-000000000021', E'本人が自覚していない偏見・思い込み', true, 1),
  ('aaaaaaaa-0007-4007-8007-000000000033', 'aaaaaaaa-0007-4007-8007-000000000021', E'法律で明確に定義された概念', false, 2),
  ('aaaaaaaa-0007-4007-8007-000000000034', 'aaaaaaaa-0007-4007-8007-000000000021', E'特定の世代にのみ見られる現象', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0007-4007-8007-000000000022', 'aaaaaaaa-0007-4007-8007-000000000014', E'職場でのバイアスの例として適切でないものはどれですか？', 0, E'本人の実績データに基づく人事評価は客観的な判断であり、無意識の偏見（バイアス）ではありません。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0007-4007-8007-000000000041', 'aaaaaaaa-0007-4007-8007-000000000022', E'「男性は育児より仕事優先だろう」という思い込み', false, 0),
  ('aaaaaaaa-0007-4007-8007-000000000042', 'aaaaaaaa-0007-4007-8007-000000000022', E'「年配社員は新しいシステムに対応できない」という思い込み', false, 1),
  ('aaaaaaaa-0007-4007-8007-000000000043', 'aaaaaaaa-0007-4007-8007-000000000022', E'本人の実績データに基づいた人事評価', true, 2),
  ('aaaaaaaa-0007-4007-8007-000000000044', 'aaaaaaaa-0007-4007-8007-000000000022', E'「非正規社員は責任のある発言をすべきでない」という思い込み', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0007-4007-8007-000000000023', 'aaaaaaaa-0007-4007-8007-000000000016', E'バイアスに気づくための有効な自問はどれですか？', 0, E'判断が本人の実績・能力に基づくか、属性に基づく思い込みではないかを自問することが有効です。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0007-4007-8007-000000000051', 'aaaaaaaa-0007-4007-8007-000000000023', E'「この判断は多数決で決めたか」', false, 0),
  ('aaaaaaaa-0007-4007-8007-000000000052', 'aaaaaaaa-0007-4007-8007-000000000023', E'「その判断は本人の実績・能力に基づいているか、それとも属性に基づく思い込みではないか」', true, 1),
  ('aaaaaaaa-0007-4007-8007-000000000053', 'aaaaaaaa-0007-4007-8007-000000000023', E'「この判断は上司の指示に従っているか」', false, 2),
  ('aaaaaaaa-0007-4007-8007-000000000054', 'aaaaaaaa-0007-4007-8007-000000000023', E'「この判断は過去の慣例と同じか」', false, 3)
ON CONFLICT (id) DO NOTHING;

-- カスタマーハラスメント（カスハラ）
INSERT INTO public.el_courses (
  id, tenant_id, title, description, category, status, course_type,
  estimated_minutes, learning_objectives
) VALUES (
  'aaaaaaaa-0008-4008-8008-000000000001',
  NULL,
  E'カスタマーハラスメント（カスハラ）',
  E'2026年10月義務化のカスハラ対策の要点を学びます。',
  'コンプライアンス',
  'published',
  'template',
  30,
  ARRAY[
    E'カスハラの定義と、2026年10月からの義務化内容を理解する',
    E'カスハラと正当なクレームの違いを理解する',
    E'会社としての対応体制の必要性を理解する'
  ]
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0008-4008-8008-000000000011', 'aaaaaaaa-0008-4008-8008-000000000001', 0, 'text', E'カスハラとは', E'カスタマーハラスメントとは、顧客・取引先等が、社会通念上不相当な言動により、従業員の就業環境を害することです。2026年10月から、企業にはカスハラに対する防止措置が新たに義務付けられます。これまでハラスメント対策の対象は主に社内の関係でしたが、これにより「お客様」からの言動も会社が対応すべき対象になります。

カスハラの具体例には、長時間の拘束、大声での威圧、土下座の要求、SNSでの誹謗中傷、金銭要求等が含まれます。

---
【字幕】カスタマーハラスメントは2026年10月から防止措置が義務化されます。顧客・取引先からの不相当な言動から従業員を守る義務が新たに生じます。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0008-4008-8008-000000000012', 'aaaaaaaa-0008-4008-8008-000000000001', 1, 'quiz', E'理解度チェック（セクション1）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0008-4008-8008-000000000013', 'aaaaaaaa-0008-4008-8008-000000000001', 2, 'text', E'正当なクレームとの違い', E'カスハラと正当なクレームの違いは、要求の内容自体ではなく、その手段・態様にあります。商品・サービスの不備を指摘し、改善や返金を求めることは正当な権利行使です。しかし、その伝え方が大声での威圧、長時間の拘束、人格を否定する発言、過大な要求（内容に対して社会通念上不相当な代償の要求）になると、カスハラに該当します。

従業員が「お客様だから」という理由だけで、不当な要求や言動を一方的に受け入れる必要はありません。

---
【字幕】カスハラと正当なクレームの違いは要求内容ではなく手段・態様です。「お客様だから」という理由だけで不当な言動を受け入れる必要はありません。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0008-4008-8008-000000000014', 'aaaaaaaa-0008-4008-8008-000000000001', 3, 'quiz', E'理解度チェック（セクション2）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0008-4008-8008-000000000015', 'aaaaaaaa-0008-4008-8008-000000000001', 4, 'text', E'企業の対応体制', E'2026年10月の義務化に向けて、企業が整備すべき体制には、相談窓口の設置、対応マニュアルの作成、従業員への注意喚起・研修、そして深刻なケースにおける従業員の安全確保（一人で対応させない、必要に応じて対応を打ち切る権限を与える等）が含まれます。

従業員を守る体制がないまま「我慢して対応してください」という姿勢を続けることは、企業の防止義務違反にもつながりかねません。

---
【字幕】相談窓口・対応マニュアル・研修・従業員の安全確保が企業に求められます。「我慢して対応」という姿勢は防止義務違反につながる可能性があります。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0008-4008-8008-000000000016', 'aaaaaaaa-0008-4008-8008-000000000001', 5, 'quiz', E'理解度チェック（セクション3）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0008-4008-8008-000000000021', 'aaaaaaaa-0008-4008-8008-000000000012', E'カスタマーハラスメント対策が企業に義務化されるのはいつからですか？', 0, E'カスタマーハラスメント対策の義務化は2026年10月から開始されます。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0008-4008-8008-000000000031', 'aaaaaaaa-0008-4008-8008-000000000021', E'2025年4月から', false, 0),
  ('aaaaaaaa-0008-4008-8008-000000000032', 'aaaaaaaa-0008-4008-8008-000000000021', E'2026年10月から', true, 1),
  ('aaaaaaaa-0008-4008-8008-000000000033', 'aaaaaaaa-0008-4008-8008-000000000021', E'2027年4月から', false, 2),
  ('aaaaaaaa-0008-4008-8008-000000000034', 'aaaaaaaa-0008-4008-8008-000000000021', E'すでに義務化されている', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0008-4008-8008-000000000022', 'aaaaaaaa-0008-4008-8008-000000000014', E'カスハラと正当なクレームを分ける最も重要な観点は何ですか？', 0, E'カスハラと正当なクレームの違いは要求内容ではなく、その手段・態様（威圧・拘束・人格否定等）にあります。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0008-4008-8008-000000000041', 'aaaaaaaa-0008-4008-8008-000000000022', E'要求の内容そのもの', false, 0),
  ('aaaaaaaa-0008-4008-8008-000000000042', 'aaaaaaaa-0008-4008-8008-000000000022', E'要求の手段・態様', true, 1),
  ('aaaaaaaa-0008-4008-8008-000000000043', 'aaaaaaaa-0008-4008-8008-000000000022', E'顧客の年齢', false, 2),
  ('aaaaaaaa-0008-4008-8008-000000000044', 'aaaaaaaa-0008-4008-8008-000000000022', E'クレームの件数', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0008-4008-8008-000000000023', 'aaaaaaaa-0008-4008-8008-000000000016', E'カスハラ対策として企業が整備すべき体制に含まれないものはどれですか？', 0, E'従業員一人に最後まで対応を担わせる方針は安全確保に反し、企業が整備すべき体制には含まれません。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0008-4008-8008-000000000051', 'aaaaaaaa-0008-4008-8008-000000000023', E'相談窓口の設置', false, 0),
  ('aaaaaaaa-0008-4008-8008-000000000052', 'aaaaaaaa-0008-4008-8008-000000000023', E'対応マニュアルの作成', false, 1),
  ('aaaaaaaa-0008-4008-8008-000000000053', 'aaaaaaaa-0008-4008-8008-000000000023', E'従業員一人に最後まで対応を担わせる方針の徹底', true, 2),
  ('aaaaaaaa-0008-4008-8008-000000000054', 'aaaaaaaa-0008-4008-8008-000000000023', E'従業員への注意喚起・研修', false, 3)
ON CONFLICT (id) DO NOTHING;

-- 就活生・インターン生へのハラスメント防止
INSERT INTO public.el_courses (
  id, tenant_id, title, description, category, status, course_type,
  estimated_minutes, learning_objectives
) VALUES (
  'aaaaaaaa-0009-4009-8009-000000000001',
  NULL,
  E'就活生・インターン生へのハラスメント防止',
  E'就活生・インターン生へのハラスメント防止義務を学びます。',
  'コンプライアンス',
  'published',
  'template',
  30,
  ARRAY[
    E'就活生・インターン生に対するハラスメント防止の義務化内容を理解する',
    E'就活セクハラ・パワハラの具体例を理解する',
    E'採用担当者・現場社員が注意すべき点を理解する'
  ]
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0009-4009-8009-000000000011', 'aaaaaaaa-0009-4009-8009-000000000001', 0, 'text', E'義務化の背景', E'2026年10月から、就職活動中の学生やインターン生に対するハラスメント防止措置も企業に義務付けられます。これまでは自社の従業員間の関係が主な対象でしたが、今後は「まだ入社していない、これから採用される可能性のある人物」への言動にも会社の防止義務が及びます。

背景には、就職活動中の学生が、採用担当者や面接官という「優位な立場」にある相手からハラスメントを受けても、内定への影響を恐れて声を上げにくいという構造的な問題があります。

---
【字幕】2026年10月から、就活生・インターン生へのハラスメント防止も義務化されます。採用の場という優位性を背景にした言動から学生を守る義務が生じます。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0009-4009-8009-000000000012', 'aaaaaaaa-0009-4009-8009-000000000001', 1, 'quiz', E'理解度チェック（セクション1）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0009-4009-8009-000000000013', 'aaaaaaaa-0009-4009-8009-000000000001', 2, 'text', E'具体例', E'具体例には、面接中の不適切な身体的接触の要求、私的な連絡先の要求や食事への誘い（就活セクハラ）、内定と引き換えにした過度な要求、面接での人格否定的な発言や威圧的な態度（就活パワハラ）が含まれます。

インターンシップにおいても、指導や評価と称した過度な叱責、業務範囲を超えた私的な用事の依頼等が、ハラスメントに該当する可能性があります。

---
【字幕】就活セクハラ（私的な連絡先要求、食事への誘い等）、就活パワハラ（人格否定的な発言、威圧的な態度等）が具体例です。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0009-4009-8009-000000000014', 'aaaaaaaa-0009-4009-8009-000000000001', 3, 'quiz', E'理解度チェック（セクション2）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title, content)
VALUES (
  'aaaaaaaa-0009-4009-8009-000000000015', 'aaaaaaaa-0009-4009-8009-000000000001', 4, 'text', E'採用担当者の意識', E'採用担当者や面接に関わる現場社員は、自分が学生にとって「内定を左右する立場」にあることを常に意識する必要があります。学生の反応が薦められた通りでなくても、それを理由に評価を下げることや、私的な関係を求めることは許されません。

企業としては、面接・インターンシップの実施要領に、学生対応に関する明確なルールを盛り込み、複数人での面接実施、面談内容の記録、相談窓口の周知等を整備することが求められます。

---
【字幕】採用担当者は「内定を左右する立場」であることを常に意識する必要があります。複数人での面接実施や相談窓口の周知が対策の基本です。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_slides (id, course_id, slide_order, slide_type, title)
VALUES (
  'aaaaaaaa-0009-4009-8009-000000000016', 'aaaaaaaa-0009-4009-8009-000000000001', 5, 'quiz', E'理解度チェック（セクション3）'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0009-4009-8009-000000000021', 'aaaaaaaa-0009-4009-8009-000000000012', E'就活生・インターン生へのハラスメント防止措置が義務化されるのはいつからですか？', 0, E'就活生・インターン生へのハラスメント防止措置も2026年10月から義務化されます。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0009-4009-8009-000000000031', 'aaaaaaaa-0009-4009-8009-000000000021', E'2025年10月から', false, 0),
  ('aaaaaaaa-0009-4009-8009-000000000032', 'aaaaaaaa-0009-4009-8009-000000000021', E'2026年10月から', true, 1),
  ('aaaaaaaa-0009-4009-8009-000000000033', 'aaaaaaaa-0009-4009-8009-000000000021', E'2027年10月から', false, 2),
  ('aaaaaaaa-0009-4009-8009-000000000034', 'aaaaaaaa-0009-4009-8009-000000000021', E'義務化の予定はない', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0009-4009-8009-000000000022', 'aaaaaaaa-0009-4009-8009-000000000014', E'就活セクハラの具体例として適切なものはどれですか？', 0, E'面接中の私的な連絡先要求や食事への誘いは、就活セクハラの典型例です。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0009-4009-8009-000000000041', 'aaaaaaaa-0009-4009-8009-000000000022', E'面接での経歴に関する質問', false, 0),
  ('aaaaaaaa-0009-4009-8009-000000000042', 'aaaaaaaa-0009-4009-8009-000000000022', E'私的な連絡先の要求や食事への誘い', true, 1),
  ('aaaaaaaa-0009-4009-8009-000000000043', 'aaaaaaaa-0009-4009-8009-000000000022', E'志望動機の深掘り', false, 2),
  ('aaaaaaaa-0009-4009-8009-000000000044', 'aaaaaaaa-0009-4009-8009-000000000022', E'筆記試験の実施', false, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_questions (id, slide_id, question_text, question_order, explanation)
VALUES (
  'aaaaaaaa-0009-4009-8009-000000000023', 'aaaaaaaa-0009-4009-8009-000000000016', E'採用担当者が常に意識すべきことは何ですか？', 0, E'採用担当者は常に、自分が学生にとって「内定を左右する立場」にあることを意識する必要があります。'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.el_quiz_options (id, question_id, option_text, is_correct, option_order) VALUES
  ('aaaaaaaa-0009-4009-8009-000000000051', 'aaaaaaaa-0009-4009-8009-000000000023', E'できるだけ多くの学生と親しくなること', false, 0),
  ('aaaaaaaa-0009-4009-8009-000000000052', 'aaaaaaaa-0009-4009-8009-000000000023', E'自分が学生にとって「内定を左右する立場」にあること', true, 1),
  ('aaaaaaaa-0009-4009-8009-000000000053', 'aaaaaaaa-0009-4009-8009-000000000023', E'面接時間を短縮すること', false, 2),
  ('aaaaaaaa-0009-4009-8009-000000000054', 'aaaaaaaa-0009-4009-8009-000000000023', E'学生の私生活について詳しく聞くこと', false, 3)
ON CONFLICT (id) DO NOTHING;
