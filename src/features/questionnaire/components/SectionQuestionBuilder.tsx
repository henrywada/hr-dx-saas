'use client';

import { useState } from 'react';
import QuestionItemEditor, { createEmptyQuestion, type QuestionDraft } from './QuestionItemEditor';
import type { QuestionType } from '../types';

export interface SectionDraft {
  localId: string;
  title: string;
  questions: QuestionDraft[];
}

interface Props {
  sections: SectionDraft[];
  onChange: (sections: SectionDraft[]) => void;
}

function createEmptySection(): SectionDraft {
  return {
    localId: crypto.randomUUID(),
    title: '',
    questions: [createEmptyQuestion()],
  };
}

export function createInitialSections(): SectionDraft[] {
  return [
    {
      localId: crypto.randomUUID(),
      title: '',
      questions: [createEmptyQuestion()],
    },
  ];
}

export default function SectionQuestionBuilder({ sections, onChange }: Props) {
  function updateSection(localId: string, patch: Partial<SectionDraft>) {
    onChange(sections.map((s) => (s.localId === localId ? { ...s, ...patch } : s)));
  }

  function addSection() {
    onChange([...sections, createEmptySection()]);
  }

  function removeSection(localId: string) {
    if (sections.length === 1) return; // 最低1セクション維持
    onChange(sections.filter((s) => s.localId !== localId));
  }

  function addQuestion(sectionLocalId: string) {
    updateSection(sectionLocalId, {
      questions: [
        ...(sections.find((s) => s.localId === sectionLocalId)?.questions ?? []),
        createEmptyQuestion(),
      ],
    });
  }

  function addQuestionOfType(sectionLocalId: string, type: QuestionType) {
    const section = sections.find((s) => s.localId === sectionLocalId);
    if (!section) return;
    updateSection(sectionLocalId, {
      questions: [...section.questions, createEmptyQuestion(type)],
    });
  }

  function updateQuestion(sectionLocalId: string, q: QuestionDraft) {
    const section = sections.find((s) => s.localId === sectionLocalId);
    if (!section) return;
    updateSection(sectionLocalId, {
      questions: section.questions.map((existing) =>
        existing.localId === q.localId ? q : existing
      ),
    });
  }

  function deleteQuestion(sectionLocalId: string, questionLocalId: string) {
    const section = sections.find((s) => s.localId === sectionLocalId);
    if (!section) return;
    updateSection(sectionLocalId, {
      questions: section.questions.filter((q) => q.localId !== questionLocalId),
    });
  }

  function moveQuestion(sectionLocalId: string, fromIdx: number, toIdx: number) {
    const section = sections.find((s) => s.localId === sectionLocalId);
    if (!section) return;
    const qs = [...section.questions];
    const [moved] = qs.splice(fromIdx, 1);
    qs.splice(toIdx, 0, moved);
    updateSection(sectionLocalId, { questions: qs });
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.localId} className="border border-neutral-200 rounded-xl overflow-hidden">
          {/* セクションヘッダー */}
          <div className="bg-neutral-100 px-4 py-3 flex items-center gap-3">
            <input
              type="text"
              value={section.title}
              onChange={(e) => updateSection(section.localId, { title: e.target.value })}
              placeholder="セクション名（任意）例：【お客様属性】"
              className="flex-1 bg-transparent border-b border-neutral-300 text-sm font-medium text-neutral-700 focus:outline-none focus:border-primary"
            />
            {sections.length > 1 && (
              <button
                onClick={() => removeSection(section.localId)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                セクション削除
              </button>
            )}
          </div>

          {/* 設問一覧 */}
          <div className="p-4 space-y-3">
            {section.questions.map((q, idx) => (
              <QuestionItemEditor
                key={q.localId}
                question={q}
                index={idx}
                total={section.questions.length}
                onChange={(updated) => updateQuestion(section.localId, updated)}
                onDelete={() => deleteQuestion(section.localId, q.localId)}
                onMoveUp={() => moveQuestion(section.localId, idx, idx - 1)}
                onMoveDown={() => moveQuestion(section.localId, idx, idx + 1)}
              />
            ))}

            {/* 設問追加ボタン群 */}
            <div className="flex gap-2 flex-wrap pt-1">
              <span className="text-xs text-neutral-400 self-center">設問を追加：</span>
              {(['radio', 'checkbox', 'rating_table', 'text'] as QuestionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => addQuestionOfType(section.localId, type)}
                  className="text-xs border border-neutral-300 rounded-full px-3 py-1 hover:bg-neutral-100 text-neutral-600"
                >
                  {type === 'radio' && '単一選択'}
                  {type === 'checkbox' && '複数選択'}
                  {type === 'rating_table' && '評価表'}
                  {type === 'text' && '自由記述'}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addSection}
        className="w-full border-2 border-dashed border-neutral-300 rounded-xl py-3 text-sm text-neutral-400 hover:border-neutral-400 hover:text-neutral-600 transition-colors"
      >
        ＋ セクションを追加
      </button>
    </div>
  );
}
