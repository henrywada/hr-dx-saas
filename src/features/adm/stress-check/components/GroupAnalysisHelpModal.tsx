'use client'

import React, { useEffect } from 'react'
import { X, HelpCircle } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
}

/** 集団分析ダッシュボードの見方（一般向け） */
export function GroupAnalysisHelpModal({ open, onClose }: Props) {
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
        aria-labelledby="group-analysis-help-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[min(90vh,820px)] flex flex-col border border-slate-200"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
            <h2 id="group-analysis-help-title" className="text-base font-bold text-slate-900 truncate">
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
              ストレスチェックの回答を、個人ではなく<strong>部署ごと</strong>にまとめて見る画面です。誰が悪いかを並べるためではなく、
              <strong>どの部署の職場環境に手を打った方がよさそうか</strong>を把握するためのものです。
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">健康リスクの数字（いちばん大事）</h3>
            <p className="mb-2">
              <strong>健康リスク</strong>は、全国の水準と比べた目安の指数です。
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>100</strong> … 全国の平均くらいのイメージです。
              </li>
              <li>
                <strong>100より小さい</strong> … 全国平均と比べて、負担やリスクの指標が低め（よい方向）と示されていることが多いです。
              </li>
              <li>
                <strong>100より大きい</strong> … 全国平均と比べて高めで、職場環境への配慮を検討した方がよいサインです。
              </li>
              <li>
                <strong>120を超える</strong> … この画面では「高リスク」として特に強く注意する区分です。
              </li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              <strong>高ストレス率（％）</strong>は、その部署で高ストレスと判定された方の割合の目安です。健康リスクの色（良好など）とは別指標なので、両方あわせて見てください。
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">上の3つのカード</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>部署数</strong> … 分析対象の部署の数です。
              </li>
              <li>
                <strong>平均健康リスク</strong> … 全社を人数で重み付けした平均です。前回比が付くときは、前の実施期間と比べて平均が上がったか下がったかの目安です。
              </li>
              <li>
                <strong>高リスク部署</strong> … 健康リスクが120より大きい部署の数です。0なら、その基準での「特に要警戒の部署」はありません。
              </li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">ヒートマップと右の詳細</h3>
            <p className="mb-2">
              左の<strong>部署別ヒートマップ</strong>は、各部署の健康リスクが全国平均と比べてどの程度かを一覧で見るためのものです。タイルをクリックすると、右の詳細がその部署に切り替わります。
            </p>
            <p className="mb-2">
              右の<strong>レーダー図</strong>は、選んだ部署について次の4つを示しています。
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>業務量 … 仕事の量の負担</li>
              <li>コントロール … 自分で仕事を調整できる度合い</li>
              <li>上司支援 … 上司からの支援を感じられる度合い</li>
              <li>同僚支援 … 同僚からの支援を感じられる度合い</li>
            </ul>
            <p className="mt-2">
              下の大きな数字はその部署の健康リスクで、<strong>全国平均＝100</strong>と並べて解釈します。
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">健康リスク推移（期間別）</h3>
            <p>
              ストレスチェックを複数回・複数期間実施し、データがたまると、時系列のグラフで見られます。期間が1回分しかないときは比較線が引けないため、2期間以上あると表示される、といった案内になることがあります。
            </p>
          </section>

          <section>
            <h3 className="font-bold text-slate-900 mb-2">高リスク部署（健康リスク120超）</h3>
            <p>
              健康リスクが120を超えた部署だけがリストされます。フォローや職場環境の改善を優先して検討するリストです。該当がなければ「高リスク部署はありません」と表示されます。
            </p>
          </section>

          <section className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 text-blue-950 text-xs leading-relaxed">
            <strong className="font-semibold">読み方のコツ：</strong>
            ストレスチェックの回答を部署単位で集計した結果が根拠です。健康リスクは全国平均100を基準に高い・低いを見る。120超は特に注意。ヒートマップで部署を選び、レーダーで4つの職場要因のバランスを見る。下のリストは120超の部署の抜き出し、という順で見るとつながりやすくなります。
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

export function GroupAnalysisHelpModalTrigger() {
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
      <GroupAnalysisHelpModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
