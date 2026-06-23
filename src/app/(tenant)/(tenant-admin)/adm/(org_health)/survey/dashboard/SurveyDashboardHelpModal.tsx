'use client'

import React, { useEffect } from 'react'
import { X, HelpCircle } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
}

/** 組織健康度ダッシュボードの見方（一般向け） */
export function SurveyDashboardHelpModal({ open, onClose }: Props) {
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
        aria-labelledby="survey-dashboard-help-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[min(90vh,760px)] flex flex-col border border-slate-200"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0" />
            <h2 id="survey-dashboard-help-title" className="text-base font-bold text-slate-900 truncate">
              この画面の見方
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
              月ごとの職場アンケートの結果を、会社全体でざっと把握するための画面です。数字の良し悪し、どの部署に目を向けたらよいか、コメントから何が読み取れるかを、一枚で見られるようにしています。
              なお、ここで示す分析は<strong>ストレスチェックの結果を根拠</strong>にしています。
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">上の3つのカード</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>総合健康度スコア</strong>
                ：職場の調子を5点満点の平均で表した「会社全体のまとめの点数」です。
                <strong>前月比</strong>
                は、ひとつ前の月と比べて平均が上がったか下がったかの目安です。
              </li>
              <li>
                <strong>アンケート回答率</strong>
                ：対象の方のうち、何％が回答したかです。「○名回答済／全△名」で、全員の声がどれだけ集まっているかも確認できます。率が低いと、平均は一部の意見に偏りやすいので、数字を見るときの注意材料になります。
              </li>
              <li>
                <strong>要注意アラート数</strong>
                ：特に様子を見た方がよいと拾った件数です。スコアの急落や、ネガティブな傾向が強い部署など、フォローを検討するきっかけとして出ています。
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">中段・左（AI フリーコメント感情分析）</h3>
            <p className="mb-2">
              自由記述のコメントをもとに、文章で要約し、よく出てくる言葉を集めたエリアです。
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>インサイトの文章</strong>：全体としてどんなことが言われているかを、短いストーリーとして読むと分かりやすいです。
              </li>
              <li>
                <strong>ポジティブ／ネガティブ用語</strong>：コメントに多く出たキーワードの例です。満足や期待が表れやすい話題、負担や不満が表れやすい話題の目安になります。
              </li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              「AI」とは、人が全部読む前に傾向をまとめて見せるための支援だと考えてください。
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">中段・右（カテゴリ別スコア）</h3>
            <p className="mb-2">満足度をテーマごとに分けた点数（いずれも5点満点）です。</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>仕事のやりがい … 仕事そのものへの手応え</li>
              <li>職場環境 … 場所・働き方のしやすさなど</li>
              <li>人間関係 … 周りとの関わり</li>
              <li>会社への共感 … 方針や会社への納得感</li>
            </ul>
            <p className="mt-2">
              バーの長さはそのテーマの平均の高さです。どの柱が高い／低いかで、次に話し合うとよいテーマの当たりを付けられます。
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">下段（部署別コンディション一覧）</h3>
            <p className="mb-2">部署ごとに次の4つを並べています。</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>部署名</strong>：どのチームの数字か
              </li>
              <li>
                <strong>回答率</strong>：その部署で何％が回答したか。低いと、その部署のスコアは参考程度にした方がよいことがあります。
              </li>
              <li>
                <strong>総合スコア</strong>：その部署の平均のまとめ。全社平均と比べて高いか低いかを見るとよいです。
              </li>
              <li>
                <strong>ステータス</strong>：
                <strong>良好</strong>
                はいま順調、
                <strong>安定</strong>
                は大きな問題は目立たない、
                <strong>要注意</strong>
                はフォローやヒアリングを検討した方がよい、という目印です。
              </li>
            </ul>
          </section>

          <section className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2.5 text-indigo-950 text-xs leading-relaxed">
            <strong className="font-semibold">読み方のコツ：</strong>
            上の3つで「全体の温度・回答の厚み・気をつける件数」を掴み、中段で「何が言われているか・どの方面が弱いか」を読み、下の表で「どの部署を詳しく見るか」を決めると、画面の意味がつながりやすくなります。
          </section>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}

export function SurveyDashboardHelpModalTrigger() {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
        見方・説明
      </button>
      <SurveyDashboardHelpModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
