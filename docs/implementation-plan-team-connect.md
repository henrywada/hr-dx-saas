# チームコネクト（組織図・社内ディレクトリ閲覧） 実装計画（PRD）

> ロードマップ: `docs/feature-blocks-development-roadmap.md` 優先度2位（コミュニケーション層）

## 1. 問題定義

パルスサーベイ・アンケート・お知らせは実装済みだが、組織図・社内ディレクトリ・社内SNS的な機能（チームコネクト）が未着手。一般従業員が自部署以外の組織構成・他従業員の所属を把握できる手段が無く、①コミュニケーションを大切にするシステムの一部が欠落している。管理者向けの組織図（`adm/(base_mnt)/divisions`）・従業員一覧（`adm/(base_mnt)/employees`）は完成済みだが、一般従業員向けの閲覧専用ビューは存在しない。

## 2. ユーザーストーリー

| As a | I want to | So that |
| --- | --- | --- |
| 一般従業員 | 全社の組織図を閲覧したい | 他部署の構成・人数を把握できる |
| 一般従業員 | 氏名・社員番号・部署でメンバーを検索したい | 連絡したい相手の所属を素早く特定できる |

## 3. 要求（優先度別、今回のスコープ）

**Must（今回実装）**
1. 組織図ツリーの一般従業員向け閲覧（展開/折りたたみ、部署別人数表示、編集不可）
2. 社内ディレクトリの検索・部署フィルタ（編集不可）

**Won't（今回スコープ外、ユーザー確認済み）**
- 社内SNS的な投稿・コメント機能（Kudosパターンを応用すれば将来追加可能）
- プロフィール写真・自己紹介文の表示（`employees`テーブルにavatar/bio系カラムが無く、追加は別途検討）

## 4. データモデル

新規テーブルは無し。既存の `public.divisions` / `public.employees` をそのまま閲覧する。RLS追加も不要（`divisions_select_same_tenant` / `employees_select_same_tenant` が役割を問わずテナント内全件SELECTを既に許可しているため）。

## 5. 配置ルール

```
src/features/team-connect/
├── types.ts          # organization/types.ts の re-export + DirectoryEmployee型
├── tree-utils.ts      # ツリー構築・ソートの純粋関数（ユニットテスト対象）
├── queries.ts         # organization/queries.tsの関数 re-export + getDirectoryEmployees()
└── components/
    ├── DivisionTreeView.tsx   # 読み取り専用ツリー
    └── DirectoryList.tsx      # 読み取り専用ディレクトリ（DataTable使用）

src/app/(tenant)/(tenant-users)/team-connect/page.tsx
```

書き込み操作が無いため `actions.ts` は作成しない。

## 6. マスタ登録（メニュー表示）

既存カテゴリに「コミュニケーション」相当が無いため新規 `service_category` を作成（`a1b2c3d4-0010-...`）。`service` に `route_path: /team-connect`, `target_audience: 'all_users'` で1件追加。`tenant_service` への投入は直近のウェルビーイング4機能と同様に省略（SaaS管理者がテナント管理画面で個別有効化する運用）。

## 7. 成功指標

- 組織図・ディレクトリページの閲覧頻度（DAU）
- 他部署メンバー検索からの問い合わせ完了率（間接指標、測定方法は別途検討）

## 8. オープンクエスチョン

- 社内SNS的な投稿機能・プロフィール写真/自己紹介は今後別フェーズで着手するか要判断。
- `tenant_service` 未登録のためサイドメニューには表示されない。テナントへの本機能の展開方法（個別有効化 or 全テナント一括公開）は要検討。
