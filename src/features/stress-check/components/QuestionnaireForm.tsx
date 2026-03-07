'use client';

import React, { useState, useTransition, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ClipboardCheck,
  Loader2,
  Brain,
  HeartPulse,
  Users,
  Smile,
} from 'lucide-react';
import type { CategoryGroup, AnswerMap, CategoryCode, StressCheckPeriod } from '../types';
import { submitStressCheckAnswers } from '../actions';

// カテゴリごとのアイコン・カラー設定
const CATEGORY_CONFIG: Record<CategoryCode, {
  icon: React.ElementType;
  gradient: string;
  bgLight: string;
  accent: string;
}> = {
  A: { icon: Brain, gradient: 'from-blue-500 to-indigo-600', bgLight: 'bg-blue-50', accent: 'text-blue-600' },
  B: { icon: HeartPulse, gradient: 'from-rose-500 to-pink-600', bgLight: 'bg-rose-50', accent: 'text-rose-600' },
  C: { icon: Users, gradient: 'from-emerald-500 to-teal-600', bgLight: 'bg-emerald-50', accent: 'text-emerald-600' },
  D: { icon: Smile, gradient: 'from-amber-500 to-orange-600', bgLight: 'bg-amber-50', accent: 'text-amber-600' },
};

interface QuestionnaireFormProps {
  period: StressCheckPeriod;
  domainGroups: CategoryGroup[];
}

