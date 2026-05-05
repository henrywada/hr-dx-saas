---
name: my_divisions
description: >-
  HR-DX SaaS の divisions（部署）テーブルの階層構造を AI に正確に伝えるリファレンスプロンプト。
  Use when the user invokes /my_divisions, asks about 組織構造, 部署テーブル, divisions, 階層集計, layer 集計, parent_id, or similar.
---

# my_divisions（組織・部署構造リファレンス）

このスキルを呼び出したら、以下の「divisions テーブル構造プロンプト」をそのまま出力し、
続けてユーザーの要求に応じた実装・SQL・説明を行う。

---

## divisions テーブル構造プロンプト（コピー可）

```
## 組織（部署）階層構造 — divisions テーブル

### テーブル定義

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid | PK |
| tenant_id | uuid | テナントID（マルチテナント分離） |
| name | text | 部署名（例: 関東支社、東京事務所、営業部） |
| parent_id | uuid | 親部署の id。NULL = ルート（最上位）部署 |
| layer | int4 | 階層レベル。1 = 最上位、2 = 中間、3 = 末端（最大3階層） |
| code | text | 部署コード（例: 010, 010-010, 010-010-020） |

### 階層ルール

- **layer = 1**：ルート部署。parent_id = NULL。会社全体のトップ組織単位。
  - 例: 関東支社（code: 010）、関西支社（code: 020）
- **layer = 2**：layer=1 の子。parent_id = 対応する layer=1 の id。
  - 例: 東京事務所（関東支社の子）、神奈川事務所（関東支社の子）、大阪事務所（関西支社の子）、神戸事務所（関西支社の子）
- **layer = 3**：layer=2 の子。parent_id = 対応する layer=2 の id。末端部署。
  - 例: 営業部（東京事務所の子）、人事部（東京事務所の子）

### ツリー構造の具体例

  関東支社          layer=1, parent_id=NULL
  ├── 東京事務所    layer=2, parent_id=関東支社.id
  │   ├── 営業部   layer=3, parent_id=東京事務所.id
  │   └── 人事部   layer=3, parent_id=東京事務所.id
  └── 神奈川事務所  layer=2, parent_id=関東支社.id

  関西支社          layer=1, parent_id=NULL
  ├── 大阪事務所    layer=2, parent_id=関西支社.id
  │   └── 営業部   layer=3, parent_id=大阪事務所.id
  └── 神戸事務所    layer=2, parent_id=関西支社.id

### employees テーブルとの関係

employees.division_id = divisions.id（所属部署の直接 FK）。
従業員は末端部署（主に layer=3、または layer=2）に直接所属する。
layer=1 に直接所属する従業員は通常存在しない。

### ドロップボックスの選択肢と集計ルール

UI のドロップボックスは以下の順で構成する：

| value | label | 表示行数 | 集計単位 |
|-------|-------|----------|----------|
| `'all'` | 全て | **1行**（全社合計） | テナント全従業員を1つに合算 |
| `'1'` | 層1 | layer=1 の部署数 | layer=1 の各部署（配下含む全員を合算） |
| `'2'` | 層2 | layer=2 の部署数 | layer=2 の各部署（配下 layer=3 含む全員を合算） |
| `'3'` | 層3 | layer=3 の部署数 | layer=3 の各部署（直接所属する従業員のみ） |

※ layer=3 が存在しないテナントでは「層3」を選択肢に含めない。

---

### 「全て」と「層1」の違い（重要）

- **全て** → 1行。組織を横断した**全社合計**。「関東支社＋関西支社の合計で1行」
- **層1** → 複数行。**layer=1 の部署ごと**に集計。「関東支社の行」「関西支社の行」と並ぶ

---

### ancestor（祖先）解決ルール

「層N を選択」したとき、従業員の `division_id` が指す部署の `layer` は N と異なる場合がある。
必ず以下のルールで **layer=N の集計グループ** を決定する：

| 従業員の division.layer | 層N集計での扱い |
|------------------------|-----------------|
| `= N` | その division がそのまま集計グループ |
| `> N`（Nより深い） | parent_id を遡って layer=N の祖先を特定し、そのグループに入れる |
| `< N`（Nより浅い） | **対象外**（layer=N の子孫に所属していない）。集計から除外する |

---

### SQL パターン集

#### 「全て」（1行：全社合計）

```sql
SELECT
  '全て' AS 組織名,
  COUNT(e.id) AS 人数
FROM employees e
JOIN divisions d ON e.division_id = d.id
WHERE d.tenant_id = $tenant_id;
```

#### 「層1」（layer=1 の部署ごとに集計）

```sql
SELECT
  d1.name AS 組織名,
  COUNT(e.id) AS 人数
FROM employees e
JOIN divisions e_div ON e.division_id = e_div.id
JOIN divisions d1 ON d1.layer = 1 AND d1.tenant_id = $tenant_id AND (
  CASE e_div.layer
    WHEN 1 THEN e_div.id = d1.id
    WHEN 2 THEN e_div.parent_id = d1.id
    WHEN 3 THEN EXISTS (
      SELECT 1 FROM divisions d2
      WHERE d2.id = e_div.parent_id AND d2.parent_id = d1.id
    )
    ELSE false
  END
)
GROUP BY d1.id, d1.name, d1.code
ORDER BY d1.code;
```

#### 「層2」（layer=2 の部署ごとに集計）

```sql
SELECT
  d2.name AS 組織名,
  COUNT(e.id) AS 人数
