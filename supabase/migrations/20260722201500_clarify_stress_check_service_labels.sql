-- ストレスチェック関連メニュー名を画面役割に合わせて明確化
-- /adm/establishments = 拠点（事業場）マスタ（分析用に設定）
-- /adm/stress-check/mnt_sets = 実施（期間・対象部署・対象者）の管理

UPDATE public.service
SET
  name = '拠点（事業場）マスタ（分析用に設定）',
  title = '拠点（事業場）マスタ（分析用に設定）',
  description = '集団分析・進捗の拠点別表示や労基署報告の単位となる事業場を登録します。アンカー部署を紐づけて従業員を事業場に割り当てます。受検期間・対象者は「実施（期間・対象部署・対象者）の管理」で設定します。'
WHERE route_path = '/adm/establishments';

UPDATE public.service
SET
  name = '実施（期間・対象部署・対象者）の管理',
  title = '実施（期間・対象部署・対象者）の管理',
  description = 'ストレスチェックの実施期間・対象部署・質問数を設定します。事業場単位の集計は「拠点（事業場）マスタ（分析用に設定）」で登録した拠点を使います。'
WHERE route_path = '/adm/stress-check/mnt_sets';
