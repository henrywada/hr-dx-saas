'use client'

import { useState, useTransition } from 'react'
import { Save, Plus, Trash2 } from 'lucide-react'
import {
  upsertSlide,
  upsertQuizQuestion,
  upsertQuizOptions,
  upsertScenarioBranch,
  deleteScenarioBranch,
  upsertChecklistItem,
  deleteChecklistItem,
} from '../actions'
import { SLIDE_TYPE_LABELS, MICRO_LEARNING_SLIDE_TYPES } from '../constants'
import type { ElSlide, ElScenarioBranch, ElChecklistItem, SlideType } from '../types'

interface Props {
  slide: ElSlide
  courseId: string
  onUpdate: (updated: ElSlide) => void
}

const TEXT_CONTENT_TYPES: SlideType[] = ['text', 'objective', 'micro_content', 'reflection']

export function SlideFormPanel({ slide, courseId, onUpdate }: Props) {
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(slide.title ?? '')
  const [content, setContent] = useState(slide.content ?? '')
  const [slideType, setSlideType] = useState<SlideType>(slide.slide_type)
  const [videoUrl, setVideoUrl] = useState(slide.video_url ?? '')
  const [saved, setSaved] = useState(false)

  // クイズ
  const firstQ = slide.quiz_questions?.[0]
  const [questionText, setQuestionText] = useState(firstQ?.question_text ?? '')
  const [explanation, setExplanation] = useState(firstQ?.explanation ?? '')
  const [options, setOptions] = useState(
    firstQ?.options?.length
      ? firstQ.options.map(o => ({ text: o.option_text, is_correct: o.is_correct }))
      : [
          { text: '', is_correct: false },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
        ]
  )

  // シナリオ分岐（楽観的更新用ローカルコピー）
  const [branches, setBranches] = useState<ElScenarioBranch[]>(slide.scenario_branches ?? [])

  // チェックリスト項目（楽観的更新用ローカルコピー）
  const [checklistItems, setChecklistItems] = useState<ElChecklistItem[]>(
    slide.checklist_items ?? []
  )

  const handleSave = () => {
    startTransition(async () => {
      const updated = await upsertSlide({
        id: slide.id,
        course_id: courseId,
        slide_order: slide.slide_order,
        slide_type: slideType,
        title,
        content: [...TEXT_CONTENT_TYPES, 'scenario', 'checklist'].includes(slideType)
          ? content
          : undefined,
        video_url: slideType === 'micro_content' ? videoUrl || undefined : undefined,
      })

      if (slideType === 'quiz') {
        const q = await upsertQuizQuestion({
          id: firstQ?.id,
          slide_id: slide.id,
          question_text: questionText,
          question_order: 0,
          explanation,
        })
        await upsertQuizOptions(q.id, options)
      }

      onUpdate({
        ...slide,
        ...updated,
        slide_type: slideType,
        title,
        content,
        video_url: videoUrl || null,
        scenario_branches: branches,
        checklist_items: checklistItems,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const handleAddBranch = () => {
    startTransition(async () => {
      const newBranch = await upsertScenarioBranch({
        slide_id: slide.id,
        branch_order: branches.length,
        choice_text: '',
        feedback_text: '',
        is_recommended: false,
      })
      setBranches(prev => [...prev, newBranch as ElScenarioBranch])
    })
  }

  const handleSaveBranch = (branch: ElScenarioBranch) => {
    startTransition(async () => {
      await upsertScenarioBranch({
        id: branch.id,
        slide_id: branch.slide_id,
        branch_order: branch.branch_order,
        choice_text: branch.choice_text,
        feedback_text: branch.feedback_text ?? '',
        is_recommended: branch.is_recommended,
      })
    })
  }

  const handleDeleteBranch = (branchId: string) => {
    startTransition(async () => {
      await deleteScenarioBranch(branchId)
      setBranches(prev => prev.filter(b => b.id !== branchId))
    })
  }

  const handleAddItem = () => {
    startTransition(async () => {
      const newItem = await upsertChecklistItem({
        slide_id: slide.id,
        item_order: checklistItems.length,
        item_text: '',
      })
      setChecklistItems(prev => [...prev, newItem as ElChecklistItem])
    })
  }

  const handleSaveItem = (item: ElChecklistItem) => {
    startTransition(async () => {
      await upsertChecklistItem({
        id: item.id,
        slide_id: item.slide_id,
        item_order: item.item_order,
        item_text: item.item_text,
      })
    })
  }

  const handleDeleteItem = (itemId: string) => {
    startTransition(async () => {
      await deleteChecklistItem(itemId)
      setChecklistItems(prev => prev.filter(it => it.id !== itemId))
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      {/* スライドタイプ＋保存ボタン */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">スライドタイプ</label>
          <select
            value={slideType}
            onChange={e => setSlideType(e.target.value as SlideType)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <optgroup label="マイクロラーニング">
              {MICRO_LEARNING_SLIDE_TYPES.map(t => (
                <option key={t} value={t}>
                  {SLIDE_TYPE_LABELS[t]}
                </option>
              ))}
            </optgroup>
            <optgroup label="従来スライド">
              {(['text', 'image', 'quiz'] as SlideType[]).map(t => (
                <option key={t} value={t}>
                  {SLIDE_TYPE_LABELS[t]}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 mt-5"
        >
          <Save className="w-4 h-4" />
          {saved ? '保存済み ✓' : isPending ? '保存中...' : '保存'}
        </button>
      </div>

      {/* タイトル */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">タイトル</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="スライドタイトル"
        />
      </div>

      {/* テキスト系コンテンツ */}
      {[...TEXT_CONTENT_TYPES, 'scenario'].includes(slideType) && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {slideType === 'scenario' ? 'シナリオ本文（状況説明）' : 'コンテンツ（Markdown対応）'}
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={slideType === 'scenario' ? 6 : 10}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder={
              slideType === 'scenario'
                ? '「あなたは〇〇の場面に遭遇しました…」'
                : '# 見出し\n\n本文をここに入力します。'
            }
          />
        </div>
      )}

      {/* micro_content の動画 URL */}
      {slideType === 'micro_content' && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            動画 URL（任意・YouTube / Vimeo）
          </label>
          <input
            type="url"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
      )}

      {/* 画像スライド */}
      {slideType === 'image' && (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-400">
          <p className="text-sm">画像アップロードは別途対応予定です</p>
        </div>
      )}

      {/* クイズスライド */}
      {slideType === 'quiz' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">問題文</label>
            <textarea
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="問題文を入力"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">
              選択肢（正解をチェック）
            </label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={opt.is_correct}
                    onChange={() =>
                      setOptions(options.map((o, j) => ({ ...o, is_correct: j === i })))
                    }
                    className="text-blue-600"
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={e =>
                      setOptions(
                        options.map((o, j) => (j === i ? { ...o, text: e.target.value } : o))
                      )
                    }
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`選択肢 ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">解説</label>
            <textarea
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="正解の解説を入力"
            />
          </div>
        </div>
      )}

      {/* シナリオ分岐エディタ */}
      {slideType === 'scenario' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-500">選択肢と分岐フィードバック</label>
            <button
              type="button"
              onClick={handleAddBranch}
              disabled={isPending}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              選択肢を追加
            </button>
          </div>
          {branches.map((branch, idx) => (
            <div key={branch.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-4">
                  {String.fromCharCode(65 + idx)}.
                </span>
                <input
                  type="text"
                  value={branch.choice_text}
                  onChange={e =>
                    setBranches(prev =>
                      prev.map(b =>
                        b.id === branch.id ? { ...b, choice_text: e.target.value } : b
                      )
                    )
                  }
                  onBlur={() => handleSaveBranch(branch)}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="選択肢テキスト"
                />
                <label className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                  <input
                    type="checkbox"
                    checked={branch.is_recommended}
                    onChange={e => {
                      const updated = { ...branch, is_recommended: e.target.checked }
                      setBranches(prev => prev.map(b => (b.id === branch.id ? updated : b)))
                      handleSaveBranch(updated)
                    }}
                    className="text-green-600"
                  />
                  推奨
                </label>
                <button
                  type="button"
                  onClick={() => handleDeleteBranch(branch.id)}
                  disabled={isPending}
                  className="text-red-400 hover:text-red-600 disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={branch.feedback_text ?? ''}
                onChange={e =>
                  setBranches(prev =>
                    prev.map(b =>
                      b.id === branch.id ? { ...b, feedback_text: e.target.value } : b
                    )
                  )
                }
                onBlur={() => handleSaveBranch(branch)}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                placeholder="この選択肢を選んだときのフィードバック"
              />
            </div>
          ))}
        </div>
      )}

      {/* チェックリスト項目エディタ */}
      {slideType === 'checklist' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-500">現場適用チェック項目</label>
            <button
              type="button"
              onClick={handleAddItem}
              disabled={isPending}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              項目を追加
            </button>
          </div>
          {checklistItems.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 shrink-0">{idx + 1}.</span>
              <input
                type="text"
                value={item.item_text}
                onChange={e =>
                  setChecklistItems(prev =>
                    prev.map(it =>
                      it.id === item.id ? { ...it, item_text: e.target.value } : it
                    )
                  )
                }
                onBlur={() => handleSaveItem(item)}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="「〇〇を上司に共有した」等の完了形で記述"
              />
              <button
                type="button"
                onClick={() => handleDeleteItem(item.id)}
                disabled={isPending}
                className="text-red-400 hover:text-red-600 disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
