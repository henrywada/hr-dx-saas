'use client'

import React, { useEffect } from 'react'
import { X, HelpCircle } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
}

/** AI職場改善提案 — 生成のしかた（一般向け） */
export function AIWorkplaceImprovementHelpModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-workplace-help-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[min(90vh,780px)] flex flex-col border border-slate-200"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
            <h2 id="ai-workplace-help-title" className="text-base font-bold text-slate-900 truncate">
              この画面の見方（提案がどう作られるか）
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 text-sm text-slate-700 leading-relaxed space-y-5">
          <section>
            <h3 className="font-bold text-slate-900 mb-2">この画面の役割</h3>
            <p>
              いま会社に蓄積されている<strong>ストレスチェックの「集団分析」</strong>
              （部署ごとにまとめた数字）を材料に、
              <strong>職場改善のたたき台となる文章</strong>を自動で用意する画面です。
              人が白紙から書いているのではなく、
              <strong>あらかじめある分析数字を読み取り、AIが文章にしている</strong>と考えると分かりやすいです。
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">生成の流れ</h3>
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                <strong>材料になるデータ</strong>
                <br />
                「現在の集団分析結果からAI提案を生成する」を押すと、システムが
                <strong>ストレスチェックの集団分析</strong>
                （部署ごとの人数、健康リスク、高ストレスの割合、仕事の負担や上司・同僚からのサポートなどの点数、前の期間との比較など）を読み込みます。
                <strong>個人名や一人ひとりの回答そのものではなく、部署単位でまとめられた結果</strong>
                が使われます。
              </li>
              <li>
                <strong>AIがすること</strong>
                <br />
                その内容を、労働安全衛生のマニュアル第8章の考え方に沿って読むよう指示されたAIに渡し、
                <strong>必ず3件</strong>の提案にまとめさせます。それぞれに、タイトル・根拠となる傾向の説明・具体的なアクションの列挙・優先度（高・中・低）・期待できる効果が含まれます。
                健康リスクや高ストレスの割合が高い部署、点数が低い項目、前と比べて悪化している部署などを優先しやすいよう、あらかじめルールが決められています。
              </li>
              <li>
                <strong>カードに表示されるもの</strong>
                <br />
                生成が終わると、AIが返した3件がカードとして並びます。部署名や優先度、分析の文章、アクションのリスト、期待される効果は、
                <strong>上記の集団分析とAIへの指示から作られた文案</strong>
                です。条件やタイミングによって、毎回まったく同じ文にはならないことがあります。
              </li>
            </ol>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">「職場改善計画に登録」ボタン</h3>
            <p>
              各カードの登録ボタンは、その提案文を
              <strong>会社の職場改善計画として保存する</strong>
              操作です。保存後は、画面下の登録済み一覧などから追えるようになります（生成とは別のステップです）。
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">うまく動かないとき</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>集団分析がまだない</strong>
                … 材料がないため、提案を作れません。先にストレスチェックの集団分析が用意されている必要があります。
              </li>
              <li>
                <strong>AI連携の設定がない・無効</strong>
                … 外部のAIサービスに届かず、エラーになることがあります。管理者に設定を確認してもらってください。
              </li>
            </ul>
          </section>

          <section className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 text-blue-950 text-xs leading-relaxed">
            <strong className="font-semibold">ひとことで：</strong>
            部署別のストレスチェック集団分析の表をAIに渡す → AIが第8章の考え方に沿って3つの改善案を文章で書く → それがカードで見える。登録で正式な改善計画として残せる、という流れです。
          </section>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}

export function AIWorkplaceImprovementHelpModalTrigger() {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
        見方・説明
      </button>
      <AIWorkplaceImprovementHelpModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
