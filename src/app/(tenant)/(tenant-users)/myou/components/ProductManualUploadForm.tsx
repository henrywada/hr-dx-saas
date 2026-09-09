'use client'

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Bath, CheckCircle2, Upload, Wind, XCircle } from 'lucide-react'
import { uploadProductManual } from '@/features/myou/product-manuals-upload'
import type { ProductManual, ProductManualType } from '@/features/myou/types'
import { PRODUCT_MANUAL_LABELS } from '@/features/myou/types'
import {
  MYOU_PRODUCT_MANUAL_MAX_MB,
  PRODUCT_MANUAL_TYPES,
} from '@/features/myou/product-manuals-constants'

type Props = {
  initialManuals: ProductManual[]
}

export default function ProductManualUploadForm({ initialManuals }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [manualType, setManualType] = useState<ProductManualType>('aircon')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  /** 保存直後はプレビューを隠す。種別クリックで再表示 */
  const [showSavedPreview, setShowSavedPreview] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const manualsByType = useMemo(() => {
    const map = new Map<ProductManualType, ProductManual>()
    for (const m of initialManuals) {
      map.set(m.manual_type, m)
    }
    return map
  }, [initialManuals])

  const currentSaved = manualsByType.get(manualType)
  const showPreview = Boolean(previewUrl || (showSavedPreview && currentSaved))

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function onFileChange(next: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(next)
    setPreviewUrl(next ? URL.createObjectURL(next) : null)
    if (next) setShowSavedPreview(true)
    setMessage(null)
    setError(null)
  }

  function clearFileSelection() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setFile(null)
    setPreviewUrl(null)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('画像ファイルを選択してください。')
      return
    }

    const formData = new FormData()
    formData.set('manualType', manualType)
    formData.set('file', file)

    startTransition(async () => {
      setError(null)
      setMessage(null)
      const result = await uploadProductManual(formData)
      if (result.success === false) {
        setError(`保存に失敗しました：${result.error}`)
        return
      }
      // 保存後はプレビュー・ファイル選択をクリア（成功メッセージは残す）
      setShowSavedPreview(false)
      clearFileSelection()
      setMessage(
        `「${result.manual.label}」の保存が完了しました。公開ページ（QR）に反映されています。`
      )
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-700">
            取扱説明書の種別：クリックで現在の画像を表示します。
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRODUCT_MANUAL_TYPES.map(type => {
              const selected = manualType === type
              const Icon = type === 'aircon' ? Wind : Bath
              return (
                <label
                  key={type}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                    selected
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="manualType"
                    value={type}
                    checked={selected}
                    onChange={() => {
                      setManualType(type)
                      setShowSavedPreview(true)
                      setMessage(null)
                      setError(null)
                    }}
                    className="sr-only"
                  />
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {PRODUCT_MANUAL_LABELS[type]}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <label htmlFor="manual-image" className="text-xs font-semibold text-slate-700">
            画像ファイル（JPEG / PNG / GIF / WebP、最大 {MYOU_PRODUCT_MANUAL_MAX_MB}MB）
          </label>
          <input
            ref={fileInputRef}
            id="manual-image"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={e => onFileChange(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-emerald-700"
          />
        </div>

        {showPreview && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-700">
              {previewUrl ? '選択中プレビュー' : '保存済み画像'}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl ?? currentSaved?.public_url}
              alt={PRODUCT_MANUAL_LABELS[manualType]}
              className="max-h-80 w-full rounded-md object-contain bg-white"
            />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-800"
          >
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
            <p className="font-medium leading-snug">{error}</p>
          </div>
        )}
        {message && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <p className="font-medium leading-snug">{message}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !file}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
          {isPending ? '保存中…' : '画像を保存する'}
        </button>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-semibold text-slate-800 mb-2">保存状況</h3>
        <ul className="space-y-1.5">
          {PRODUCT_MANUAL_TYPES.map(type => {
            const saved = manualsByType.get(type)
            return (
              <li key={type} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-700">{PRODUCT_MANUAL_LABELS[type]}</span>
                <span className={saved ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                  {saved ? '登録済み' : '未登録'}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
