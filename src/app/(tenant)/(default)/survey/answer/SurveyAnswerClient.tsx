'use client';

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, Send, Sparkles } from 'lucide-react';
import {
  submitSurvey,
  getEchoPulseSurveyQuestionsAction,
  type EchoPulseSurveyQuestion,
} from '@/features/survey/actions';
import { parsePulseSurveyPeriodFromSearchParam } from '@/lib/datetime';
import { APP_ROUTES } from '@/config/routes';
import { PULSE_LIKERT_OPTIONS } from '@/features/survey/constants';

interface SurveyAnswerClientProps {
  defaultSurveyPeriod: string
}

export default function SurveyAnswerClient({ defaultSurveyPeriod }: SurveyAnswerClientProps) {
  const searchParams = useSearchParams();
  const surveyPeriod = useMemo(() => {
    const p = searchParams.get('period');
    const parsed = parsePulseSurveyPeriodFromSearchParam(p);
    if (parsed) return parsed;
    return defaultSurveyPeriod;
  }, [searchParams, defaultSurveyPeriod]);

  const [questions, setQuestions] = useState<EchoPulseSurveyQuestion[] | null>(null);
  const [surveyTitle, setSurveyTitle] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noActiveQuestionnaire, setNoActiveQuestionnaire] = useState(false);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [freeComment, setFreeComment] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getEchoPulseSurveyQuestionsAction();
      if (cancelled) return;
      if (!res.success) {
        setLoadError(res.error ?? '設問の読み込みに失敗しました');
        setQuestions([]);
        return;
      }
      setNoActiveQuestionnaire(res.code === 'no_active_questionnaire');
      setQuestions(res.questions ?? []);
      setSurveyTitle(res.questionnaireTitle ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groupedQuestions = useMemo(() => {
    const list = questions ?? [];
    return list.reduce(
      (acc, q) => {
        if (!acc[q.category]) acc[q.category] = [];
        acc[q.category].push(q);
        return acc;
      },
      {} as Record<string, EchoPulseSurveyQuestion[]>
    );
  }, [questions]);

  const categoriesInOrder = useMemo(() => {
    const order: string[] = [];
    const seen = new Set<string>();
    for (const q of questions ?? []) {
      if (!seen.has(q.category)) {
        seen.add(q.category);
        order.push(q.category);
      }
    }
    return order;
  }, [questions]);

  const displayNumberById = useMemo(() => {
    const m = new Map<string, number>();
    let n = 0;
    for (const cat of categoriesInOrder) {
      for (const q of questions ?? []) {
        if (q.category !== cat) continue;
        n += 1;
        m.set(q.id, n);
      }
    }
    return m;
  }, [questions, categoriesInOrder]);

  const handleRating = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleRadioSelect = (questionId: string, score: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: score }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!questions || questions.length === 0) return;

    const answersArray = Object.entries(answers).map(([question_id, score]) => ({
      question_id,
      score,
    }));

    startTransition(async () => {
      const res = await submitSurvey({
        answers: answersArray,
        freeComment: freeComment,
        mockQuestionsData: questions.map((q) => ({
          id: q.id,
          category: q.category,
          text: q.detail ? `${q.headline}\n（${q.detail}）` : q.headline,
          pulseAnswerType: q.type === 'radio' ? ('single_choice' as const) : ('rating' as const),
        })),
        surveyPeriod,
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
          あなたからの貴重なフィードバックは、より良い組織・職場環境づくりのために役立てられます。お疲れ様でした。
        </p>
        <button className="mt-8 px-8 py-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-base font-medium shadow-sm" onClick={() => window.location.href = '/top'}>
          ダッシュボードへ戻る
        </button>
      </div>
    );
  }

  if (questions === null) {
    return (
      <div className="max-w-4xl mx-auto py-24 px-4 text-center text-gray-500">
        <p className="text-sm font-medium">設問を読み込んでいます…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <p className="text-red-600 font-medium">{loadError}</p>
        <button
          type="button"
          className="text-sm text-indigo-600 underline"
          onClick={() => window.location.reload()}
        >
          再読み込み
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <h1 className="text-xl font-bold text-gray-900">
          {surveyTitle ?? '今月の組織度アンケート（Echo）'}
        </h1>
        <p className="text-gray-600 text-sm leading-relaxed max-w-lg mx-auto">
          {noActiveQuestionnaire
            ? '表示できる設問がありません。人事担当者が Echo 設問管理で設問セットを本番指定すると、ここに設問が表示されます。'
            : '本番指定の設問セットに、パルス回答で表示できる設問（単一選択・評価表）がありません。'}
        </p>
        <Link
          href={APP_ROUTES.TENANT.ADMIN_TENANT_QUESTIONNAIRE}
          className="inline-block text-sm text-indigo-600 font-semibold hover:underline"
        >
          Echo 設問管理へ
        </Link>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 min-h-screen">
      {/* ページヘッダー */}
      <div className="mb-12 text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="inline-flex items-center justify-center space-x-2 bg-indigo-50 text-indigo-700 px-5 py-2 rounded-full text-sm font-semibold mb-2">
          <Sparkles size={16} />
          <span>より良い職場づくりのために</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
          {surveyTitle ?? '今月の組織度アンケート（Echo）'}
        </h1>
        <p className="text-gray-500 flex items-center justify-center gap-2 text-sm md:text-base mt-2">
          <Clock size={16} />
          <span>所要時間：約5分</span>
          <span className="mx-2 text-gray-300">|</span>
          <span>全{questions.length}問</span>
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
        {categoriesInOrder.map((category, cIdx) => {
          const categoryQuestions = groupedQuestions[category] ?? [];
          return (
            <div
              key={category}
              className="space-y-6 animate-in fade-in slide-in-from-bottom-8"
              style={{ animationDelay: `${cIdx * 150}ms` }}
            >
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <span className="w-2 h-8 bg-indigo-500 rounded-full inline-block" />
                {category}
              </h2>

              <div className="grid gap-6">
                {categoryQuestions.map((q) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const qn = displayNumberById.get(q.id) ?? 0;
                  return (
                    <div
                      key={q.id}
                      className={`rounded-xl border transition-all duration-300 overflow-hidden
                      ${
                        isAnswered
                          ? 'border-indigo-100 bg-indigo-50/20 shadow-sm'
                          : 'border-gray-100 bg-white hover:border-indigo-100 hover:shadow-md'
                      }`}
                    >
                      <div className="p-4 sm:p-6 pb-4 sm:pb-6 bg-gradient-to-r from-gray-50/50 to-white border-b border-gray-100">
                        <h3 className="text-lg md:text-xl leading-relaxed text-gray-800 font-medium">
                          <span className="text-indigo-500 mr-2 font-black">Q{qn}.</span>
                          {q.headline}
                        </h3>
                        {q.detail ? (
                          <p className="mt-3 text-base text-gray-700 font-medium leading-relaxed border-l-4 border-indigo-200 pl-3">
                            {q.detail}
                          </p>
                        ) : null}
                      </div>
                      <div className="p-4 sm:p-6 pt-4">
                        {q.type === 'radio' && q.options ? (
                          <div className="flex flex-col gap-2">
                            {q.options.map((opt) => {
                              const isSelected = answers[q.id] === opt.score;
                              return (
                                <button
                                  key={opt.score}
                                  type="button"
                                  onClick={() => handleRadioSelect(q.id, opt.score)}
                                  className={`
                                    w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-200
                                    ${
                                      isSelected
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm'
                                        : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-indigo-200 hover:bg-white'
                                    }
                                  `}
                                >
                                  {opt.text}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10 sm:gap-2">
                            {PULSE_LIKERT_OPTIONS.map((opt) => {
                              const isSelected = answers[q.id] === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => handleRating(q.id, opt.value)}
                                  className={`
                                relative flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-200 group focus:outline-none focus:ring-4 focus:ring-indigo-500/20 min-h-[4.5rem] sm:min-h-[5.25rem] px-0.5 py-2 sm:p-3
                                ${
                                  isSelected
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md scale-[1.02] z-10'
                                    : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-indigo-200 hover:bg-white'
                                }
                              `}
                                >
                                  <span
                                    className={`text-lg sm:text-2xl mb-0.5 sm:mb-1 font-bold transition-all ${
                                      isSelected
                                        ? 'text-indigo-600 scale-110'
                                        : 'text-gray-400 group-hover:text-indigo-400'
                                    }`}
                                  >
                                    {opt.value}
                                  </span>
                                  <span className="text-[10px] sm:text-xs font-semibold tracking-tight text-center leading-tight px-0.5">
                                    <span className="hidden lg:inline">{opt.label}</span>
                                    <span className="inline lg:hidden">{opt.shortLabel}</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

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
              {answeredCount === questions.length ? (
                <span className="text-green-600 flex items-center font-bold">
                  <CheckCircle2 size={18} className="mr-1.5" /> 全ての質問に回答済みです
                </span>
              ) : (
                <span>全 {questions.length} 問中、<strong className="text-gray-900 text-base">{answeredCount}</strong> 問を回答</span>
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
                ${answeredCount === questions.length && !isPending ? 'bg-indigo-600 hover:bg-indigo-700 ring-2 ring-indigo-600 ring-offset-2' : ''}
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
