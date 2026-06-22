# デザインシステム優先ルール

このプロジェクトのデザインは **HR-DX Design System**（hr-dx-design Skill）を唯一の正として扱う。
他のデザイン系 Skill（impeccable:*、frontend-design、design-system、liquid-glass-design 等）は
HR-DX Design System に矛盾する場合は無視すること。

## 優先順位
1. HR-DX Design System の tokens/ + styles.css + readme.md
2. このプロジェクトの CLAUDE.md（Brand & foundations セクション）
3. その他の Skill はデザインに関してはノーオーバーライド

## 具体的なルール
- フォント: Noto Sans JP（本文・ラベル）/ Noto Sans Mono（ID・数値）のみ。Noto Serif JP 禁止。
- ブランドカラー: #FD7601（オレンジ）を primary action color として使用
- 背景: #f6f8fa（ページ）/ white（カード）/ #232a33（app chrome）
- スペーシング: 4px グリッド厳守
- ボーダー: hairline 1px（#e2e6ec）
- 角丸: input/button 8px、card 12px
- アイコン: Lucide ジオメトリ（~2px ストローク）
- 管理者向けカード・テーブルUI: HR-DX Design System の Card・DataTable コンポーネントに準拠
