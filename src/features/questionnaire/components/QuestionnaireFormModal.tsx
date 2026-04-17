'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import SectionQuestionBuilder, { createInitialSections, type SectionDraft } from './SectionQuestionBuilder';
import { createQuestionnaire } from '../actions';
import type { CreatorType, QuestionnaireListItem } from '../types';

interface Props {
  creatorType: CreatorType;
  tenantId: string;
  onCreated: (item: QuestionnaireListItem) => void;
  onClose: () => void;
}

export default function QuestionnaireFormModal({ creatorType, tenantId, onCreated, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState<SectionDraft[]>(createInitialSections);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  const CREATOR_LABEL = creatorType === 'system' ? 'システム作成' : 'テナント作成';

  function handleSubmit() {
    if (!title.trim()) {
      setError('タイトルを入力してください。');
      return;
    }
    const hasEmpty = sections.some((s) =>
      s.questions.some((q) => !q.question_text.trim())
    );
    if (hasEmpty) {
      setError('空の設問テキストがあります。すべて入力してください。');
      return;
    }

    setError('');
    startTransition(async () => {
      const res = await createQuestionnaire({
        creator_type: creatorType,
        title: title.trim(),
        description: description.trim() || undefined,
        sections: sections.map((s, si) => ({
          title: s.title,
          sort_order: si,
          questions: s.questions.map((q, qi) => ({
            question_type: q.question_type,
            question_text: q.question_text,
            scale_labels: q.question_type === 'rating_table' ? q.scale_labels : undefined,
            is_required: q.is_required,
            sort_order: qi,
            options: q.options.map((o, oi) => ({
              option_text: o.option_text,
              sort_order: oi,
            })),
            items: q.items.map((it, ii) => ({
              item_text: it.item_text,
              sort_order: ii,
            })),
          })),
        })),
      });

      if (!res.success) {
        setError(res.error ?? '作成に失敗しました。');
        return;
      }

      // 作成されたアイテムを親に渡す（簡易版：サーバーから再取得せず楽観更新）
      const newItem: QuestionnaireListItem = {
        id: res.id!,
        creator_type: creatorType,
        tenant_id: creatorType === 'system' ? null : tenantId,
        title: title.trim(),
        description: description.trim() || null,
        status: 'draft',
        created_by_employee_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        question_count: sections.reduce((sum, s) => sum + s.questions.length, 0),
        assignment_count: 0,
        submitted_count: 0,
      };
      onCreated(newItem);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto py-8">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl mx-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-bold text-neutral-800">
            アンケート作成
            <span className="ml-2 text-sm font-normal text-neutral-500">（{CREATOR_LABEL}）</span>
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="例：顧客満足度調査"
            />
          </div>

          {/* 説明文 */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              冒頭説明文（任意）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="アンケートの目的や回答者へのメッセージを入力してください"
            />
          </div>

          {/* 設問ビルダー */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-3">設問</label>
            <SectionQuestionBuilder sections={sections} onChange={setSections} />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200">
          <Button variant="outline" size="md" onClick={onClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={isPending}>
            {isPending ? '作成中...' : 'アンケートを作成'}
          </Button>
        </div>
      </div>
    </div>
  );
}
