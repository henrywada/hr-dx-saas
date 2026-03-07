'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Clock, Send, Sparkles } from 'lucide-react';
import { submitSurvey } from '@/features/survey/actions';

// === モックデータ === (DBと紐づくためのダミーのUUIDを設定)
const mockQuestions = [
  { id: '11111111-1111-1111-1111-111111111111', category: '仕事のやりがい', text: '現在の業務にやりがいを感じていますか？', type: 'rating' },
  { id: '22222222-2222-2222-2222-222222222222', category: '仕事のやりがい', text: '自分のスキルや経験が業務で活かされていると感じますか？', type: 'rating' },
  { id: '33333333-3333-3333-3333-333333333333', category: '人間関係', text: '同じチームのメンバーとのコミュニケーションは円滑ですか？', type: 'rating' },
  { id: '44444444-4444-4444-4444-444444444444', category: '人間関係', text: '上司やリーダーに気軽に相談しやすい雰囲気がありますか？', type: 'rating' },
  { id: '55555555-5555-5555-5555-555555555555', category: '職場環境', text: '働く環境（オフィス、ツール、リモート等）に満足していますか？', type: 'rating' },
  { id: '66666666-6666-6666-6666-666666666666', category: '会社への共感', text: '会社のビジョンや目標・方針に共感し、自分事として捉えられていますか？', type: 'rating' },
];

const ratingOptions = [
  { value: 1, label: '全くそう思わない', shortLabel: '全くない' },
  { value: 2, label: 'あまりそう思わない', shortLabel: 'あまり' },
  { value: 3, label: 'どちらでもない', shortLabel: 'どちらでも' },
  { value: 4, label: 'そう思う', shortLabel: 'そう思う' },
  { value: 5, label: '非常にそう思う', shortLabel: '非常に' },
];

