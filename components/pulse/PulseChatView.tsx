// components/pulse/PulseChatView.tsx
"use client"

import { getDefaultPulsePack, submitPulseResponseV2 } from '@/app/pulse/actions'
import React, { useState, useEffect } from 'react'

// 5段階評価の定義（汎用化：同感度/満足度ベース）
const RATING_OPTIONS = [
  { value: 1, label: '全く思わない', emoji: '😫', color: 'bg-rose-100 text-rose-600 border-rose-200 hover:bg-rose-200 ring-rose-300' },
  { value: 2, label: 'あまり思わない', emoji: '😓', color: 'bg-orange-100 text-orange-600 border-orange-200 hover:bg-orange-200 ring-orange-300' },
  { value: 3, label: 'どちらともいえない', emoji: '😐', color: 'bg-yellow-100 text-yellow-600 border-yellow-200 hover:bg-yellow-200 ring-yellow-300' },
  { value: 4, label: 'そう思う', emoji: '😊', color: 'bg-emerald-100 text-emerald-600 border-emerald-200 hover:bg-emerald-200 ring-emerald-300' },
  { value: 5, label: '強くそう思う', emoji: '😆', color: 'bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200 ring-blue-300' },
]

// スコア別フィードバックメッセージ
const getFeedbackMessage = (score: number) => {
  if (score >= 4) {
    return {
      title: "素晴らしいですね！",
      message: "今週も良いコンディションですね。この調子でいきましょう！",
      emoji: "🌟",
      color: "from-green-400 to-blue-500",
    };
  } else if (score >= 3) {
    return {
      title: "お疲れ様です",
      message: "今週もありがとうございました。週末はゆっくり休んでくださいね。",
      emoji: "☕",
      color: "from-yellow-400 to-orange-500",
    };
  } else {
    return {
      title: "無理しないでくださいね",
      message: "お疲れのようですね。休息を大切にしてください。",
      emoji: "🌙",
      color: "from-purple-400 to-pink-500",
    };
  }
};

// 質問文をクレンジング（Q1:、(重み大)などを削除）
const cleanQuestionText = (text: string): string => {
  if (!text) return text;
  
  // 「Q1(重み大):」のような複合パターンを削除
  let cleaned = text.replace(/^Q\d+\(重み.\):\s*/i, '');
  
  // 「Q1:」「Q2:」などの先頭の質問番号を削除
  cleaned = cleaned.replace(/^Q\d+:\s*/i, '');
  
  // 「(重み大)」「(重み中)」「(重み小)」などのカッコ内を削除
  cleaned = cleaned.replace(/\(重み[^\)]*\)/g, '');
  
  // その他のシステム的な記号を削除
  cleaned = cleaned.replace(/\[.*?\]/g, '');
  
  // コロンとその後のスペースを削除
  cleaned = cleaned.replace(/^:\s*/, '');
  
  // 前後の空白を削除
  return cleaned.trim();
};

