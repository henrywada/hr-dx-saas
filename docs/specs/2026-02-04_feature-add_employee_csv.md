要件仕様書：従業員CSV一括インポート 背景/目的 • 現状の課題:
従業員管理機能において、現状は個別登録しか手段がなく、一括インポートが「制約/未対応」となっている。
• 目的:
従業員数が多いテナント（企業）の初期導入コストを削減し、オンボーディングを円滑にする。
• ビジネス価値: High Impact / Low Cost（既存テーブル活用のため）。
対象ユーザーとユースケース • 対象ユーザー: ◦ 企業管理者 (hr_manager, saas_adm
などの権限を持つユーザー)。 • ユースケース: 1.
管理者がCSVテンプレートをダウンロードする。 2.
管理者がExcel等で氏名、メールアドレス、部署コード、役職を入力する。 3.
管理画面からCSVをアップロードする。 4. システムがデータを検証し、Supabase
Authへのユーザー登録と employees テーブルへのレコード作成を一括で行う。 画面要件
• URL: /dashboard/settings/employees
(既存画面に「インポート」ボタンを追加、モーダルまたは /import サブページへ遷移)
• 入力項目: ◦ ファイル選択（.csv 形式のみ） ◦ アップロードボタン •
バリデーション (フロントエンド): ◦ ファイル拡張子チェック (.csv) ◦
ファイルサイズ制限（例: 5MB以下 ※仮定） • 表示項目: ◦
テンプレートダウンロードリンク ◦ インポート結果サマリ（成功件数、失敗件数） ◦
エラー詳細リスト（行番号、エラー理由：メール重複、部署コード不一致など）
権限要件 • ロール要件: ◦ app_role が hr_manager または saas_adm であること。 ◦
一般社員 (employee) やマネージャー (boss) はアクセス不可とする。 • テナント分離:
◦ 操作ユーザー自身の tenant_id への書き込みのみ許可する（既存のRLSポリシー
Tenant isolation for employees に準拠）。 DB要件 • 対象テーブル: ◦ auth.users
(Supabase Auth管理外テーブル ※仮定: API経由で操作) ◦ public.employees (Insert) ◦
public.divisions (Select: 部署コード紐付け用) • データマッピング/制約: ◦ ID:
auth.users 生成時に払い出されたUUIDを employees.id に使用（FK制約あり）。 ◦
Tenant ID: 操作ユーザーの tenant_id を強制適用。 ◦ Division ID:
CSV内の「部署コード」をキーに divisions テーブルを検索し、対応する id を設定。 ◦
Name: employees.name
はコメントに「暗号化」とあるため、保存時に暗号化処理が必要。 • トランザクション:
◦ Supabase Admin
APIでのAuthユーザー作成と、PublicテーブルへのInsertが分かれるため、完全なDBトランザクションは困難。
◦ 方針:
エラー発生時は可能な限りロールバック（作成したAuthユーザーの削除）を行うロジックを実装する。
API要件 • 種別: Next.js Server Actions • 関数名: importEmployeesAction(formData:
FormData) • 入力 (CSVカラム): ◦ name (氏名) ◦ email (メールアドレス) ◦
division_code (部署コード) ◦ role (役職: employee, boss 等) • 処理フロー: 1.
認証チェック & テナントID取得 (get_auth_tenant_id)。 2. CSVパース &
バリデーション（必須チェック、メール形式）。 3. divisions
テーブルからテナント内の部署コード一覧を取得し、ID解決。 4. Loop処理: ▪ Supabase
Admin API (supabase.auth.admin.inviteUserByEmail ※仮定)
をコールしてAuthユーザー作成。 ▪ 返却されたUUIDを使用し、氏名を暗号化して
employees にInsert。 • レスポンス例: 受け入れ条件（Given/When/Then）

1. Given 管理者が有効なCSV（10件）をアップロードした時、Then
   10件全てのユーザーが登録され、招待メールが送信されること。
2. Given CSV内にシステムに存在しない「部署コード」が含まれる時、Then
   その行はエラーとなり、登録されず、エラーメッセージが表示されること。
3. Given CSV内に既に登録済みの「メールアドレス」が含まれる時、Then
   重複エラーとしてスキップされること。
4. Given 一般社員権限のユーザーがAPIを直接叩いた時、Then 権限エラー（403
   Forbidden）が返ること。
5. Given 氏名が含まれるCSVをアップロードした時、Then DB上の employees.name
   カラムには平文ではなく暗号化された文字列が保存されていること。 非機能要件 •
   速度: 100件程度のインポートを10秒以内に完了すること（Server
   Actionsのタイムアウトに注意）。 • 監査ログ:
   誰がいつインポートを実行したか、別途ログに出力すること（※ログテーブルがないため、現状はコンソールログまたは仮定のログ機構に出力）。
   • エラーハンドリング:
   全件ロールバックではなく、「成功分は登録、失敗分はレポート」とする（Partial
   Success）。 実装タスク分解
6. UI（フロントエンド） ◦ CSVアップロード用コンポーネント作成（Drag &
   Drop領域）。 ◦ バリデーション結果表示UIの実装。
7. API（バックエンド） ◦ CSVパース処理（papaparse 等のライブラリ導入検討）。 ◦
   divisions コード照合ロジック実装。 ◦ Supabase Admin Auth Client
   のセットアップ（Server Actions内での特権利用）。 ◦
   暗号化/復号化ユーティリティの実装（employees.name用）。
8. DB（マイグレーション） ◦ 特になし（既存テーブル利用）。 ◦
   ※必要に応じてインポート履歴用テーブル import_jobs
   などを検討（今回はスコープ外）。
9. テスト ◦ 正常系CSVでのインポートテスト。 ◦
   異常系（フォーマット不正、重複、存在しない部署）のテスト。 ◦
   権限確認テスト（一般社員でのアクセス拒否）。
