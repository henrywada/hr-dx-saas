'use client'

import React, { useEffect } from 'react'
import { X, HelpCircle } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
}

/** ストレスチェック × Echo クロス分析の算出方法（一般向け説明文） */
export function PulseStressCalculationModal({ open, onClose }: Props) {
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
        aria-labelledby="pulse-stress-calc-modal-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[min(90vh,720px)] flex flex-col border border-slate-200"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
            <h2 id="pulse-stress-calc-modal-title" className="text-base font-bold text-slate-900 truncate">
              この画面の見方（数字の意味）
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
            <h3 className="font-bold text-slate-900 mb-2">この画面でしていること</h3>
            <p>
              毎月の職場の調査（Echo）の結果と、年に一度のストレスチェックの結果を、同じ画面で照らし合わせています。グラフに載るのは、「いま対象になっているストレスチェックに回答済みの方」に限ります。
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">左のグラフ（時系列）</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>横（左から右）</strong>：Echo の回答がある月を、古い順に並べています。
              </li>
              <li>
                <strong>青い線</strong>：その月に、対象の方一人ひとりの Echo の平均点を出し、さらに全員ぶんを平均した値です。
              </li>
              <li>
                <strong>うすい色の帯（健康リスク）</strong>：健康リスクは本来、年に一度まとまった数字です。見やすさのため、部署ごとの結果を全社で平均した「いまの会社全体の目安」を一つにまとめ、月が変わっても同じ高さの帯として表示しています。まだ集計がないときは、目安として 100 前後で表示することがあります。
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">右のグラフ（部署ごとの散布図）</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>縦（下から上）</strong>：直近 3 か月の Echo について、一人ひとりの月ごとの平均点を出し、回答があった月だけを使って平均します。そのうえで、部署の中の人数でもう一度平均しています。回答が少ない部署は、真ん中付近の値に寄りやすくなります。
              </li>
              <li>
                <strong>横（左から右）</strong>：ストレスチェックで、部署単位にまとめた「健康面の負担の度合い」の指標です。数字が大きいほど、負担が大きい側と考えてください。軸の左右は見やすさのため入れ替えているだけで、意味としては「大きいほど負担が大きい」のままです。
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">下の「要注意リスト」</h3>
            <p className="mb-2">
              次の<strong>両方</strong>に当てはまる方だけが一覧に出ます。
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>上司からのサポートが低い</strong>：ストレスチェックの設問のうち「上司からのサポート」について、点数が低い水準（5 段階で 2 以下）になっている。
              </li>
              <li>
                <strong>Echo が 3 か月連続で下がっている</strong>：過去に回答があった月だけを時系列に並べ、いちばん新しい 3 か月について、「毎月、前の月より点数だけが下がっている」とき（きっちり下がり続けているとき）に「下がり続けている」とみなします。
              </li>
            </ul>
          </section>

          <section className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5 text-amber-900 text-xs leading-relaxed">
            <strong className="font-semibold">補足：</strong>
            別の画面で使うことのある「個人の健康リスクの目安」は、この左の帯や右の横軸の数字とは別物です。ここでは部署単位のストレスチェック結果を使っています。
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

/** ページ見出し横：見方・説明モーダル */
export function PulseStressCalculationModalTrigger() {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors shrink-0"
      >
        <HelpCircle className="w-4 h-4" />
        見方・説明
      </button>
      <PulseStressCalculationModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
