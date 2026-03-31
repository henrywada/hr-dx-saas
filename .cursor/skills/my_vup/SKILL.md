---
name: my_vup
description: >-
  Increments the semver display string (vX.Y.Z) in src/components/layout/Footer.tsx.
  Use when the user invokes /my_vup, asks to bump the footer version, or to raise the
  displayed app version in the layout footer.
---

# my_vup（フッター表示バージョンの更新）

## 対象

- ファイル: `src/components/layout/Footer.tsx`
- 変更箇所: 右下の `font-mono` 付近にある `vX.Y.Z` 形式の文字列

## 手順

1. 現在の `vX.Y.Z` を読み取る。
2. セマンティックバージョンを **1 つだけ** 上げる。
   - **デフォルト（ユーザーが種類を指定しない場合）**: パッチ **Z** を +1（例: `v2.4.18` → `v2.4.19`）。
   - **マイナー** と明示された場合: **Y** を +1、**Z** を 0（例: `v2.4.18` → `v2.5.0`）。
   - **メジャー** と明示された場合: **X** を +1、**Y** と **Z** を 0（例: `v2.4.18` → `v3.0.0`）。
3. 表示文字列のみを更新する。`v` プレフィックスとフォーマットは維持する。

## 注意

- `package.json` の `"version"` は別管理のため **自動では同期しない**。ユーザーが明示したときだけ合わせる。
- 同じバージョン文字列が他にあれば、フッターと整合するよう必要なら更新する（通常は Footer のみ）。
