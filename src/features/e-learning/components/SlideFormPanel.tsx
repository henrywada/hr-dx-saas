'use client'

import { useState, useTransition, useRef, useEffect, useId } from 'react'
import { Save, Plus, Trash2, Upload, X, ImageIcon, Video } from 'lucide-react'
import {
  upsertSlide,
  upsertQuizQuestion,
  upsertQuizOptions,
  upsertScenarioBranch,
  deleteScenarioBranch,
  upsertChecklistItem,
  deleteChecklistItem,
  uploadSlideImage,
  deleteSlideImage,
  uploadSlideVideo,
  deleteSlideVideo,
} from '../actions'
import {
  SLIDE_TYPE_LABELS,
  MICRO_LEARNING_SLIDE_TYPES,
  EL_SLIDE_IMAGE_MAX_MB,
  EL_SLIDE_VIDEO_MAX_MB,
} from '../constants'
import type { ElSlide, ElScenarioBranch, ElChecklistItem, SlideType } from '../types'

function isLegacySlideType(t: SlideType): boolean {
  return !MICRO_LEARNING_SLIDE_TYPES.includes(t)
}

function isProbablyYoutubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url)
}

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return `https://www.youtube.com/embed/${v}`
      const m = u.pathname.match(/\/embed\/([^/?]+)/)
      if (m) return `https://www.youtube.com/embed/${m[1]}`
    }
  } catch {
    return null
  }
  return null
}

interface Props {
  slide: ElSlide
  courseId: string
  onUpdate: (updated: ElSlide) => void
}

const TEXT_CONTENT_TYPES: SlideType[] = ['text', 'image', 'objective', 'micro_content', 'reflection']