export function PulseChatView({ onSuccess }: { onSuccess?: () => void }) {
  // === State ===
  const [packData, setPackData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [intentId, setIntentId] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Array<{
    questionId: string;
    answerValue?: number;
    answerText?: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  // === 初期化: パックデータ取得 ===
  useEffect(() => {
    async function loadPack() {
      try {
        const pack = await getDefaultPulsePack();
        setPackData(pack);
        setQuestions(pack.pulse_intents?.pulse_questions || []);
        setIntentId(pack.pulse_intents?.id || "");
      } catch (err: any) {
        console.error("Pack load error:", err);
        setError(err.message || "質問データの取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    }
    loadPack();
  }, []);

  // === 回答処理 ===
  const handleAnswer = (answerValue?: number, answerText?: string) => {
    const currentQuestion = questions[currentStep];
    
    const newAnswers = [...answers, {
      questionId: currentQuestion.id,
      answerValue,
      answerText,
    }];
    setAnswers(newAnswers);

    // アニメーション遅延後に次へ
    setTimeout(() => {
      if (currentStep < questions.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // 最終問題完了 → 送信
        submitResponses(newAnswers);
      }
    }, 300);
  };

  const submitResponses = async (finalAnswers: any[]) => {
    setIsSubmitting(true);
    try {
      const result = await submitPulseResponseV2({
        intentId,
        answers: finalAnswers,
      });
      setFinalScore(result.score);
      setSessionId(result.sessionId); // セッションIDを保存
      setIsCompleted(true);
    } catch (err) {
      console.error("Submission error:", err);
      alert("回答の送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // コメント送信（オプション）
  const handleClose = async () => {
    // コメントが入力されている場合のみ送信
    if (feedbackComment.trim() && sessionId) {
      try {
        const { updateSessionFeedbackComment } = await import('@/app/pulse/actions');
        await updateSessionFeedbackComment(sessionId, feedbackComment.trim());
        console.log("✅ Feedback comment saved successfully");
      } catch (err) {
        console.error("Comment submission error:", err);
        // エラーが発生してもモーダルは閉じる（ユーザー体験優先）
      }
    }
    
    // モーダルを閉じる
    if (onSuccess) {
      onSuccess();
    }
  };

  // === 質問タイプ別UI ===
  const renderQuestionInput = () => {
    const currentQuestion = questions[currentStep];
    
    switch (currentQuestion.question_type) {
      case "rating_5":
        return (
          <div className="grid grid-cols-5 gap-5 h-44 items-end px-6">
            {RATING_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleAnswer(opt.value)}
                className={`group relative flex flex-col items-center justify-end rounded-2xl border-2 p-4 transition-all duration-200 hover:-translate-y-3 hover:shadow-xl focus:outline-none focus:ring-4 ${opt.color} bg-white border-transparent h-full w-full`}
              >
                <div className="absolute top-6 text-4xl group-hover:scale-125 transition-transform duration-200">
                  {opt.emoji}
                </div>
                <span className="text-[11px] font-bold mt-auto mb-2 leading-tight text-center px-1">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        );
      
      case "choice":
        const choices = currentQuestion.choices || [];
        return (
          <div className="grid grid-cols-1 gap-4 px-6">
            {choices.map((choice: string, idx: number) => (
              <button
                key={idx}
                onClick={() => handleAnswer(undefined, choice)}
                className="flex w-full items-center gap-5 rounded-xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-all hover:shadow-md hover:border-indigo-200 active:scale-95"
              >
                <span className="text-base font-bold text-gray-700">{choice}</span>
                <span className="ml-auto text-gray-300">❯</span>
              </button>
            ))}
          </div>
        );
      
      case "text":
        return (
          <div className="flex flex-col h-full px-6">
            <textarea
              className="w-full flex-1 rounded-xl border-2 border-gray-100 bg-gray-50 p-5 text-base focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all resize-none"
              placeholder="自由にご記入ください..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleAnswer(undefined, e.currentTarget.value);
                }
              }}
              id={`text-input-${currentStep}`}
            />
            <button
              onClick={() => {
                const textarea = document.getElementById(`text-input-${currentStep}`) as HTMLTextAreaElement;
                handleAnswer(undefined, textarea?.value || '');
              }}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-200 hover:shadow-xl hover:translate-y-[-1px] transition-all active:scale-95"
            >
              次へ進む
            </button>
          </div>
        );
      
      default:
        return <div className="text-center text-gray-400">未対応の質問タイプ</div>;
    }
  };

  // === ローディング画面 ===
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-500 text-sm">質問を準備しています...</p>
      </div>
    );
  }

  // === エラー画面 ===
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] p-8 text-center">
        <div className="text-6xl mb-4">☕</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">今日はアンケートはお休みです</h3>
        <p className="text-gray-500 text-sm">明日また来てくださいね。</p>
        <button 
          onClick={onSuccess}
          className="mt-6 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-700 transition-colors"
        >
          閉じる
        </button>
      </div>
    );
  }

  // === 完了画面 ===
  if (isCompleted && finalScore !== null) {
    const feedback = getFeedbackMessage(finalScore);
    
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center animate-in zoom-in-95 duration-300 h-[600px] overflow-y-auto">
        <div className={`h-28 w-28 rounded-full bg-gradient-to-tr ${feedback.color} flex items-center justify-center text-white mb-6 shadow-2xl text-5xl animate-in zoom-in duration-500`}>
          {feedback.emoji}
        </div>
        <h3 className="text-3xl font-bold text-gray-800 mb-4">{feedback.title}</h3>
        <p className="text-gray-600 mt-2 mb-10 text-lg max-w-lg leading-relaxed">{feedback.message}</p>
        
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 mb-8 shadow-inner w-full max-w-sm">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">あなたのスコア</p>
          <p className="text-5xl font-black text-gray-800">
            {finalScore.toFixed(1)} 
            <span className="text-2xl text-gray-400 font-bold ml-2">/ 5.0</span>
          </p>
        </div>
        
        {/* コメント入力欄 */}
        <div className="w-full max-w-md mb-6">
          <textarea
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            placeholder="何か伝えたいことがあれば..."
            className="w-full h-24 px-4 py-3 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm text-gray-700 placeholder-gray-400"
          />
          <p className="text-xs text-gray-500 mt-2 text-left">
            💡 もし、何か伝えたいことがあれば記入してください。必須ではありません。
          </p>
        </div>
        
        <button 
          onClick={handleClose} 
          className="w-full max-w-md rounded-xl bg-gray-900 py-4 text-base font-bold text-white shadow-xl hover:bg-gray-800 transition-all active:scale-95"
        >
          閉じる
        </button>
      </div>
    );
  }

  // === 送信中画面 ===
  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-500 text-sm">回答を送信しています...</p>
      </div>
    );
  }

  // === メイン画面（質問表示） ===
  const currentQuestion = questions[currentStep];
  const cleanedQuestionText = cleanQuestionText(currentQuestion.question_text);

  return (
    <div className="flex flex-col h-[600px]">
      {/* プログレスバー */}
      <div className="mb-6 px-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-gray-600">
            質問 {currentStep + 1} / {questions.length}
          </span>
          <span className="text-xs text-gray-400 font-medium">
            {Math.round(((currentStep + 1) / questions.length) * 100)}%
          </span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-600 transition-all duration-500 ease-out shadow-lg"
            style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 flex flex-col">
        <div className="text-center mb-5 mt-2">
          <span className="inline-block rounded-full bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200 px-5 py-1.5 text-xs font-bold text-gray-500 tracking-widest shadow-sm">
            STEP {currentStep + 1}
          </span>
        </div>

        {/* 質問カード */}
        <div 
          className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 rounded-2xl p-10 mb-8 text-center shadow-md animate-in fade-in slide-in-from-right-4 duration-300" 
          key={`question-${currentStep}`}
        >
          <h3 className="text-2xl font-bold text-gray-800 leading-relaxed">
            {cleanedQuestionText}
          </h3>
          <p className="text-sm text-indigo-900/60 mt-4 font-medium">
            あなたの感じたままをお聞かせください
          </p>
        </div>

        {/* 回答エリア */}
        <div 
          className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6" 
          key={`answer-${currentStep}`}
        >
          {renderQuestionInput()}
        </div>
      </div>
    </div>
  )
}