FROM employees e
JOIN divisions e_div ON e.division_id = e_div.id
JOIN divisions d2 ON d2.layer = 2 AND d2.tenant_id = $tenant_id AND (
  CASE e_div.layer
    WHEN 2 THEN e_div.id = d2.id
    WHEN 3 THEN e_div.parent_id = d2.id
    ELSE false  -- layer=1 の従業員は層2集計から除外
  END
)
GROUP BY d2.id, d2.name, d2.code
ORDER BY d2.code;
```

#### 「層3」（layer=3 の部署ごとに集計）

```sql
SELECT
  e_div.name AS 組織名,
  COUNT(e.id) AS 人数
FROM employees e
JOIN divisions e_div ON e.division_id = e_div.id
WHERE e_div.layer = 3
  AND e_div.tenant_id = $tenant_id
GROUP BY e_div.id, e_div.name, e_div.code
ORDER BY e_div.code;
```

---

### 部署名の表示形式（フルパス表示）

集計結果やテーブル・チャートで部署名を表示するとき、同名部署（例：異なる支社に同名の「営業部」）を区別できるよう、
**上位組織をスラッシュ区切りで連結したフルパス**で表示する。

```
表示例：
  関東支社                          ← layer=1（ルート）
  関東支社 / 東京事務所              ← layer=2
  関東支社 / 東京事務所 / 営業部     ← layer=3
```

#### SQL でフルパスを生成する（再帰 CTE）

```sql
WITH RECURSIVE division_path AS (
  -- ベースケース：layer=1（ルート）
  SELECT
    id,
    tenant_id,
    name,
    parent_id,
    layer,
    code,
    name AS full_path
  FROM divisions
  WHERE parent_id IS NULL
    AND tenant_id = $tenant_id

  UNION ALL

  -- 再帰：子部署にパスを連結
  SELECT
    d.id,
    d.tenant_id,
    d.name,
    d.parent_id,
    d.layer,
    d.code,
    dp.full_path || ' / ' || d.name AS full_path
  FROM divisions d
  JOIN division_path dp ON d.parent_id = dp.id
)
SELECT id, name, full_path, layer, code
FROM division_path
ORDER BY code;
```

#### TypeScript でフルパスを生成する（JS 側ツリー走査）

divisions 全件をフラットな配列で取得済みの場合、JS 側で構築する方が効率的。

```typescript
const buildFullPath = (divisionId: string, divisions: Division[]): string => {
  const divMap = new Map(divisions.map(d => [d.id, d]))
  const parts: string[] = []
  let current = divMap.get(divisionId)
  while (current) {
    parts.unshift(current.name)
    current = current.parent_id ? divMap.get(current.parent_id) : undefined
  }
  return parts.join(' / ')
}

// 使用例
const rows = targetDivisions.map(div => ({
  id: div.id,
  name: div.name,
  fullPath: buildFullPath(div.id, allDivisions),  // 表示用
  value: sumByAncestor(data, allDivisions, div.id),
}))
```

#### 表示ルール

- **チャートの軸ラベル・テーブルの部署列**：フルパスを表示する
- **「全て」選択時**：組織名は `'全て'`（フルパス不要）
- **長い場合の省略**：スペースが狭い場合は末尾の name のみ表示し、ツールチップでフルパスを出す

---

### TypeScript ドロップボックス実装パターン

```typescript
// 集計層の型
type LayerOption = 'all' | '1' | '2' | '3'

// 存在する最大 layer を取得してドロップボックスを動的生成
const buildLayerOptions = (maxLayer: number): { value: LayerOption; label: string }[] => {
  const options: { value: LayerOption; label: string }[] = [
    { value: 'all', label: '全て' },
  ]
  for (let i = 1; i <= maxLayer; i++) {
    options.push({ value: String(i) as LayerOption, label: `層${i}` })
  }
  return options
}

// 集計関数の分岐
const aggregateByLayer = (layer: LayerOption, divisions: Division[], data: DataRow[]) => {
  if (layer === 'all') {
    // 全社合計 → 1行返す
    return [{ name: '全て', value: sum(data) }]
  }
  const targetLayer = Number(layer)
  // divisions から layer=targetLayer の部署一覧を取得
  const targetDivisions = divisions.filter(d => d.layer === targetLayer)
  // 各部署について、配下の division_id セットを使ってデータを集計
  return targetDivisions.map(div => ({
    name: div.name,
    value: sumByAncestor(data, divisions, div.id, targetLayer),
  }))
}
```

---

### 実装上の注意

1. **tenant_id フィルタ必須**：全クエリで `tenant_id = $tenant_id` を付ける。
2. **表示順**：`code` カラムの昇順でソートすると階層順になる。
3. **layer=3 が存在しないテナント**：`SELECT MAX(layer) FROM divisions WHERE tenant_id = $tenant_id` でチェックし、ドロップボックスから「層3」を除く。
4. **「全て」は常に先頭**：配列の index=0 に固定し、その後 `層1`, `層2`, `層3` を続ける。
5. **ancestor 解決は JS 側で行う方が効率的**：divisions 全件はテナントごとに少ないため、クライアント or Server Action でツリーを構築し、各データ行に ancestor の division_id をマッピングしてから集計すると SQL が単純になる。
```

---

## このスキルの使い方

呼び出し後、上記プロンプトブロックを出力してから、ユーザーの要求に応じた実装を行う。

**典型的な用途:**
- OrgLayerAnalysis や HighStressLayerChart など、層別集計コンポーネントの実装・修正
- 部署ツリーを走査する SQL・TypeScript コードのレビュー
- divisions 構造を前提とする新機能の設計相談
