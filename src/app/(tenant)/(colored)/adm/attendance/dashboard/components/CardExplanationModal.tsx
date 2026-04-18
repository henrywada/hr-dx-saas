'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const MARKDOWN = `
# 出勤・退勤データの明細一覧 各カードの見方・仕組み解説

この明細一覧画面は、社内の全従業員の勤務状況を一元的に把握し、長時間労働の抑制や法令遵守（36協定等）のリスク管理を行うための人事担当者専用の管理画面です。ここでは、画面上部に表示される3つの主要な統計カードの見方と集計の仕組みについて解説します。

---

## 1. 総従業員数カード

### 見方

このカードには、現在システムに登録されている全従業員の人数が表示されます。例えば「10名」と表示されていれば、現在勤怠管理の対象となっているメンバーが合計で10人いることを示します。

### 仕組み

総従業員数は、システム上の最新の従業員名簿をもとに集計されます。退職された方や、現在アカウントを停止している方は自動的に除外されるため、今現在、実際に勤務が発生し勤怠管理が必要な人数が正確に反映されます。

この数値は、組織全体の労働状況を把握するための基本となる「母数」として利用されます。

---

## 2. 平均残業時間カード

### 見方

このカードには、組織全体の「一人あたりの平均残業時間」が表示されます。例えば「5時間30分/月」と表示されていれば、全従業員の残業時間を平均するとこの時間になることを示します。

カード下の「平均を上回る従業員で絞り込み」をクリックすると、組織全体の平均を超えて働いている従業員のみを一覧に表示できます。

### 仕組み

平均残業時間は、当月の全従業員の残業時間を合算し、対象人数で割って算出されます。ここでの「残業時間」は、雇用契約や法律で定められた所定の労働時間を超えて働いた時間を指し、36協定の上限管理に直結する重要な数値です。

組織全体の残業傾向（前月と比較して増えているか、特定の部署に偏っていないか等）を早期に把握するために役立ちます。

---

## 3. 法令違反リスクカード

### 見方

このカードには、労働基準法や36協定などの法律に抵呼するリスクが極めて高い、または既に超過している従業員数が表示されます。

カード下の注記（月45時間超、年360時間超など）は、どの法的基準に照らしてリスクを判定しているかを示しています。

### 仕組み

労働基準法の「時間外労働の上限規制」に基づき、以下の基準でリスクを判定しています。

- 月の残業時間が45時間を超えている（または超える見込み）
- 2〜6ヶ月の平均残業時間が80時間を超えている（「複数月平均80時間以内」の基準）
- 1年間の総残業時間が360時間を超えている（「年720時間以内」等の特別条項基準への進捗）

これらの基準は厚生労働省の指針に準拠しており、超過は企業としての法的リスクや、従業員の健康被害に直結します。早期に発見し、業務調整や健康相談などの措置を講じるための最優先の重要指標です。

---

## 総括

これら3つのカードを活用することで、人事担当者は組織の労働状況を俯瞰的に、かつリスクの高い箇所をピンポイントで把握できます。

- **総従業員数**：管理対象の全体規模
- **平均残業時間**：組織全体の労働負荷の傾向
- **法令違反リスク**：法的・健康上の重大なリスク

これらの数値を日々確認し、増加傾向や異常な数値が見られる場合には、速やかに原因を特定し対策を打つことが、適正な労務管理と健全な職場環境の維持に不可欠です。
`

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-semibold mb-2 text-gray-900">{children}</h1>,
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-md text-indigo-800 font-semibold">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="text-gray-700 leading-7 mb-4 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-4 list-disc pl-6 text-gray-700 leading-7 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal pl-6 text-gray-700 leading-7 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="text-gray-700 leading-7 [&>p]:mb-0">{children}</li>,
  code: ({ children }) => (
    <code className="bg-gray-900 text-white rounded px-1 py-0.5 text-sm font-mono">{children}</code>
  ),
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  hr: () => <hr className="my-8 border-gray-200" />,
}

type CardExplanationModalProps = {
  children: React.ReactNode
}

/** 出勤・退勤データの明細一覧の統計カードの見方・仕組み（マークダウン）を表示するモーダル */
export function CardExplanationModal({ children }: CardExplanationModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-[800px] flex flex-col gap-0 overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-lg [&>button]:text-white [&>button]:hover:bg-white/15 [&>button]:hover:text-white [&>button]:focus-visible:ring-white/40">
        <DialogHeader className="rounded-t-lg border-0 bg-sky-600 px-6 pb-4 pt-5 pr-14 text-white sm:px-8 sm:pb-5 sm:pt-6 sm:pr-16">
          <DialogTitle className="text-lg font-semibold text-white sm:text-xl">
            出勤・退勤データの明細一覧 各カードの見方・仕組み
          </DialogTitle>
          <DialogPrimitive.Description className="sr-only">
            画面上部の4つの統計カードの意味と、データがどのテーブル・基準に基づくかの説明です。
          </DialogPrimitive.Description>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8 sm:py-6 [scrollbar-gutter:stable]">
          <ReactMarkdown components={markdownComponents} skipHtml>
            {MARKDOWN}
          </ReactMarkdown>
        </div>
      </DialogContent>
    </Dialog>
  )
}
