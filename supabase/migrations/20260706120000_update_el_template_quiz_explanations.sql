-- テンプレートクイズの explanation を原稿ベースの解説文に更新（既存DB向け）

UPDATE public.el_quiz_questions SET explanation = E'ハラスメント防止措置はパワハラ防止法・男女雇用機会均等法・育児介護休業法により、企業規模を問わずすべての事業者に義務付けられています。' WHERE id = 'aaaaaaaa-0002-4002-8002-000000000021';
UPDATE public.el_quiz_questions SET explanation = E'カスハラは2026年10月から義務化される新たな対象であり、本研修で扱う「法律で既に義務化されている4種類」には含まれません。' WHERE id = 'aaaaaaaa-0002-4002-8002-000000000022';
UPDATE public.el_quiz_questions SET explanation = E'2026年10月から顧客・取引先から従業員への言動（カスハラ）と、就活生・インターン生への言動も会社の防止義務の対象となります。' WHERE id = 'aaaaaaaa-0002-4002-8002-000000000023';
UPDATE public.el_quiz_questions SET explanation = E'ハラスメント判断の3要素は優位性・相当性・就業環境への害です。加害者が管理職であることは必須条件ではありません。' WHERE id = 'aaaaaaaa-0003-4003-8003-000000000021';
UPDATE public.el_quiz_questions SET explanation = E'適正な業務指導とハラスメントを分けるのは「何を指摘したか」ではなく、手段・方法・頻度です。' WHERE id = 'aaaaaaaa-0003-4003-8003-000000000022';
UPDATE public.el_quiz_questions SET explanation = E'単発であっても暴力や人格否定など内容が極めて悪質であれば、ハラスメントと判断される場合があります。' WHERE id = 'aaaaaaaa-0003-4003-8003-000000000023';
UPDATE public.el_quiz_questions SET explanation = E'「産休を取るなら辞めてもらう」は、産休制度の利用を嫌がらせる「制度等の利用への嫌がらせ型」に該当します。' WHERE id = 'aaaaaaaa-0004-4004-8004-000000000021';
UPDATE public.el_quiz_questions SET explanation = E'妊娠・出産等を理由とした解雇・降格・不利益な配置転換は禁止されますが、本人の健康を考慮した安全配慮としての配置転換とは区別されます。' WHERE id = 'aaaaaaaa-0004-4004-8004-000000000022';
UPDATE public.el_quiz_questions SET explanation = E'「良かれと思った配慮」も本人の意向確認なしに一方的に行えば不利益取扱いと受け取られ得ます。決定前の話し合いが基本です。' WHERE id = 'aaaaaaaa-0004-4004-8004-000000000023';
UPDATE public.el_quiz_questions SET explanation = E'育児・介護休業法の防止義務は、男女を問わず育児・介護休業等の制度利用への嫌がらせを対象とします。' WHERE id = 'aaaaaaaa-0005-4005-8005-000000000021';
UPDATE public.el_quiz_questions SET explanation = E'男性の育児休業取得も法律で保護されており、「男性が取るのはおかしい」という発言はハラスメントに該当する可能性があります。' WHERE id = 'aaaaaaaa-0005-4005-8005-000000000022';
UPDATE public.el_quiz_questions SET explanation = E'本人の意向を確認せず一方的に重要な業務から外すことは、介護休業取得者への不適切な対応となり得ます。' WHERE id = 'aaaaaaaa-0005-4005-8005-000000000023';
UPDATE public.el_quiz_questions SET explanation = E'アウティングとは、本人の同意なく性的指向・性自認等のセンシティブな情報を第三者に開示することです。' WHERE id = 'aaaaaaaa-0006-4006-8006-000000000021';
UPDATE public.el_quiz_questions SET explanation = E'相談を受けた際は、誰に・どこまで共有してよいかを必ず本人に確認することが原則です。' WHERE id = 'aaaaaaaa-0006-4006-8006-000000000022';
UPDATE public.el_quiz_questions SET explanation = E'動機が善意であっても、本人の同意のない情報開示はアウティングに該当し得ます。' WHERE id = 'aaaaaaaa-0006-4006-8006-000000000023';
UPDATE public.el_quiz_questions SET explanation = E'アンコンシャス・バイアスとは、本人が自覚していない偏見や思い込みのことです。' WHERE id = 'aaaaaaaa-0007-4007-8007-000000000021';
UPDATE public.el_quiz_questions SET explanation = E'本人の実績データに基づく人事評価は客観的な判断であり、無意識の偏見（バイアス）ではありません。' WHERE id = 'aaaaaaaa-0007-4007-8007-000000000022';
UPDATE public.el_quiz_questions SET explanation = E'判断が本人の実績・能力に基づくか、属性に基づく思い込みではないかを自問することが有効です。' WHERE id = 'aaaaaaaa-0007-4007-8007-000000000023';
UPDATE public.el_quiz_questions SET explanation = E'カスタマーハラスメント対策の義務化は2026年10月から開始されます。' WHERE id = 'aaaaaaaa-0008-4008-8008-000000000021';
UPDATE public.el_quiz_questions SET explanation = E'カスハラと正当なクレームの違いは要求内容ではなく、その手段・態様（威圧・拘束・人格否定等）にあります。' WHERE id = 'aaaaaaaa-0008-4008-8008-000000000022';
UPDATE public.el_quiz_questions SET explanation = E'従業員一人に最後まで対応を担わせる方針は安全確保に反し、企業が整備すべき体制には含まれません。' WHERE id = 'aaaaaaaa-0008-4008-8008-000000000023';
UPDATE public.el_quiz_questions SET explanation = E'就活生・インターン生へのハラスメント防止措置も2026年10月から義務化されます。' WHERE id = 'aaaaaaaa-0009-4009-8009-000000000021';
UPDATE public.el_quiz_questions SET explanation = E'面接中の私的な連絡先要求や食事への誘いは、就活セクハラの典型例です。' WHERE id = 'aaaaaaaa-0009-4009-8009-000000000022';
UPDATE public.el_quiz_questions SET explanation = E'採用担当者は常に、自分が学生にとって「内定を左右する立場」にあることを意識する必要があります。' WHERE id = 'aaaaaaaa-0009-4009-8009-000000000023';
