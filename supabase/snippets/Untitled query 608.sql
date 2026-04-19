-- =============================================================================
-- Echo パルスサーベイ 追加テンプレート
-- ４: 健康経営モニタリング
-- ５: 組織別健康度分析
-- =============================================================================

DO $$
DECLARE
  -- テンプレート4: 健康経営モニタリング
  t4_id UUID;
  t4_q1 UUID; t4_q2 UUID; t4_q3 UUID; t4_q4 UUID; t4_q5 UUID; t4_q6 UUID;

  -- テンプレート5: 組織別健康度分析
  t5_id UUID;
  t5_q1 UUID; t5_q2 UUID; t5_q3 UUID; t5_q4 UUID; t5_q5 UUID; t5_q6 UUID;

BEGIN

-- ============================================================
-- テンプレート4: 健康経営モニタリング
-- 目的: 従業員の身体・メンタル・生活習慣の状態を把握し、
--       健康経営施策の効果測定と要支援者の早期発見に使う
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM public.questionnaires
  WHERE creator_type = 'system' AND purpose = 'echo'
    AND title = '健康経営モニタリングテンプレート'
) THEN

  INSERT INTO public.questionnaires (creator_type, tenant_id, title, description, status, purpose)
  VALUES (
    'system', NULL,
    '健康経営モニタリングテンプレート',
    '従業員の心身の健康状態・生活習慣・プレゼンティーイズム（体調不良での出勤）を月次で把握。健康経営施策の効果測定と要支援者の早期発見に活用。',
    'draft', 'echo'
  )
  RETURNING id INTO t4_id;

  -- Q1: 心身の状態（rating_table）
  INSERT INTO public.questionnaire_questions
    (questionnaire_id, question_type, question_text, scale_labels, is_required, sort_order)
  VALUES (
    t4_id, 'rating_table',
    '今月の心身の状態について教えてください。',
    '["全く当てはまらない","あまり当てはまらない","どちらとも言えない","やや当てはまる","非常に当てはまる"]',
    true, 1
  )
  RETURNING id INTO t4_q1;

  INSERT INTO public.questionnaire_question_items (question_id, item_text, sort_order) VALUES
    (t4_q1, '心身ともに充実して仕事ができた', 1),
    (t4_q1, '十分な睡眠・休養が取れた', 2),
    (t4_q1, '体の不調（頭痛・腰痛・疲労感など）を感じることが多かった', 3),
    (t4_q1, '気分の落ち込みや不安を感じることが多かった', 4);

  -- Q2: プレゼンティーイズム（radio）
  INSERT INTO public.questionnaire_questions
    (questionnaire_id, question_type, question_text, scale_labels, is_required, sort_order)
  VALUES (
    t4_id, 'radio',
    '今月、体調が優れない状態でも出勤・仕事をしたことがありましたか？',
    NULL, true, 2
  )
  RETURNING id INTO t4_q2;

  INSERT INTO public.questionnaire_question_options (question_id, option_text, sort_order) VALUES
    (t4_q2, 'なかった', 1),
    (t4_q2, '1〜2回あった', 2),
    (t4_q2, '3〜5回あった', 3),
    (t4_q2, '6回以上あった', 4);

  -- Q3: 仕事パフォーマンスへの影響（radio）
  INSERT INTO public.questionnaire_questions
    (questionnaire_id, question_type, question_text, scale_labels, is_required, sort_order)
  VALUES (
    t4_id, 'radio',
    '健康上の理由（体調・疲労・メンタル等）で、仕事のパフォーマンスが低下したと感じることはありましたか？',
    NULL, true, 3
  )
  RETURNING id INTO t4_q3;

  INSERT INTO public.questionnaire_question_options (question_id, option_text, sort_order) VALUES
    (t4_q3, 'なかった', 1),
    (t4_q3, '少しあった（10〜30%程度の低下）', 2),
    (t4_q3, 'かなりあった（30〜50%程度の低下）', 3),
    (t4_q3, '大きく影響した（50%以上の低下）', 4);

  -- Q4: 生活習慣（rating_table）
  INSERT INTO public.questionnaire_questions
    (questionnaire_id, question_type, question_text, scale_labels, is_required, sort_order)
  VALUES (
    t4_id, 'rating_table',
    '今月の生活習慣について教えてください。',
    '["全くできなかった","あまりできなかった","どちらとも言えない","ある程度できた","十分できた"]',
    true, 4
  )
  RETURNING id INTO t4_q4;

  INSERT INTO public.questionnaire_question_items (question_id, item_text, sort_order) VALUES
    (t4_q4, '規則正しい食事・栄養バランスを意識できた', 1),
    (t4_q4, '週2回以上の運動や身体活動ができた', 2),
    (t4_q4, '仕事後にしっかりオフになれた（ワークオフ）', 3);

  -- Q5: 会社の健康支援施策の活用（checkbox）
  INSERT INTO public.questionnaire_questions
    (questionnaire_id, question_type, question_text, scale_labels, is_required, sort_order)
  VALUES (
    t4_id, 'checkbox',
    '今月、会社の健康支援施策を利用しましたか？（任意・複数選択可）',
    NULL, false, 5
  )
  RETURNING id INTO t4_q5;

  INSERT INTO public.questionnaire_question_options (question_id, option_text, sort_order) VALUES
    (t4_q5, '産業医・保健師への相談', 1),
    (t4_q5, 'EAP（従業員支援プログラム）', 2),
    (t4_q5, '社内の健康イベント・セミナー', 3),
    (t4_q5, 'フィットネス補助・スポーツ施設利用', 4),
    (t4_q5, '利用したものはない', 5);

  -- Q6: 自由記述
  INSERT INTO public.questionnaire_questions
    (questionnaire_id, question_type, question_text, scale_labels, is_required, sort_order)
  VALUES (
    t4_id, 'text',
    '健康面で会社に改善・追加してほしい支援があれば教えてください。（任意）',
    NULL, false, 6
  );