export function SlideFormPanel({ slide, courseId, onUpdate }: Props) {
  const microImageInputId = useId()
  const legacyImageInputId = useId()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState(slide.title ?? '')
  const [content, setContent] = useState(slide.content ?? '')
  const [slideType, setSlideType] = useState<SlideType>(slide.slide_type)
  const [videoUrl, setVideoUrl] = useState(slide.video_url ?? '')
  const [saved, setSaved] = useState(false)

  // 画像アップロード
  const [imageUrl, setImageUrl] = useState<string | null>(slide.image_url ?? null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [microLocalPreview, setMicroLocalPreview] = useState<string | null>(null)
  const [microImageError, setMicroImageError] = useState<string | null>(null)
  const [isMicroUploading, setIsMicroUploading] = useState(false)

  const videoFileRef = useRef<HTMLInputElement>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [isVideoUploading, setIsVideoUploading] = useState(false)

  useEffect(() => {
    setImageUrl(slide.image_url ?? null)
  }, [slide.id, slide.image_url])

  useEffect(() => {
    setVideoUrl(slide.video_url ?? '')
  }, [slide.id, slide.video_url])

  /** 画像スライド: ファイル選択後すぐアップロード（input の条件付きアンマウントで ref が空になる不具合を避ける） */
  const handleLegacyImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageError(null)
    const preview = URL.createObjectURL(file)
    setLocalPreview(preview)
    setIsUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    startTransition(async () => {
      try {
        const url = await uploadSlideImage(slide.id, courseId, fd)
        setImageUrl(url)
        setLocalPreview(null)
        onUpdate({ ...slide, image_url: url })
      } catch (err) {
        setImageError(err instanceof Error ? err.message : 'アップロードに失敗しました')
        setLocalPreview(null)
      } finally {
        setIsUploading(false)
        URL.revokeObjectURL(preview)
        e.target.value = ''
      }
    })
  }

  const handleImageDelete = () => {
    if (!confirm('画像を削除しますか？')) return
    startTransition(async () => {
      try {
        await deleteSlideImage(slide.id, courseId)
        setImageUrl(null)
        setLocalPreview(null)
        onUpdate({ ...slide, image_url: null })
      } catch (err) {
        setImageError(err instanceof Error ? err.message : '削除に失敗しました')
      }
    })
  }

  /** ミニ講座: 画像は選択と同時にアップロード（動画と同様・確定ボタン不要） */
  const handleMicroImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMicroImageError(null)
    const preview = URL.createObjectURL(file)
    setMicroLocalPreview(preview)
    setIsMicroUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    startTransition(async () => {
      try {
        const url = await uploadSlideImage(slide.id, courseId, fd)
        setImageUrl(url)
        setMicroLocalPreview(null)
        onUpdate({ ...slide, image_url: url })
      } catch (err) {
        setMicroImageError(err instanceof Error ? err.message : 'アップロードに失敗しました')
        setMicroLocalPreview(null)
      } finally {
        setIsMicroUploading(false)
        URL.revokeObjectURL(preview)
        e.target.value = ''
      }
    })
  }

  const handleMicroImageDelete = () => {
    if (!confirm('画像を削除しますか？')) return
    startTransition(async () => {
      try {
        await deleteSlideImage(slide.id, courseId)
        setImageUrl(null)
        setMicroLocalPreview(null)
        onUpdate({ ...slide, image_url: null })
      } catch (err) {
        setMicroImageError(err instanceof Error ? err.message : '削除に失敗しました')
      }
    })
  }

  const handleVideoUpload = () => {
    const file = videoFileRef.current?.files?.[0]
    if (!file) return
    setVideoError(null)
    setIsVideoUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    startTransition(async () => {
      try {
        const url = await uploadSlideVideo(slide.id, courseId, fd)
        setVideoUrl(url)
        onUpdate({ ...slide, video_url: url })
      } catch (err) {
        setVideoError(err instanceof Error ? err.message : '動画のアップロードに失敗しました')
      } finally {
        setIsVideoUploading(false)
        if (videoFileRef.current) videoFileRef.current.value = ''
      }
    })
  }

  const handleVideoDelete = () => {
    if (!confirm('動画を削除しますか？')) return
    startTransition(async () => {
      try {
        await deleteSlideVideo(slide.id, courseId)
        setVideoUrl('')
        onUpdate({ ...slide, video_url: null })
      } catch (err) {
        setVideoError(err instanceof Error ? err.message : '削除に失敗しました')
      }
    })
  }

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
        ...(slideType === 'micro_content' || slideType === 'image'
          ? { image_url: imageUrl }
          : {}),
        video_url: slideType === 'micro_content' ? videoUrl || null : null,
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
        ...(slideType === 'micro_content' || slideType === 'image'
          ? { image_url: imageUrl }
          : {}),
        video_url: slideType === 'micro_content' ? videoUrl || null : null,
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
            {isLegacySlideType(slideType) && (
              <optgroup label="旧形式（表示・編集のみ）">
                <option value={slideType}>{SLIDE_TYPE_LABELS[slideType]}</option>
              </optgroup>
            )}
            <optgroup label="マイクロラーニング">
              {MICRO_LEARNING_SLIDE_TYPES.map(t => (
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
            {slideType === 'scenario'
              ? 'シナリオ本文（状況説明）'
              : slideType === 'image'
                ? '説明テキスト（Markdown対応）'
                : 'コンテンツ（Markdown対応）'}
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

      {/* ミニ講座: 画像・動画アップロード */}
      {slideType === 'micro_content' && (
        <div className="space-y-6 border-t border-gray-100 pt-4">
          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-500">画像（任意）</label>
            <p className="text-xs text-gray-400 -mt-1">
              JPEG・PNG・GIF・WebP ・ 1 ファイル最大 {EL_SLIDE_IMAGE_MAX_MB}MB まで（選択後すぐサーバーに保存されます）
            </p>
            <input
              id={microImageInputId}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleMicroImagePick}
              className="sr-only"
              disabled={isMicroUploading || isPending}
            />
            {(imageUrl || microLocalPreview) && (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={microLocalPreview ?? imageUrl ?? ''}
                  alt="スライド画像プレビュー"
                  className="w-full max-h-56 object-contain"
                />
                {isMicroUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-sm font-medium">
                    アップロード中...
                  </div>
                )}
                {imageUrl && !microLocalPreview && !isMicroUploading && (
                  <button
                    type="button"
                    onClick={handleMicroImageDelete}
                    disabled={isPending}
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-1 text-red-500 hover:text-red-700 shadow disabled:opacity-40"
                    title="画像を削除"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            {!imageUrl && !microLocalPreview && (
              <label
                htmlFor={microImageInputId}
                className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              >
                <ImageIcon className="w-5 h-5 text-gray-400 mb-1" />
                <span className="text-sm text-gray-500">画像をアップロード</span>
                <span className="text-xs text-gray-400 mt-0.5">
                  上記の形式・{EL_SLIDE_IMAGE_MAX_MB}MB 以下のファイルを選択
                </span>
              </label>
            )}
            {imageUrl && !microLocalPreview && !isMicroUploading && (
              <label
                htmlFor={microImageInputId}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 cursor-pointer w-fit"
              >
                <Upload className="w-3.5 h-3.5" />
                画像を差し替える
              </label>
            )}
            {microImageError && <p className="text-xs text-red-600">{microImageError}</p>}
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-500">動画（任意）</label>
            <p className="text-xs text-gray-400 -mt-1">
              MP4・WebM・MOV（QuickTime）・ 1 ファイル最大 {EL_SLIDE_VIDEO_MAX_MB}MB まで
            </p>
            {videoUrl ? (
              <div className="space-y-2">
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-black max-h-56">
                  {isProbablyYoutubeUrl(videoUrl) && getYoutubeEmbedUrl(videoUrl) ? (
                    <iframe
                      src={getYoutubeEmbedUrl(videoUrl)!}
                      title="動画プレビュー"
                      className="w-full aspect-video max-h-56"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video src={videoUrl} controls className="w-full max-h-56" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleVideoDelete}
                  disabled={isPending}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  動画を削除
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                <Video className="w-5 h-5 text-gray-400 mb-1" />
                <span className="text-sm text-gray-500">動画をアップロード</span>
                <span className="text-xs text-gray-400 mt-0.5">
                  上記の形式・{EL_SLIDE_VIDEO_MAX_MB}MB 以下のファイルを選択
                </span>
                <input
                  ref={videoFileRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mov"
                  onChange={() => {
                    setVideoError(null)
                    const f = videoFileRef.current?.files?.[0]
                    if (f) handleVideoUpload()
                  }}
                  className="hidden"
                />
              </label>
            )}
            {videoError && <p className="text-xs text-red-600">{videoError}</p>}
            {isVideoUploading && <p className="text-xs text-gray-500">アップロード中...</p>}
          </div>
        </div>
      )}

      {/* 画像スライド */}
      {slideType === 'image' && (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-gray-500">スライド画像</label>
          <p className="text-xs text-gray-400 -mt-1">
            JPEG・PNG・GIF・WebP ・ 最大 {EL_SLIDE_IMAGE_MAX_MB}MB まで（選択後すぐサーバーに保存されます）
          </p>
          <input
            id={legacyImageInputId}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleLegacyImagePick}
            className="sr-only"
            disabled={isUploading || isPending}
          />

          {(imageUrl || localPreview) && (
            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={localPreview ?? imageUrl ?? ''}
                alt="スライド画像プレビュー"
                className="w-full max-h-64 object-contain"
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-sm font-medium">
                  アップロード中...
                </div>
              )}
              {imageUrl && !localPreview && !isUploading && (
                <button
                  type="button"
                  onClick={handleImageDelete}
                  disabled={isPending}
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-1 text-red-500 hover:text-red-700 shadow disabled:opacity-40"
                  title="画像を削除"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {!imageUrl && !localPreview && (
            <label
              htmlFor={legacyImageInputId}
              className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-5 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-sm text-gray-500">クリックして画像を選択</span>
              <span className="text-xs text-gray-400 mt-0.5">
                上記の形式・{EL_SLIDE_IMAGE_MAX_MB}MB 以下のファイルを選択
              </span>
            </label>
          )}

          {imageUrl && !localPreview && !isUploading && (
            <label
              htmlFor={legacyImageInputId}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 cursor-pointer w-fit"
            >
              <Upload className="w-3.5 h-3.5" />
              別の画像に差し替える
            </label>
          )}

          {imageError && <p className="text-xs text-red-600">{imageError}</p>}
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
