フッターのバージョン番号をパッチバージョン +1 して git コミットする。

手順：

1. `src/components/layout/Footer.tsx` を読み込み、`vX.Y.Z` 形式のバージョン文字列を取得する
2. パッチバージョン（Z）を 1 増やした新バージョン文字列を作成する
3. Footer.tsx 内のバージョン文字列を新バージョンに書き換える
4. 以下を実行してコミットする：
   ```
   git add src/components/layout/Footer.tsx
   git commit -m "v{新バージョン}"
   ```
5. 完了後、「v{旧バージョン} → v{新バージョン} にアップデートしました」と報告する
