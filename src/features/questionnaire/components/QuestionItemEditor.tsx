'use client';

import { useState } from 'react';
import type { QuestionType } from '../types';

const DEFAULT_SCALE_LABELS = ['非常に不満', 'やや不満', 'どちらとも言えない', 'やや満足', '非常に満足'];

export interface QuestionDraft {
  localId: string;
  question_type: QuestionType;
  question_text: string;
  scale_labels: string[];
  is_required: boolean;
  options: { localId: string; option_text: string }[];
  items: { localId: string; item_text: string }[];
}

interface Props {
  question: QuestionDraft;
  index: number;
  total: number;
  onChange: (q: QuestionDraft) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  radio:        '単一選択（ラジオ）',
  checkbox:     '複数選択（チェックボックス）',
  rating_table: '評価表（5段階）',
  text:         '自由記述',
};

export default function QuestionItemEditor({
  question,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  function update(patch: Partial<QuestionDraft>) {
    onChange({ ...question, ...patch });
  }

  function addOption() {
    update({
      options: [...question.options, { localId: crypto.randomUUID(), option_text: '' }],
    });
  }

  function updateOption(localId: string, text: string) {
    update({
      options: question.options.map((o) =>
        o.localId === localId ? { ...o, option_text: text } : o
      ),
    });
  }

  function removeOption(localId: string) {
    update({ options: question.options.filter((o) => o.localId !== localId) });
  }

  function addItem() {
    update({
      items: [...question.items, { localId: crypto.randomUUID(), item_text: '' }],
    });
  }

  function updateItem(localId: string, text: string) {
    update({
      items: question.items.map((it) =>
        it.localId === localId ? { ...it, item_text: text } : it
      ),
    });
  }

  function removeItem(localId: string) {
    update({ items: question.items.filter((it) => it.localId !== localId) });
  }

  return (
    <div className="border border-neutral-200 rounded-lg bg-white">
      {/* ヘッダー行 */}
      <div className="flex items-center gap-2 px-4 py-3 bg-neutral-50 rounded-t-lg">
        <span className="text-xs font-semibold text-neutral-500 w-6">Q{index + 1}</span>
        <span className="text-sm font-medium text-neutral-700 flex-1 truncate">
          {question.question_text || '（設問テキスト未入力）'}
        </span>
        <span className="text-xs text-neutral-400">{QUESTION_TYPE_LABELS[question.question_type]}</span>
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30 text-base px-1"
          title="上へ"
        >
          ↑
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="text-neutral-400 hover:text-neutral-700 disabled:opacity-30 text-base px-1"
          title="下へ"
        >
          ↓
        </button>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-neutral-400 hover:text-neutral-700 text-xs px-1"
        >
          {collapsed ? '展開' : '折りたたむ'}
        </button>
        <button
          onClick={onDelete}
          className="text-red-400 hover:text-red-600 text-xs px-1"
        >
          削除
        </button>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {/* 設問テキスト */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">設問テキスト</label>
            <input
              type="text"
              value={question.question_text}
              onChange={(e) => update({ question_text: e.target.value })}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="設問を入力してください"
            />
          </div>

          {/* 設問タイプ */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-neutral-600 mb-1">設問タイプ</label>
              <select
                value={question.question_type}
                onChange={(e) => update({ question_type: e.target.value as QuestionType })}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                id={`required-${question.localId}`}
                checked={question.is_required}
                onChange={(e) => update({ is_required: e.target.checked })}
                className="accent-primary"
              />
              <label htmlFor={`required-${question.localId}`} className="text-sm text-neutral-600">
                必須
              </label>
            </div>
          </div>

          {/* radio / checkbox: 選択肢 */}
          {(question.question_type === 'radio' || question.question_type === 'checkbox') && (
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-2">選択肢</label>
              <div className="space-y-2">
                {question.options.map((o) => (
                  <div key={o.localId} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={o.option_text}
                      onChange={(e) => updateOption(o.localId, e.target.value)}
                      className="flex-1 border border-neutral-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="選択肢テキスト"
                    />
                    <button
                      onClick={() => removeOption(o.localId)}
                      className="text-red-400 hover:text-red-600 text-sm px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addOption}
                className="mt-2 text-sm text-primary hover:underline"
              >
                ＋ 選択肢を追加
              </button>
            </div>
          )}

          {/* rating_table: スケールラベル + 評価項目 */}
          {question.question_type === 'rating_table' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-2">
                  スケールラベル（左から順に）
                </label>
                <div className="flex gap-2 flex-wrap">
                  {question.scale_labels.map((label, i) => (
                    <input
                      key={i}
                      type="text"
                      value={label}
                      onChange={(e) => {
                        const next = [...question.scale_labels];
                        next[i] = e.target.value;
                        update({ scale_labels: next });
                      }}
                      className="w-32 border border-neutral-300 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-2">評価項目（行）</label>
                <div className="space-y-2">
                  {question.items.map((it) => (
                    <div key={it.localId} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={it.item_text}
                        onChange={(e) => updateItem(it.localId, e.target.value)}
                        className="flex-1 border border-neutral-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="例：品質・価格・サポート"
                      />
                      <button
                        onClick={() => removeItem(it.localId)}
                        className="text-red-400 hover:text-red-600 text-sm px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addItem}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  ＋ 評価項目を追加
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function createEmptyQuestion(type: QuestionType = 'radio'): QuestionDraft {
  return {
    localId: crypto.randomUUID(),
    question_type: type,
    question_text: '',
    scale_labels: [...DEFAULT_SCALE_LABELS],
    is_required: true,
    options: [],
    items: [],
  };
}
