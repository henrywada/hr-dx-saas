"use client";

import React, { useState } from "react";
import { Lightbulb, X } from "lucide-react";

export function TipsModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors shadow-sm"
      >
        <Lightbulb className="w-4 h-4 text-purple-600" />
        活用ヒント
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#232a33]/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e6ec] bg-[#f6f8fa]/50">
              <h2 className="text-lg font-bold text-[#24292f] flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-purple-500" />
                AI求人メーカー 活用ヒント
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-[#57606a] hover:text-[#57606a] hover:bg-[#f6f8fa] rounded-md transition-colors"
                aria-label="閉じる"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="px-6 py-6 overflow-y-auto">
              <div className="space-y-8">
                
                {/* Section 1 */}
                <section>
                  <h3 className="text-md font-bold text-[#24292f] mb-4 flex items-center gap-2 border-b border-purple-100 pb-2">
                    <span className="text-xl">📝</span> 良い原稿を作るための「入力のコツ」
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-[#f6f8fa] rounded-lg p-4 border border-[#e2e6ec]">
                      <p className="font-bold text-[#24292f] mb-2">① 課題は「具体的に」書く</p>
                      <ul className="text-sm space-y-1.5">
                        <li className="flex gap-2 text-[#57606a]"><span className="text-red-400 font-bold">×</span>惜しい：エンジニアが足りない</li>
                        <li className="flex gap-2 text-[#24292f]"><span className="text-emerald-500 font-bold">〇</span>良い：リリース間近の自社プロダクトのバグ修正と機能追加を、自走して任せられるReactエンジニアが足りない</li>
                      </ul>
                    </div>

                    <div className="bg-[#f6f8fa] rounded-lg p-4 border border-[#e2e6ec]">
                      <p className="font-bold text-[#24292f] mb-2">② 飾らない「リアルな魅力」を書く</p>
                      <p className="text-sm text-[#57606a]">
                        制度だけでなく、社風や「実は〇〇」というポイントがAIのスパイスになります。<br />
                        <span className="text-[#57606a] text-xs mt-1 block">（例：残業ほぼゼロ、社長が元エンジニアで話が早い、フルリモートだけどチャットの雑談が多い 等）</span>
                      </p>
                    </div>

                    <div className="bg-[#f6f8fa] rounded-lg p-4 border border-[#e2e6ec]">
                      <p className="font-bold text-[#24292f] mb-2">③ チケットを使って何度でも試す</p>
                      <p className="text-sm text-[#57606a]">
                        キーワードを少し変えるだけで、全く違う切り口の提案が出ます。チケットを使って色々な表現を試してみてください！
                      </p>
                    </div>
                  </div>
                </section>

                {/* Section 2 */}
                <section>
                  <h3 className="text-md font-bold text-[#24292f] mb-4 flex items-center gap-2 border-b border-[#e2e6ec] pb-2">
                    <span className="text-xl">🚀</span> AIが作ったコンテンツの「最強の活用法」
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-[#FD7601] flex items-center gap-1.5 mb-2 text-sm">
                        <span>📌</span> AIキャッチコピー・求人原稿
                      </h4>
                      <ul className="list-disc list-inside text-sm text-[#57606a] space-y-1.5 pl-1.5">
                        <li>Wantedly、Greenなどの <strong className="text-[#24292f] font-semibold">求人媒体のタイトル・募集本文</strong> にコピペして、応募率アップ！</li>
                        <li><strong className="text-[#24292f] font-semibold">自社の採用ページ（Careers）</strong> のメッセージとしても最適です。</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-[#FD7601] flex items-center gap-1.5 mb-2 text-sm">
                        <span>📌</span> AIスカウト文
                      </h4>
                      <ul className="list-disc list-inside text-sm text-[#57606a] space-y-1.5 pl-1.5">
                        <li>ビズリーチやLinkedInなどの <strong className="text-[#24292f] font-semibold">スカウト媒体</strong> でそのまま送信！</li>
                        <li>冒頭に「〇〇さんのご経歴を拝見し〜」と一言添えるだけで、さらに返信率が跳ね上がります。</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-bold text-[#FD7601] flex items-center gap-1.5 mb-2 text-sm">
                        <span>📌</span> AI面接ガイド
                      </h4>
                      <ul className="list-disc list-inside text-sm text-[#57606a] space-y-1.5 pl-1.5">
                        <li>面接を担当する現場の社員に事前に共有し、<strong className="text-[#24292f] font-semibold">「どんな質問で、何を見極めるか」の目線合わせ</strong> に活用してください。</li>
                      </ul>
                    </div>
                  </div>
                </section>
                
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#e2e6ec] bg-[#f6f8fa] flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#24292f] hover:bg-[#f6f8fa] rounded-md transition-colors"
              >
                閉じる
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
