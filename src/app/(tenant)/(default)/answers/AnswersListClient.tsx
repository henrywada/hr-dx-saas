'use client';

import { useRouter } from 'next/navigation';
import { APP_ROUTES } from '@/config/routes';
import type { AssignedQuestionnaire } from '@/features/questionnaire/types';

interface Props {
  questionnaires: AssignedQuestionnaire[];
}

export default function AnswersListClient({ questionnaires }: Props) {
  const router = useRouter();

  const pending = questionnaires.filter((q) => !q.submitted_at);
  const done = questionnaires.filter((q) => q.submitted_at);

  function goToAnswer(assignmentId: string) {
    router.push(`${APP_ROUTES.TENANT.SURVEY_ANSWERS}?id=${assignmentId}`);
  }

  if (questionnaires.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <p className="text-4xl mb-4">📋</p>
        <p className="text-neutral-500 text-sm">現在、回答が必要なアンケートはありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* 未回答 */}
      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
            未回答 ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((q) => (
              <button
                key={q.assignment_id}
                onClick={() => goToAnswer(q.assignment_id)}
                className="w-full text-left bg-white border border-neutral-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-neutral-800 text-sm leading-snug">
                      {q.title}
                    </p>
                    {q.description && (
                      <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{q.description}</p>
                    )}
                  </div>
                  <span className="text-xs bg-accent-orange/10 text-accent-orange font-medium rounded-full px-2 py-0.5 whitespace-nowrap flex-shrink-0">
                    未回答
                  </span>
                </div>
                {q.deadline_date && (
                  <p className="text-xs text-neutral-400 mt-2">
                    期限：{q.deadline_date}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-2 text-primary text-xs font-medium">
                  回答する →
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 回答済み */}
      {done.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">
            回答済み ({done.length})
          </h2>
          <div className="space-y-2">
            {done.map((q) => (
              <div
                key={q.assignment_id}
                className="bg-neutral-50 border border-neutral-200 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-neutral-500 font-medium truncate">{q.title}</p>
                  <span className="text-xs bg-green-100 text-green-700 font-medium rounded-full px-2 py-0.5 flex-shrink-0">
                    提出済み
                  </span>
                </div>
                {q.submitted_at && (
                  <p className="text-xs text-neutral-400 mt-1">
                    提出日：{new Date(q.submitted_at).toLocaleDateString('ja-JP')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
