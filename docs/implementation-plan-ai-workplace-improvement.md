# AI職場改善提案エージェント 実装計画

## 概要
ストレスチェック実施マニュアル第8章に基づく「集団分析結果をAIが読んで具体的な職場改善提案を出し、即実行登録 → 3ヶ月後自動フォロー測定」機能。

## 配置ルール

```
src/app/(tenant)/(colored)/adm/(ai_agent)/
├── ai-workplace-improvement/
│   ├── page.tsx                     ← メイン画面（生成ボタン＋カード一覧）
│   └── components/
│       ├── AIProposalCards.tsx       ← AI提案カード一覧
│       ├── ImprovementPlanForm.tsx  ← 登録モーダル（期待効果・フォロー設定）
│       └── FollowUpStatus.tsx       ← 前回比効果測定グラフ
└── layout.tsx                       ← シンプルレイアウト
```

## 必須機能

1. **AI提案生成ボタン**  
   現在の集団分析結果（getGroupAnalysis）から OpenAI gpt-4o-mini で3件の提案を生成

2. **提案カード表示**  
   部署・優先度・タイトル・理由・具体アクション・期待効果を表示

3. **即登録**  
   「この提案を職場改善計画に即登録」→ workplace_improvement_plans に保存

4. **3ヶ月後フォロー**  
   チェックボックスで follow_up_date を自動計算（登録日+3ヶ月）

5. **登録済み一覧**  
   下部に「登録済み改善計画一覧」と「前回比効果測定グラフ」（Recharts）

## 技術要件

- Server Action + OpenAI API（process.env.OPENAI_API_KEY）
- getGroupAnalysis() / getServerUser() を活用
- shadcn/ui 風（Card, Button, Badge）
- RLS 対応（tenant_id フィルタ）
- 日本語UI・コメント

## データフロー

```
[getGroupAnalysis] → [generateAIProposals] → [AIProposalCards]
                           ↓
                    [registerImprovementPlan] → workplace_improvement_plans
                           ↓
                    [getImprovementPlans] → [FollowUpStatus]
```
