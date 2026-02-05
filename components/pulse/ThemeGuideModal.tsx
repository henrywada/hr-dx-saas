// components/pulse/ThemeGuideModal.tsx
"use client"

import React from 'react'
import { X, Target, TrendingUp, AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ThemeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeGuideModal({ isOpen, onClose }: ThemeGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* ヘッダー */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">パルス診断テーマの仕組み</h2>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-white hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          
          {/* セクション1: 目的 */}
          <section className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-3">📊 パルス診断テーマ選択の目的</h3>
                <div className="space-y-2 text-gray-700 leading-relaxed">
                  <p>
                    パルス診断テーマ選択機能は、<strong>組織の健康状態を効果的に可視化</strong>するための基盤となる仕組みです。
                  </p>
                  <p>
                    管理者が選択したテーマに基づき、AIが<strong>最適なタイミングで最適な質問を従業員に提示</strong>することで、
                    組織の課題を早期発見し、適切な対策を講じることが可能になります。
                  </p>
                  <p className="text-sm text-blue-900 bg-blue-100 rounded-lg p-3 mt-3">
                    💡 <strong>キーポイント：</strong>従業員の負担を最小限に抑えながら、組織にとって本当に重要な情報を継続的に収集します。
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* セクション2: 期待効果 */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              ✨ 上手に運用した時の期待効果
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <h4 className="font-bold text-emerald-900">早期発見・早期対応</h4>
                </div>
                <p className="text-sm text-emerald-900/80">
                  離職リスクやメンタル不調の兆候を早期にキャッチし、深刻化する前に対策を講じることができます。
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <h4 className="font-bold text-blue-900">データドリブンな組織運営</h4>
                </div>
                <p className="text-sm text-blue-900/80">
                  勘や経験則ではなく、実データに基づいた意思決定が可能になり、施策の効果測定も容易になります。
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  <h4 className="font-bold text-purple-900">従業員エンゲージメント向上</h4>
                </div>
                <p className="text-sm text-purple-900/80">
                  従業員の声が組織に届いていることを実感でき、心理的安全性とエンゲージメントが向上します。
                </p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">4</span>
                  </div>
                  <h4 className="font-bold text-amber-900">コスト削減と生産性向上</h4>
                </div>
                <p className="text-sm text-amber-900/80">
                  離職率の低下、メンタル不調による休職の減少、組織の生産性向上につながります。
                </p>
              </div>
            </div>
          </section>

          {/* セクション3: テーマとは */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">🎯 テーマとは？各テーマの目的</h3>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <p className="text-gray-700 mb-4 leading-relaxed">
                <strong>テーマ</strong>とは、組織の健康状態を測定するための<strong>診断項目</strong>のことです。
                各テーマには複数の質問が紐づいており、従業員の回答から組織の状態を可視化します。
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 bg-white rounded-lg p-3 border border-gray-200">
                  <span className="text-rose-600 font-bold">例：</span>
                  <div className="flex-1">
                    <strong className="text-gray-900">離職リスク測定</strong>
                    <p className="text-gray-600 mt-1">
                      目的：従業員の退職意向を早期発見し、離職を未然に防ぐ
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white rounded-lg p-3 border border-gray-200">
                  <span className="text-blue-600 font-bold">例：</span>
                  <div className="flex-1">
                    <strong className="text-gray-900">心理的安全性</strong>
                    <p className="text-gray-600 mt-1">
                      目的：チーム内で安心して意見を言える環境かを測定し、イノベーション創出を促進
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 bg-white rounded-lg p-3 border border-gray-200">
                  <span className="text-amber-600 font-bold">例：</span>
                  <div className="flex-1">
                    <strong className="text-gray-900">業務量の適正性</strong>
                    <p className="text-gray-600 mt-1">
                      目的：過重労働やバーンアウトのリスクを早期発見し、健康経営を実現
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* セクション4: AIによる最適化（マンネリ化回避） */}
          <section className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-6 border border-indigo-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Lightbulb className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-3">🤖 AIによる最適化された質問の自動選択</h3>
                <div className="space-y-3 text-gray-700 leading-relaxed">
                  <p>
                    複数のテーマを選択すると、従業員がパルス回答を開くたびに、
                    <strong className="text-indigo-700">AIが最も重要なテーマを自動で選択</strong>して質問を提示します。
                  </p>
                  
                  <div className="bg-white rounded-lg p-4 border border-indigo-200">
                    <p className="font-semibold text-indigo-900 mb-2">🎯 マンネリ化を回避する仕組み</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span><strong>毎回同じ質問にならない：</strong>組織の状況に応じて質問内容が変化します</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span><strong>回答率の維持：</strong>新鮮な質問により、従業員の回答意欲が持続します</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span><strong>効率的な診断：</strong>今最も重要な情報だけを収集し、負担を最小化します</span>
                      </li>
                    </ul>
                  </div>

                  <p className="text-sm text-indigo-900 bg-indigo-100 rounded-lg p-3">
                    💡 <strong>従業員にとっても管理者にとってもWin-Win：</strong>
                    従業員は短時間で回答でき、管理者は組織の課題に優先順位をつけて対応できます。
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* セクション5: AIの自動選定ロジック */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              🧠 自動選定AIのロジック（優先度計算）
            </h3>
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <p className="text-gray-700 mb-4 leading-relaxed">
                AIは以下の<strong>2つの指標</strong>を組み合わせて、各テーマの優先度を自動計算します：
              </p>
              
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-4 border border-rose-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-rose-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-2">① 平均スコアが低いテーマ（問題の早期発見）</p>
                      <p className="text-sm text-gray-600 mb-2">
                        最近の回答から算出した平均スコアが低いテーマほど、<strong>優先度が高く</strong>なります。
                      </p>
                      <div className="bg-rose-50 rounded p-2 text-xs text-rose-900">
                        <strong>計算式：</strong>(5 - 平均スコア) × 10 = 優先度ポイント<br/>
                        <span className="text-rose-700">例：平均2.0 → (5-2.0)×10 = 30ポイント</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-orange-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-2">② 未対応アラートが多いテーマ（継続監視）</p>
                      <p className="text-sm text-gray-600 mb-2">
                        対応待ちのアラート件数が多いテーマは、<strong>継続的な監視が必要</strong>と判断されます。
                      </p>
                      <div className="bg-orange-50 rounded p-2 text-xs text-orange-900">
                        <strong>計算式：</strong>未対応アラート数 × 5 = 優先度ポイント<br/>
                        <span className="text-orange-700">例：アラート3件 → 3×5 = 15ポイント</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg p-4">
                  <p className="font-bold mb-2">🎯 最終優先度 = ①平均スコアポイント + ②アラート数ポイント</p>
                  <p className="text-sm opacity-90">
                    優先度が最も高いテーマが自動選択され、従業員に表示されます。
                  </p>
                  <div className="mt-3 bg-white/20 rounded p-2 text-xs">
                    <strong>実例：</strong>「離職リスク」平均2.5点、アラート3件 → (5-2.5)×10 + 3×5 = <strong className="text-yellow-300">40ポイント</strong> → 最優先で表示
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* セクション6: おすすめバッジ */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              「おすすめ」バッジの意味
            </h3>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
              <p className="text-gray-700 mb-4 leading-relaxed">
                以下の<strong>いずれか1つでも</strong>条件を満たすテーマには、
                <strong className="text-amber-600">「おすすめ」バッジ</strong>が表示されます：
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 bg-white rounded-lg p-4 border border-amber-300">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">1</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">最近7日間でアラートが3件以上発生</p>
                    <p className="text-sm text-gray-600">→ トレンドが悪化している兆候</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white rounded-lg p-4 border border-amber-300">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">平均スコアがアラート閾値を下回っている</p>
                    <p className="text-sm text-gray-600">→ すでに問題が顕在化している状態</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white rounded-lg p-4 border border-amber-300">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">3</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">未対応アラートが3件以上ある</p>
                    <p className="text-sm text-gray-600">→ 早急な対応が必要な状態</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg border-2 border-amber-400">
                <p className="font-bold text-amber-900 mb-2">💡 活用のコツ</p>
                <p className="text-sm text-amber-900">
                  <strong>「おすすめ」バッジがついているテーマは、組織の健康状態に赤信号が灯っているサイン</strong>です。
                  優先的に選択し、状況把握と対策立案を急ぎましょう。
                </p>
              </div>
            </div>
          </section>

          {/* セクション7: 推奨運用・ヒント */}
          <section className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
            <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              💡 上手に運用するヒント・推奨運用
            </h3>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-emerald-200">
                <p className="font-semibold text-emerald-900 mb-2">✅ 最初は3〜5個のテーマから始める</p>
                <p className="text-sm text-gray-700">
                  多すぎるとデータ分析が大変になり、少なすぎると組織の全体像が見えません。
                  まずは<strong>「離職リスク」「業務量」「心理的安全性」</strong>など、
                  多くの組織で重要なテーマから始めましょう。
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-emerald-200">
                <p className="font-semibold text-emerald-900 mb-2">✅ 「おすすめ」を最優先で選択</p>
                <p className="text-sm text-gray-700">
                  AIが推奨するテーマは、データに基づいた客観的な判断です。
                  直感や思い込みではなく、<strong>データドリブンな選択</strong>を心がけましょう。
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-emerald-200">
                <p className="font-semibold text-emerald-900 mb-2">✅ 月1回は選択テーマを見直す</p>
                <p className="text-sm text-gray-700">
                  組織の課題は時間とともに変化します。
                  <strong>定期的にテーマを見直し</strong>、新たな課題に焦点を当てましょう。
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-emerald-200">
                <p className="font-semibold text-emerald-900 mb-2">✅ 回答データを定期的に確認</p>
                <p className="text-sm text-gray-700">
                  パルス診断は<strong>継続的なモニタリング</strong>が重要です。
                  週次または月次でデータを確認し、トレンドの変化を見逃さないようにしましょう。
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-emerald-200">
                <p className="font-semibold text-emerald-900 mb-2">✅ アラートには48時間以内に対応</p>
                <p className="text-sm text-gray-700">
                  アラートが発生したら、できるだけ早く対応することが重要です。
                  <strong>48時間以内に状況確認・初期対応</strong>を行うことを推奨します。
                </p>
              </div>

              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg p-4">
                <p className="font-bold mb-2">🎯 成功のための黄金ルール</p>
                <p className="text-sm opacity-95">
                  「選んで終わり」ではなく、<strong>「選ぶ → 診断 → 分析 → 対策 → 効果測定」のサイクルを回す</strong>ことが、
                  パルス診断を成功させる鍵です。データを活かして、組織を継続的に改善していきましょう。
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <Button 
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            理解しました
          </Button>
        </div>
      </div>
    </div>
  )
}
