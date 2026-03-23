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

const MARKDOWN = `# 勤怠管理ダッシュボード 各カードの見方・仕組みマニュアル

この勤怠管理ダッシュボードは、テナント内の全従業員の勤怠状況を一元的に把握し、残業時間やアラート、法令違反リスクを管理するための人事担当者専用画面です。ここでは、画面上部に表示される4つの主要な統計カードの見方と仕組みについて詳しく解説します。

---

## 1. 総従業員数カード

### 見方

このカードには、現在のテナントに所属する全従業員の人数が表示されます。例えば「10名」と表示されていれば、そのテナントに登録されている従業員が10人いることを示します。

### 仕組み

総従業員数は、従業員情報を管理しているデータベースの\`employees\`テーブルから取得されます。ここでは、テナントIDで絞り込みを行い、現在有効な従業員の数をカウントしています。退職者や無効なアカウントは除外されるため、実際に勤怠管理対象となる人数が反映されます。

この数値は、勤怠管理の母数として重要です。例えば、残業時間の平均値やアラート件数の割合を計算する際の基準となります。

---

## 2. 平均残業時間カード

### 見方

このカードには、テナント内の従業員の「平均残業時間」が表示されます。例えば「0時間0分/月」と表示されていれば、全従業員の残業時間の平均がゼロであることを示します。

カードの下部には「平均を上回る従業員で絞り込み」との注釈があり、クリックすると平均残業時間を超える従業員のリストにフィルタリングされます。

### 仕組み

平均残業時間は、\`overtime_monthly_stats\`テーブルから当該月の全従業員の残業時間を集計し、人数で割った値です。残業時間は法定労働時間を超えた労働時間を指し、36協定の上限管理に直結します。

このカードは、組織全体の残業傾向を把握するのに役立ちます。平均残業時間が高い場合は、労働時間の適正化や業務改善の必要性を示唆します。

---

## 3. アラート件数カード（未解決）

### 見方

このカードには、現在未解決の残業アラート件数が表示されます。例えば「0件」と表示されていれば、対応が必要な残業アラートは存在しないことを意味します。

カードの下部には「未解決アラートのある従業員」との注釈があり、クリックすると未解決アラートを持つ従業員の一覧に絞り込まれます。

### 仕組み

アラートは、\`overtime_alerts\`テーブルに記録されている残業時間超過や法令違反リスクに関する警告情報です。未解決のアラートとは、まだ人事担当者や管理者が対応・確認していない状態のものを指します。

アラートの種類には、月45時間超過、月100時間超過、2～6ヶ月平均80時間超過、年間360時間超過などがあります。これらは労働基準法や36協定に基づく法令遵守のための重要指標です。

このカードは、組織内で対応が必要な残業問題の有無を即座に把握できるため、優先的に確認すべき項目です。

---

## 4. 法令違反リスクカード

### 見方

このカードには、法令違反リスクのある従業員数が表示されます。例えば「0名」と表示されていれば、現在法令違反の可能性がある従業員はいないことを示します。

カードの下部には「月45時間超・6ヶ月平均80時間超・年360時間超 等」と注記があり、どの基準でリスク判定しているかがわかります。

### 仕組み

法令違反リスクは、残業時間が労働基準法や36協定の上限を超えている可能性がある従業員を特定したものです。具体的には以下の基準で判定されます。

- 月間残業時間が45時間を超えている
- 直近6ヶ月の平均残業時間が80時間を超えている
- 年間残業時間が360時間を超えている

これらの基準は、厚生労働省のガイドラインに準拠しており、超過した場合は企業に対して是正措置が求められます。

このカードは、法令違反リスクのある従業員を早期に発見し、適切な対応を促すための重要な指標です。リスクが高い場合は、個別面談や業務調整、健康管理措置の検討が必要となります。

---

## 総括

これら4つのカードは、勤怠管理ダッシュボードの中核をなす統計情報であり、人事担当者が組織の労働時間状況を俯瞰的に把握するための重要なツールです。

- **総従業員数**は管理対象の母数を示し、
- **平均残業時間**は組織全体の残業傾向を示し、
- **アラート件数**は対応が必要な残業超過の警告を示し、
- **法令違反リスク**は法令遵守の観点から特に注意すべき従業員数を示します。

これらの数値を定期的に確認し、異常値や増加傾向があれば速やかに原因分析と対策を行うことが、健全な労務管理と従業員の健康維持につながります。

---

# 実装上の補足
- CardExplanationModal.tsx の MARKDOWN は改変禁止です。ファイル内で const MARKDOWN = \`...\` として扱ってください。
- モーダル本文は react-markdown に渡してレンダリングしてください。h3（###）のレンダリングにカスタムスタイルを当てて背景付きの見出しを実現してください。
- 完了後、変更ファイル一覧・CardExplanationModal のコード全文・AttendanceDashboard の差分を必ず提示してください。
`

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-semibold mb-2 text-gray-900">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold mt-8 mb-3 text-gray-900 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-2 px-3 py-2 bg-indigo-50 border-l-4 border-indigo-400 rounded-md text-gray-900 font-semibold">
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
  li: ({ children }) => (
    <li className="text-gray-700 leading-7 [&>p]:mb-0">{children}</li>
  ),
  code: ({ children }) => (
    <code className="bg-gray-900 text-white rounded px-1 py-0.5 text-sm font-mono">{children}</code>
  ),
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  hr: () => <hr className="my-8 border-gray-200" />,
}

type CardExplanationModalProps = {
  children: React.ReactNode
}

/** 勤怠ダッシュボード統計カードの見方・仕組み（マークダウン）を表示するモーダル */
export function CardExplanationModal({ children }: CardExplanationModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-[800px] flex flex-col gap-0 overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-lg [&>button]:text-white [&>button]:hover:bg-white/15 [&>button]:hover:text-white [&>button]:focus-visible:ring-white/40">
        <DialogHeader className="rounded-t-lg border-0 bg-sky-600 px-6 pb-4 pt-5 pr-14 text-white sm:px-8 sm:pb-5 sm:pt-6 sm:pr-16">
          <DialogTitle className="text-lg font-semibold text-white sm:text-xl">
            勤怠管理ダッシュボード 各カードの見方・仕組み
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
