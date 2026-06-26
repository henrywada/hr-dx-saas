-- Update service table with proper titles and descriptions
-- Based on analysis of page components and service functionality
-- All descriptions translated to Japanese for consistency

UPDATE public.service SET
  title = 'AI求人管理',
  description = 'AI生成コンテンツの求人票を複数の無料求人サイトに自動連携できます。'
WHERE name = 'AI求人票作成＆無料求人サイト自動連携';

UPDATE public.service SET
  title = '求人原稿ログ',
  description = '生成された求人原稿の履歴を管理し、過去の作成内容を追跡できます。'
WHERE name = '🔔募集原稿アーカイブ';

UPDATE public.service SET
  title = '組織設定',
  description = '貴社の組織構成や部門、階層を登録し、組織管理の基盤を構築します。'
WHERE name = '組織の登録';

UPDATE public.service SET
  title = '健康度調査',
  description = '今月の組織健康度を短時間のアンケート調査で把握し、組織の状態を監視します。'
WHERE name = '今月の組織健康度アンケート';

UPDATE public.service SET
  title = '従業員管理',
  description = '従業員データをCSVファイルやシステムから読み込み、一括登録・管理します。'
WHERE name = '従業員の登録';

UPDATE public.service SET
  title = '採用市場分析',
  description = '採用市場のトレンドや競合企業の採用動向を分析して採用戦略に活用します。'
WHERE name = '採用市場・競合分析ダッシュボード';

UPDATE public.service SET
  title = 'パルス回答',
  description = 'チーム全体の雰囲気やエンゲージメント状況を定期的に把握します。'
WHERE name = 'パルス回答 (Echo)';

UPDATE public.service SET
  title = 'エンゲージメント',
  description = '面接後の候補者エンゲージメントを追跡し、オファー辞退を防ぎます。'
WHERE name = '👋辞退を未然に防ぐ「エンゲージメント・トラッカー」';

UPDATE public.service SET
  title = '健康度ダッシュボード',
  description = '組織全体の健康度スコアを可視化し、チーム別の分析が可能です。'
WHERE name = '組織健康度ダッシュボード';

UPDATE public.service SET
  title = 'リファラル採用',
  description = '従業員による知人紹介を促進し、採用チャネルを拡大できます。'
WHERE name = '🔊リファラル採用';

UPDATE public.service SET
  title = 'AI求人メーカー',
  description = 'AIが求人票や採用戦略文案を自動生成し、効率化します。'
WHERE name = '😀AI求人・募集文メーカー';

UPDATE public.service SET
  title = 'テナント管理',
  description = '新規の顧客企業を登録し、マルチテナント環境を管理します。'
WHERE name = '🚀新規ご契約（会社）';

UPDATE public.service SET
  title = 'サービス管理',
  description = 'SaaSの利用可能サービスと機能を設定・管理します。'
WHERE name = '💡SaaSサービス管理';

UPDATE public.service SET
  title = 'ストレス管理',
  description = 'ストレスチェック実施スケジュールの設定と管理ができます。'
WHERE name = 'ストレスチェック管理';

UPDATE public.service SET
  title = '産業医面談',
  description = '高ストレス従業員のフォローアップ面談をサポートします。'
WHERE name = '産業医面談サポート機能';

UPDATE public.service SET
  title = 'ストレス×パルス',
  description = 'ストレスチェック結果とEchoパルスサーベイを組み合わせて分析します。'
WHERE name = 'ストレスチェック × Echo クロス分析';

UPDATE public.service SET
  title = '労基署報告',
  description = '労基署への報告に必要なデータを自動集計し、レポート形式で出力します。'
WHERE name = '労基署報告用データ集計';

UPDATE public.service SET
  title = '集団分析',
  description = '部門別・階層別にストレスレベルを分析し、組織診断に活用します。'
WHERE name = '集団分析（組織健康度分析）';

UPDATE public.service SET
  title = 'ハローワーク',
  description = 'ハローワーク形式で求人票をCSV出力し、登録フローを簡素化します。'
WHERE name = 'ハローワーク用CSV作成';

UPDATE public.service SET
  title = 'ストレスチェック',
  description = '毎年実施が義務付けられているストレスチェック検査に回答します。'
WHERE name = 'ストレスチェック';

UPDATE public.service SET
  title = 'チェック進捗',
  description = 'ストレスチェック実施時の回答進捗状況をモニタリングし、リマインダーを送信します。'
WHERE name = 'ストレスチェック進捗管理';

UPDATE public.service SET
  title = 'ストレスヒートマップ',
  description = '組織全体のストレスレベルをヒートマップで可視化し、部門別に比較分析できます。'
WHERE name = '組織健康度分析（ヒートマップ）';
