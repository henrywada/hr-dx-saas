'use client'

interface Props {
  onClose: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-gray-700">{children}</div>
    </section>
  )
}

function FactorRow({ label, points, rule }: { label: string; points: string; rule: string }) {
  return (
    <li className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-800">{label}</span>
        <span className="font-mono text-xs font-semibold text-primary">{points}</span>
      </div>
      <p className="mt-0.5 text-xs text-gray-500">{rule}</p>
    </li>
  )
}

export function ScreenHelpModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">画面の説明：離職予兆スコアリング</h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-300 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto p-6">
          <Section title="1. 画面の使い方">
            <p>
              この画面は、全従業員の「離職リスクスコア」を算出し、リスクが高い従業員を早期に発見するためのダッシュボードです。基本的な流れは以下の通りです。
            </p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                「スコア再計算」ボタンを押して、最新データで全従業員のスコアを算出します（計算式は「3.」参照）。
              </li>
              <li>サマリーカードで全体の傾向（高・中・低リスクの人数）を確認します。</li>
              <li>フィルターピルで「高リスク」等に絞り込み、対応が必要な従業員を確認します。</li>
              <li>
                気になる従業員の「詳細」ボタンで、スコアの内訳（どの要因が高いのか）を確認します。
              </li>
              <li>
                1on1や面談などの対応を行ったら「記録」ボタンから記録します。過去の対応履歴も同じ画面で確認できます。
              </li>
            </ol>
            <p className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800">
              新たに「高リスク」へ変化した従業員が発生すると、その従業員の上長と人事担当者へ自動でメール通知が送信されます。
            </p>
          </Section>

          <Section title="2. 各項目・ボタンの説明">
            <div>
              <p className="font-medium text-gray-800">サマリーカード</p>
              <p>
                画面上部の4枚のカードです。対象者合計と、高・中・低リスクそれぞれの人数を表示します。
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-800">
                フィルターピル（すべて／高リスク／中リスク／低リスク）
              </p>
              <p>一覧表をリスクレベルで絞り込みます。右側に絞り込み後の対象人数が表示されます。</p>
            </div>
            <div>
              <p className="font-medium text-gray-800">一覧表の項目</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <span className="font-medium">順位</span>：スコアが高い順の並び順です。
                </li>
                <li>
                  <span className="font-medium">氏名／部署</span>：対象従業員の氏名と所属部署です。
                </li>
                <li>
                  <span className="font-medium">リスクレベル</span>：
                  <span className="mx-1 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 ring-1 ring-red-300">
                    高
                  </span>
                  <span className="mx-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700 ring-1 ring-yellow-300">
                    中
                  </span>
                  <span className="mx-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 ring-1 ring-green-300">
                    低
                  </span>
                  の3段階で表示されます（判定基準は「3.」参照）。
                </li>
                <li>
                  <span className="font-medium">スコア</span>
                  ：算出されたリスクスコアです。数値が高いほどリスクが高いことを示します。
                </li>
                <li>
                  <span className="font-medium">直近アクション</span>
                  ：その従業員に対して直近で記録された対応（1on1実施・カウンセリング等）です。「未実施」は記録がまだないことを示します。
                </li>
                <li>
                  <span className="font-medium">算出日</span>：スコアが計算された日付です。
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-800">操作ボタン</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <span className="font-medium">詳細</span>
                  ：その従業員のスコア内訳（どの要因が何点か）をモーダルで表示します。
                </li>
                <li>
                  <span className="font-medium">記録</span>
                  ：1on1・カウンセリング・上長面談・人事面談・その他の対応を記録します。過去の記録一覧もここに表示されます。
                </li>
                <li>
                  <span className="font-medium">スコア再計算</span>
                  ：全従業員分のスコアを最新データで再計算します。詳しい計算式は次のセクションを参照してください。
                </li>
              </ul>
            </div>
          </Section>

          <Section title="3. 「スコア再計算」の具体的な計算式">
            <p>
              リスクスコアは、以下の5つの要因の点数を合計して算出されます。各要因は、直近のストレスチェック・パルスサーベイ・勤怠・アンケート・1on1／評価等のデータをもとに自動計算されます。
            </p>
            <ul className="space-y-2">
              <FactorRow
                label="① ストレスチェック"
                points="最大 35点"
                rule="直近のストレスチェックが「高ストレス」判定の場合：35点／それ以外：0点"
              />
              <FactorRow
                label="② パルスサーベイ"
                points="最大 30点"
                rule="直近スコアが3.0未満（5点満点中）：30点／3.0以上4.0未満：15点／4.0以上またはデータなし：0点"
              />
              <FactorRow
                label="③ 残業・勤怠"
                points="最大 20点"
                rule="前月比+20時間以上の増加、または月80時間超：20点／月45時間超：10点／それ以外：0点"
              />
              <FactorRow
                label="④ アンケート未回答"
                points="最大 15点"
                rule="直近3回のアンケートのうち2回以上未回答：15点／1回未回答：7点／すべて回答済み：0点"
              />
              <FactorRow
                label="⑤ 成長・評価（1on1・評価・スキル・eラーニング）"
                points="最大 40点"
                rule="次の該当項目ごとに加点：1on1が30日以上未実施（+12点）／評価が未確定（+12点）／スキルギャップあり（+8点）／eラーニング未完了（+8点）"
              />
            </ul>
            <p className="rounded-lg bg-gray-100 px-3 py-2 font-mono text-xs text-gray-700">
              リスクスコア = ① + ② + ③ + ④ + ⑤
            </p>
            <div>
              <p className="mb-1 font-medium text-gray-800">リスクレベルの判定基準</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  60点以上：<span className="font-medium text-red-600">高リスク</span>
                </li>
                <li>
                  30点以上60点未満：<span className="font-medium text-yellow-600">中リスク</span>
                </li>
                <li>
                  30点未満：<span className="font-medium text-green-600">低リスク</span>
                </li>
              </ul>
            </div>
          </Section>
        </div>

        <div className="flex justify-end border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