export default function SurveyAnswerPage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [freeComment, setFreeComment] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // サーバーアクション用の useTransition（モダンなローディング処理）
  const [isPending, startTransition] = useTransition();

  // カテゴリごとに質問をグループ化
  const groupedQuestions = mockQuestions.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<string, typeof mockQuestions>);

  const handleRating = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 回答データを配列形式に変換
    const answersArray = Object.entries(answers).map(([question_id, score]) => ({
      question_id,
      score,
    }));

    // Server Action の呼び出し
    startTransition(async () => {
      const res = await submitSurvey({
        answers: answersArray,
        freeComment: freeComment,
        // (モック検証用に追加) UUIDの不整合を防ぐため、初回のみデータベース側へ質問文をシード(自動登録)します。
        mockQuestionsData: mockQuestions,
      });

      if (res.success) {
        setIsCompleted(true);
      } else {
        setErrorMsg(res.error || 'エラーが発生しました');
      }
    });
  };

  // 完了画面のレンダリング
  if (isCompleted) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="bg-green-100 p-6 rounded-full text-green-600 mb-4">
          <CheckCircle2 size={80} strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900">ご回答ありがとうございました！</h1>
        <p className="text-gray-600 max-w-lg text-lg leading-relaxed">
          あなたからの貴重なフィードバックは、より良い組織・職場環境づくりのために役立てられます。今月もお疲れ様でした！
        </p>
        <button className="mt-8 px-8 py-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-base font-medium shadow-sm" onClick={() => window.location.href = '/top'}>
          ダッシュボードへ戻る
        </button>
      </div>
    );
  }

  // 進捗率の計算
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / mockQuestions.length) * 100);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 min-h-screen">
      {/* ページヘッダー */}
      <div className="mb-12 text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="inline-flex items-center justify-center space-x-2 bg-indigo-50 text-indigo-700 px-5 py-2 rounded-full text-sm font-semibold mb-2">
          <Sparkles size={16} />
          <span>より良い職場づくりのために</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
          今月の組織健康度アンケート
        </h1>
        <p className="text-gray-500 flex items-center justify-center gap-2 text-sm md:text-base mt-2">
          <Clock size={16} />
          <span>所要時間：約3分</span>
          <span className="mx-2 text-gray-300">|</span>
          <span>全{mockQuestions.length}問</span>
        </p>
      </div>

      {/* プログレスバー（上部固定・スクロール追従） */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md pb-4 pt-4 mb-10 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-gray-100 sm:border-none shadow-sm sm:shadow-none">
        <div className="flex justify-between text-sm font-semibold text-gray-500 mb-2">
          <span>回答の進捗</span>
          <span className="text-indigo-600 font-bold">{progressPercent}%</span>
        </div>
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-16 pb-32">
        {/* カテゴリごとの設問エリア */}
        {Object.entries(groupedQuestions).map(([category, questions], cIdx) => (
          <div key={category} className="space-y-6 animate-in fade-in slide-in-from-bottom-8" style={{ animationDelay: `${cIdx * 150}ms` }}>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <span className="w-2 h-8 bg-indigo-500 rounded-full inline-block"></span>
              {category}
            </h2>
            
            <div className="grid gap-6">
              {questions.map((q, qIdx) => {
                const isAnswered = answers[q.id] !== undefined;
                return (
                  <div 
                    key={q.id} 
                    className={`rounded-xl border transition-all duration-300 overflow-hidden
                      ${isAnswered ? 'border-indigo-100 bg-indigo-50/20 shadow-sm' : 'border-gray-100 bg-white hover:border-indigo-100 hover:shadow-md'}`}
                  >
                    <div className="p-4 sm:p-6 pb-4 sm:pb-6 bg-gradient-to-r from-gray-50/50 to-white border-b border-gray-100">
                      <h3 className="text-lg md:text-xl leading-relaxed text-gray-800 font-medium">
                        <span className="text-indigo-500 mr-2 font-black">Q{qIdx + 1}.</span>
                        {q.text}
                      </h3>
                    </div>
                    <div className="p-4 sm:p-6 pt-4">
                      <div className="flex flex-col sm:flex-row gap-2">
                        {ratingOptions.map((opt) => {
                          const isSelected = answers[q.id] === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleRating(q.id, opt.value)}
                              className={`
                                relative flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 group focus:outline-none focus:ring-4 focus:ring-indigo-500/20
                                ${isSelected 
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md transform scale-[1.02] z-10' 
                                  : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-indigo-200 hover:bg-white'}
                              `}
                            >
                              <span className={`text-2xl mb-1 font-bold transition-all ${isSelected ? 'text-indigo-600 scale-110' : 'text-gray-400 group-hover:text-indigo-400'}`}>
                                {opt.value}
                              </span>
                              <span className="text-xs font-semibold tracking-wide text-center leading-tight">
                                <span className="hidden sm:inline">{opt.label}</span>
                                <span className="inline sm:hidden">{opt.shortLabel}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* フリーコメント欄 (任意) */}
        <div className="space-y-6 pt-6 animate-in fade-in slide-in-from-bottom-8" style={{ animationDelay: '600ms' }}>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <span className="w-2 h-8 bg-blue-400 rounded-full inline-block"></span>
            フリーコメント <span className="text-sm font-normal text-gray-400 ml-2">(任意 - 誰が書いたか特定されにくいよう配慮されます)</span>
          </h2>
          <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow bg-white">
            <div className="p-0">
              <textarea
                id="free-comment"
                placeholder="例：最近、部署間の連携が取りづらいと感じることがあります。ミーティングの仕組みを改善してほしいです。"
                className="min-h-[180px] w-full resize-y text-base p-6 border-0 focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-gray-50/50 hover:bg-white transition-colors outline-none"
                value={freeComment}
                onChange={(e) => setFreeComment(e.target.value)}
              />
            </div>
          </div>
          {errorMsg && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 font-semibold animate-pulse">
              {errorMsg}
            </div>
          )}
        </div>

        {/* 送信ボタン（画面下部・スクロール追従して浮かせる） */}
        <div className="fixed bottom-0 left-0 right-0 sm:relative sm:bottom-auto w-full z-40 bg-white/90 sm:bg-transparent backdrop-blur-lg sm:backdrop-blur-none border-t border-gray-200 sm:border-none p-4 sm:p-0">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm font-medium text-gray-500 hidden sm:block">
              {answeredCount === mockQuestions.length ? (
                <span className="text-green-600 flex items-center font-bold">
                  <CheckCircle2 size={18} className="mr-1.5" /> 全ての質問に回答済みです
                </span>
              ) : (
                <span>全 {mockQuestions.length} 問中、<strong className="text-gray-900 text-base">{answeredCount}</strong> 問を回答</span>
              )}
            </div>
            
            <button 
              type="submit" 
              disabled={answeredCount === 0 || isPending}
              className={`
                w-full sm:w-auto px-8 py-5 sm:px-12 rounded-xl text-lg font-bold shadow-lg transition-all duration-300 flex-shrink-0 flex items-center justify-center
                ${answeredCount === 0 || isPending
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary-dark hover:scale-[1.03] hover:shadow-xl'}
                ${answeredCount === mockQuestions.length && !isPending ? 'bg-indigo-600 hover:bg-indigo-700 ring-2 ring-indigo-600 ring-offset-2' : ''}
              `}
            >
              {isPending ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  送信中...
                </span>
              ) : (
                <span className="flex items-center">
                  回答を送信する <Send className="ml-2.5" size={20} />
                </span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
