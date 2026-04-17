'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { APP_ROUTES } from '@/config/routes';
import { submitAnswers } from '@/features/questionnaire/actions';
import type { QuestionnaireDetail, AnswerInput } from '@/features/questionnaire/types';

interface ExistingAnswer {
  question_id: string;
  item_id: string | null;
  option_id: string | null;
  text_answer: string | null;
  score: number | null;
}

interface Props {
  assignmentId: string;
  detail: QuestionnaireDetail;
  existingAnswers: ExistingAnswer[];
}

export default function AnswerFormClient({ assignmentId, detail, existingAnswers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // 回答状態の初期化
  // radio: { [question_id]: option_id }
  // checkbox: { [question_id]: Set<option_id> }
  // rating_table: { [`${question_id}-${item_id}`]: score }
  // text: { [question_id]: string }
  const [radioAnswers, setRadioAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    existingAnswers.forEach((a) => {
      if (a.option_id && !a.item_id) init[a.question_id] = a.option_id;
    });
    return init;
  });

  const [checkboxAnswers, setCheckboxAnswers] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {};
    existingAnswers.forEach((a) => {
      if (a.option_id) {
        if (!init[a.question_id]) init[a.question_id] = new Set();
        init[a.question_id].add(a.option_id);
      }
    });
    return init;
  });

  const [ratingAnswers, setRatingAnswers] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    existingAnswers.forEach((a) => {
      if (a.item_id && a.score != null) {
        init[`${a.question_id}-${a.item_id}`] = a.score;
      }
    });
    return init;
  });

  const [textAnswers, setTextAnswers] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    existingAnswers.forEach((a) => {
      if (a.text_answer != null) init[a.question_id] = a.text_answer;
    });
    return init;
  });

  // セクション別に設問をグループ化
  const sections = detail.sections.length > 0 ? detail.sections : [{ id: null, title: null }];
  const questionsBySection = sections.map((section) => ({
    section,
    questions: detail.questions.filter((q) =>
      section.id == null ? q.section_id == null : q.section_id === section.id
    ),
  }));

  function handleSubmit() {
    // バリデーション
    const answers: AnswerInput[] = [];
    let hasError = false;

    for (const q of detail.questions) {
      if (q.question_type === 'radio') {
        const selected = radioAnswers[q.id];
        if (q.is_required && !selected) {
          hasError = true;
          break;
        }
        if (selected) answers.push({ question_id: q.id, option_id: selected });
      }

      if (q.question_type === 'checkbox') {
        const selected = checkboxAnswers[q.id];
        if (q.is_required && (!selected || selected.size === 0)) {
          hasError = true;
          break;
        }
        selected?.forEach((opt) => {
          answers.push({ question_id: q.id, option_id: opt });
        });
      }

      if (q.question_type === 'rating_table') {
        for (const item of q.items) {
          const score = ratingAnswers[`${q.id}-${item.id}`];
          if (q.is_required && score == null) {
            hasError = true;
            break;
          }
          if (score != null) {
            answers.push({ question_id: q.id, item_id: item.id, score });
          }
        }
        if (hasError) break;
      }

      if (q.question_type === 'text') {
        const text = textAnswers[q.id] ?? '';
        if (q.is_required && !text.trim()) {
          hasError = true;
          break;
        }
        if (text.trim()) answers.push({ question_id: q.id, text_answer: text.trim() });
      }
    }

    if (hasError) {
      setError('必須項目に回答してください。');
      return;
    }

    setError('');
    startTransition(async () => {
      const res = await submitAnswers(assignmentId, answers);
      if (res.success) {
        setSubmitted(true);
      } else {
        setError(res.error ?? '提出に失敗しました。');
      }
    });
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4 space-y-4">
        <p className="text-5xl">✅</p>
        <h2 className="text-xl font-bold text-neutral-800">回答を提出しました</h2>
        <p className="text-sm text-neutral-500">ご回答ありがとうございました。</p>
        <button
          onClick={() => router.push(APP_ROUTES.TENANT.SURVEY_ANSWERS)}
          className="mt-4 text-sm text-primary hover:underline"
        >
          アンケート一覧へ戻る
        </button>
      </div>
    );
  }

  const totalQuestions = detail.questions.length;
  const answeredCount = detail.questions.filter((q) => {
    if (q.question_type === 'radio') return !!radioAnswers[q.id];
    if (q.question_type === 'checkbox') return (checkboxAnswers[q.id]?.size ?? 0) > 0;
    if (q.question_type === 'rating_table') return q.items.every((it) => ratingAnswers[`${q.id}-${it.id}`] != null);
    if (q.question_type === 'text') return !!(textAnswers[q.id]?.trim());
    return false;
  }).length;

  return (
    <div className="pb-16">
      {/* アンケートヘッダー */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-5 shadow-sm">
        <h1 className="text-lg font-bold text-neutral-800 leading-snug">{detail.title}</h1>
        {detail.description && (
          <p className="text-sm text-neutral-600 mt-2 leading-relaxed">{detail.description}</p>
        )}
      </div>

      {/* 進捗バー */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
          <span>回答進捗</span>
          <span>{answeredCount} / {totalQuestions}</span>
        </div>
        <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* 設問 */}
      <div className="space-y-5">
        {questionsBySection.map(({ section, questions }) => (
          <div key={section.id ?? 'default'}>
            {/* セクション見出し */}
            {section.title && (
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-primary rounded-full" />
                <h2 className="text-sm font-bold text-neutral-700">{section.title}</h2>
              </div>
            )}

            <div className="space-y-4">
              {questions.map((q, qIdx) => {
                const globalIdx = detail.questions.findIndex((dq) => dq.id === q.id);
                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm"
                  >
                    <p className="text-sm font-semibold text-neutral-800 mb-3">
                      <span className="text-primary font-bold mr-1">Q{globalIdx + 1}.</span>
                      {q.question_text}
                      {q.is_required && (
                        <span className="ml-1 text-xs text-red-500">*</span>
                      )}
                    </p>

                    {/* ラジオ */}
                    {q.question_type === 'radio' && (
                      <div className="space-y-2">
                        {q.options.map((opt) => (
                          <label
                            key={opt.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 cursor-pointer hover:bg-blue-50 hover:border-primary/40 transition-colors"
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={opt.id}
                              checked={radioAnswers[q.id] === opt.id}
                              onChange={() => setRadioAnswers((prev) => ({ ...prev, [q.id]: opt.id }))}
                              className="accent-primary"
                            />
                            <span className="text-sm text-neutral-700">{opt.option_text}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* チェックボックス */}
                    {q.question_type === 'checkbox' && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {q.options.map((opt) => {
                          const checked = checkboxAnswers[q.id]?.has(opt.id) ?? false;
                          return (
                            <label
                              key={opt.id}
                              className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 cursor-pointer hover:bg-blue-50 hover:border-primary/40 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setCheckboxAnswers((prev) => {
                                    const next = new Set(prev[q.id] ?? []);
                                    if (next.has(opt.id)) next.delete(opt.id);
                                    else next.add(opt.id);
                                    return { ...prev, [q.id]: next };
                                  });
                                }}
                                className="accent-primary"
                              />
                              <span className="text-sm text-neutral-700">{opt.option_text}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* 評価表 */}
                    {q.question_type === 'rating_table' && (
                      <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-sm min-w-[300px]">
                          <thead>
                            <tr>
                              <th className="text-left py-2 px-1 text-xs text-neutral-500 w-24" />
                              {(q.scale_labels ?? ['1', '2', '3', '4', '5']).map((label, i) => (
                                <th key={i} className="text-center py-2 px-1 text-xs text-neutral-500 font-normal">
                                  {label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {q.items.map((item) => {
                                const key = `${q.id}-${item.id}`;
                                const scaleCount = (q.scale_labels ?? ['1', '2', '3', '4', '5']).length;
                                return (
                                  <tr key={item.id}>
                                    <td className="py-3 px-1 text-xs text-neutral-700 font-medium">
                                      {item.item_text}
                                    </td>
                                    {Array.from({ length: scaleCount }, (_, i) => i + 1).map((score) => (
                                      <td key={score} className="text-center py-3 px-1">
                                        <label className="cursor-pointer">
                                          <input
                                            type="radio"
                                            name={key}
                                            value={score}
                                            checked={ratingAnswers[key] === score}
                                            onChange={() =>
                                              setRatingAnswers((prev) => ({ ...prev, [key]: score }))
                                            }
                                            className="accent-primary w-5 h-5"
                                          />
                                        </label>
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* 自由記述 */}
                    {q.question_type === 'text' && (
                      <textarea
                        value={textAnswers[q.id] ?? ''}
                        onChange={(e) =>
                          setTextAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        rows={4}
                        className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                        placeholder="ご自由にお書きください"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* エラー */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 送信ボタン */}
      <div className="mt-6">
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full bg-primary text-white font-semibold py-4 rounded-xl text-base hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
        >
          {isPending ? '送信中...' : '回答を提出する'}
        </button>
        <button
          onClick={() => router.push(APP_ROUTES.TENANT.SURVEY_ANSWERS)}
          className="w-full mt-3 text-sm text-neutral-400 hover:text-neutral-600 py-2"
        >
          一覧へ戻る
        </button>
      </div>
    </div>
  );
}