export default function QuestionnaireForm({ period, domainGroups }: QuestionnaireFormProps) {
  const totalSteps = domainGroups.length + 1;
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentCategory = currentStep < domainGroups.length ? domainGroups[currentStep] : null;

  const allQuestionIds = useMemo(
    () => domainGroups.flatMap((cg) => cg.questions.map((q) => q.id)),
    [domainGroups]
  );

  const isCurrentStepComplete = useMemo(() => {
    if (!currentCategory) return true;
    return currentCategory.questions.every((q) => answers[q.id] !== undefined);
  }, [currentCategory, answers]);

  const progressPercent = useMemo(() => {
    const answered = allQuestionIds.filter((id) => answers[id] !== undefined).length;
    return Math.round((answered / allQuestionIds.length) * 100);
  }, [allQuestionIds, answers]);

  const isAllAnswered = useMemo(
    () => allQuestionIds.every((id) => answers[id] !== undefined),
    [allQuestionIds, answers]
  );

  const handleSelectScore = useCallback((questionId: string, score: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: score }));
  }, []);

  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = () => {
    setSubmitError(null);
    startTransition(async () => {
      const payload = allQuestionIds.map((qId) => ({
        question_id: qId,
        answer: answers[qId],
      }));
      const result = await submitStressCheckAnswers(period.id, payload);
      if (result.success) {
        // 結果ページへ自動リダイレクト
        window.location.href = `/stress-check/result?period_id=${period.id}`;
      } else {
        setSubmitError(result.error || '送信に失敗しました。');
      }
    });
  };


  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 min-h-screen">
      {/* ヘッダー */}
      <div className="mb-8 text-center space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="inline-flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-5 py-2 rounded-full text-sm font-semibold">
          <ClipboardCheck size={16} />
          <span>ストレスチェック受検</span>
        </div>
        <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 tracking-tight">{period.title}</h1>
        <p className="text-gray-500 text-sm">{period.questionnaire_type}問形式 ・ 実施期間: {period.start_date} 〜 {period.end_date}</p>
      </div>

      {/* プログレスバー */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md pb-4 pt-4 mb-6 border-b border-gray-100 shadow-sm">
        <div className="flex justify-between text-sm font-semibold text-gray-500 mb-2">
          <span>回答進捗</span>
          <span className="text-indigo-600 font-bold">{progressPercent}%</span>
        </div>
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }} />
        </div>

        {/* ステップインジケーター */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
          {domainGroups.map((cg, idx) => {
            const config = CATEGORY_CONFIG[cg.category];
            const Icon = config.icon;
            const isActive = idx === currentStep;
            const isDone = cg.questions.every((q) => answers[q.id] !== undefined);
            return (
              <button key={cg.category} onClick={() => setCurrentStep(idx)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive ? `bg-gradient-to-r ${config.gradient} text-white shadow-md`
                  : isDone ? `${config.bgLight} ${config.accent}` : 'bg-gray-100 text-gray-400'
                }`}>
                <Icon className="h-3.5 w-3.5" />
                {cg.categoryLabel}
                {isDone && !isActive && <CheckCircle2 className="h-3.5 w-3.5" />}
              </button>
            );
          })}
          <button onClick={() => setCurrentStep(domainGroups.length)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              currentStep === domainGroups.length ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-md'
              : isAllAnswered ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-400'
            }`}>
            <CheckCircle2 className="h-3.5 w-3.5" />確認・送信
          </button>
        </div>
      </div>

      {/* 質問 / 確認 */}
      {currentCategory ? (
        <CategoryQuestionsView categoryGroup={currentCategory} answers={answers} onSelect={handleSelectScore} />
      ) : (
        <ConfirmationView domainGroups={domainGroups} answers={answers} isAllAnswered={isAllAnswered}
          submitError={submitError} isPending={isPending} onSubmit={handleSubmit} onGoToCategory={(idx) => setCurrentStep(idx)} />
      )}

      {/* ナビゲーション */}
      <div className="flex items-center justify-between mt-8 pb-8">
        <button onClick={goPrev} disabled={currentStep === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />前へ
        </button>
        {currentStep < totalSteps - 1 && (
          <button onClick={goNext} disabled={!isCurrentStepComplete}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md disabled:opacity-30 disabled:cursor-not-allowed">
            次へ<ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// カテゴリごとの質問一覧
function CategoryQuestionsView({ categoryGroup, answers, onSelect }: {
  categoryGroup: CategoryGroup; answers: AnswerMap; onSelect: (qId: string, score: number) => void;
}) {
  const config = CATEGORY_CONFIG[categoryGroup.category];
  const Icon = config.icon;
  const answeredCount = categoryGroup.questions.filter((q) => answers[q.id] !== undefined).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className={`bg-gradient-to-r ${config.gradient} px-6 py-4`}>
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6 text-white/90" />
          <div>
            <h2 className="text-lg font-bold text-white">領域{categoryGroup.category}: {categoryGroup.categoryLabel}</h2>
            <p className="text-sm text-white/80">{answeredCount} / {categoryGroup.questions.length} 問回答済み</p>
          </div>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {categoryGroup.questions.map((question) => {
          const selectedScore = answers[question.id];
          return (
            <div key={question.id} className={`px-6 py-5 transition-colors ${selectedScore !== undefined ? 'bg-gray-50/50' : ''}`}>
              <div className="flex items-start gap-3 mb-4">
                <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  selectedScore !== undefined ? `bg-gradient-to-r ${config.gradient} text-white` : 'bg-gray-200 text-gray-500'
                }`}>{question.question_no}</span>
                <p className="text-sm font-medium text-gray-800 pt-0.5">{question.question_text}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 ml-10">
                {question.options.map((opt) => {
                  const isSelected = selectedScore === opt.score;
                  return (
                    <button key={opt.id} onClick={() => onSelect(question.id, opt.score)}
                      className={`relative px-3 py-2.5 rounded-xl text-sm font-medium transition-all border-2 ${
                        isSelected ? `border-current ${config.accent} ${config.bgLight} shadow-sm`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? `border-current ${config.accent}` : 'border-gray-300'
                        }`}>
                          {isSelected && <div className={`w-2 h-2 rounded-full ${config.accent.replace('text-', 'bg-')}`} />}
                        </div>
                        <span className="text-xs sm:text-sm">{opt.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 確認・送信画面
function ConfirmationView({ domainGroups, answers, isAllAnswered, submitError, isPending, onSubmit, onGoToCategory }: {
  domainGroups: CategoryGroup[]; answers: AnswerMap; isAllAnswered: boolean;
  submitError: string | null; isPending: boolean; onSubmit: () => void; onGoToCategory: (idx: number) => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl">
          <CheckCircle2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">回答内容の確認</h2>
          <p className="text-sm text-gray-500">送信前に回答内容をご確認ください。</p>
        </div>
      </div>
      <div className="space-y-3">
        {domainGroups.map((cg, idx) => {
          const config = CATEGORY_CONFIG[cg.category];
          const Icon = config.icon;
          const answeredCount = cg.questions.filter((q) => answers[q.id] !== undefined).length;
          const totalCount = cg.questions.length;
          const isComplete = answeredCount === totalCount;
          return (
            <div key={cg.category} className={`flex items-center justify-between p-4 rounded-xl border ${
              isComplete ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'
            }`}>
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${isComplete ? 'text-green-600' : 'text-amber-600'}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-800">領域{cg.category}: {cg.categoryLabel}</p>
                  <p className="text-xs text-gray-500">{answeredCount} / {totalCount} 問回答済み</p>
                </div>
              </div>
              {!isComplete && (
                <button onClick={() => onGoToCategory(idx)} className="text-xs font-medium text-amber-600 hover:text-amber-700 underline">未回答あり → 戻る</button>
              )}
              {isComplete && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </div>
          );
        })}
      </div>
      {submitError && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" /><span>{submitError}</span>
        </div>
      )}
      <div className="flex justify-center pt-2">
        <button onClick={onSubmit} disabled={!isAllAnswered || isPending}
          className="flex items-center gap-2 px-8 py-3 rounded-xl text-base font-bold bg-gradient-to-r from-purple-500 to-violet-600 text-white hover:from-purple-600 hover:to-violet-700 shadow-lg hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          {isPending ? (<><Loader2 className="h-5 w-5 animate-spin" />送信中...</>) : (<><CheckCircle2 className="h-5 w-5" />回答を送信する</>)}
        </button>
      </div>
      {!isAllAnswered && <p className="text-center text-xs text-amber-600">※ すべての質問に回答すると送信できます。</p>}
    </div>
  );
}