END IF;

-- ============================================================
-- テンプレート5: 組織別健康度分析
-- 目的: 部署・チーム単位の組織としての機能状態を測定。
--       目標共有・情報流通・協力関係・心理的安全性を定量化し、
--       部署間比較や組織課題の特定に使う
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM public.questionnaires
  WHERE creator_type = 'system' AND purpose = 'echo'
    AND title = '組織別健康度分析テンプレート'
) THEN

  INSERT INTO public.questionnaires (creator_type, tenant_id, title, description, status, purpose)
  VALUES (
    'system', NULL,
    '組織別健康度分析テンプレート',
    '部署・チーム単位の組織機能（目標共有・情報流通・協力関係・心理的安全性）を定量化。部署間のスコア比較や組織課題の特定・優先順位付けに活用。',
    'draft', 'echo'
  )
  RETURNING id INTO t5_id;

  -- Q1: 目標・方向性の共有（rating_table）
  INSERT INTO public.questionnaire_questions
    (questionnaire_id, question_type, question_text, scale_labels, is_required, sort_order)
  VALUES (
    t5_id, 'rating_table',
    'あなたのチーム・部署の目標や方向性について教えてください。',
    '["全くそう思わない","あまりそう思わない","どちらとも言えない","ややそう思う","強くそう思う"]',
    true, 1
  )
  RETURNING id INTO t5_q1;

  INSERT INTO public.questionnaire_question_items (question_id, item_text, sort_order) VALUES
    (t5_q1, '自分のチームが今月何を優先すべきか明確に理解している', 1),
    (t5_q1, '会社全体の目標と自分の仕事のつながりを感じる', 2),
    (t5_q1, '目標達成に向けて、チームとして一丸となって動けている', 3);

  -- Q2: 情報流通・意思決定（rating_table）
  INSERT INTO public.questionnaire_questions
    (questionnaire_id, question_type, question_text, scale_labels, is_required, sort_order)
  VALUES (
    t5_id, 'rating_table',
    'チーム内の情報共有・意思決定について教えてください。',
    '["全くそう思わない","あまりそう思わない","どちらとも言えない","ややそう思う","強くそう思う"]',
    true, 2
  )
  RETURNING id INTO t5_q2;

  INSERT INTO public.questionnaire_question_items (question_id, item_text, sort_order) VALUES
    (t5_q2, '仕事に必要な情報が適切なタイミングで共有される', 1),
    (t5_q2, '意思決定のプロセスが透明で理解しやすい', 2),
    (t5_q2, '部署間の連携がスムーズにできている', 3);

  -- Q3: 協力・支援関係（rating_table）
  INSERT INTO public.questionnaire_questions
    (questionnaire_id, question_type, question_text, scale_labels, is_required, sort_order)
  VALUES (
    t5_id, 'rating_table',
    'チームメンバー同士の協力関係について教えてください。',
    '["全くそう思わない","あまりそう思わない","どちらとも言えない","ややそう思う","強くそう思う"]',
    true, 3
  )
  RETURNING id INTO t5_q3;

  INSERT INTO public.questionnaire_question_items (question_id, item_text, sort_order) VALUES
    (t5_q3, '忙しいメンバーをチームで助け合える雰囲気がある', 1),
    (t5_q3, '多様な意見や背景を持つメンバーが尊重されている', 2),
    (t5_q3, 'チームの成果に対してメンバー全員が当事者意識を持っている', 3);

  -- Q4: 心理的安全性（radio）
  INSERT INTO public.questionnaire_questions
    (questionnaire_id, question_type, question_text, scale_labels, is_required, sort_order)
  VALUES (
    t5_id, 'radio',
    'あなたのチームでは、新しいアイデアや改善提案を気軽に言える雰囲気がありますか？',
    NULL, true, 4
  )
  RETURNING id INTO t5_q4;

  INSERT INTO public.questionnaire_question_options (question_id, option_text, sort_order) VALUES
    (t5_q4, '言いやすい雰囲気が十分ある', 1),
    (t5_q4, 'ある程度言える', 2),
    (t5_q4, 'あまり言えない', 3),
    (t5_q4, '言える雰囲気はない', 4);

  -- Q5: 組織として最も改善が必要なこと（radio）
  INSERT INTO public.questionnaire_questions
    (questionnaire_id, question_type, question_text, scale_labels, is_required, sort_order)
  VALUES (
    t5_id, 'radio',
    '今のチーム・部署で最も改善が必要だと感じることはどれですか？',
    NULL, true, 5
  )
  RETURNING id INTO t5_q5;

  INSERT INTO public.questionnaire_question_options (question_id, option_text, sort_order) VALUES
    (t5_q5, '目標・役割分担の明確化', 1),
    (t5_q5, '情報共有・コミュニケーションの改善', 2),
    (t5_q5, 'メンバー間の協力・助け合い', 3),
    (t5_q5, '上司・リーダーのマネジメント', 4),
    (t5_q5, '業務プロセス・効率化', 5),
    (t5_q5, '特に問題を感じない', 6);

  -- Q6: 自由記述
  INSERT INTO public.questionnaire_questions
    (questionnaire_id, question_type, question_text, scale_labels, is_required, sort_order)
  VALUES (
    t5_id, 'text',
    'チームをより良くするための具体的なアイデアや改善提案があれば教えてください。（任意）',
    NULL, false, 6
  );

END IF;

END $$;

-- 確認用
SELECT id, title, status, purpose,
       (SELECT COUNT(*) FROM public.questionnaire_questions q WHERE q.questionnaire_id = qs.id) AS question_count
FROM public.questionnaires qs
WHERE creator_type = 'system' AND purpose = 'echo'
ORDER BY created_at;
