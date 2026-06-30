'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  uploadScormPackage,
  saveXapiLaunchUrl,
  resetCourseContentFormat,
} from '../scorm-actions'
import type { ElScormPackage } from '../scorm-queries'
import type { CourseContentFormat } from '../types'

interface Props {
  courseId: string
  contentFormat: CourseContentFormat
  packageInfo: ElScormPackage | null
}

const FORMAT_LABELS: Record<CourseContentFormat, string> = {
  native: '自社スライド（標準）',
  scorm_12: 'SCORM 1.2 パッケージ',
  xapi_launch: 'xAPI 外部起動 URL',
}

export function ScormPackagePanel({ courseId, contentFormat, packageInfo }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [xapiUrl, setXapiUrl] = useState(packageInfo?.package_type === 'xapi_launch' ? packageInfo.launch_path : '')
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleScormUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setMessage({ type: 'err', text: 'ZIP ファイルを選択してください' })
      return
    }
    const fd = new FormData()
    fd.append('file', file)
    setMessage(null)
    startTransition(async () => {
      const result = await uploadScormPackage({ courseId, formData: fd })
      setMessage(
        result.success
          ? { type: 'ok', text: `SCORM パッケージを登録しました（起動: ${result.launchPath}）` }
          : { type: 'err', text: result.error ?? '失敗' },
      )
      if (result.success) router.refresh()
    })
  }

  function handleXapiSave() {
    setMessage(null)
    startTransition(async () => {
      const result = await saveXapiLaunchUrl({ courseId, launchUrl: xapiUrl })
      setMessage(
        result.success
          ? { type: 'ok', text: 'xAPI 起動 URL を登録しました' }
          : { type: 'err', text: result.error ?? '失敗' },
      )
      if (result.success) router.refresh()
    })
  }

  function handleReset() {
    if (!confirm('外部パッケージ設定を解除し、自社スライド形式に戻しますか？')) return
    startTransition(async () => {
      const result = await resetCourseContentFormat(courseId)
      setMessage(
        result.success
          ? { type: 'ok', text: '自社スライド形式に戻しました' }
          : { type: 'err', text: result.error ?? '失敗' },
      )
      if (result.success) router.refresh()
    })
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 shadow-xs">
      <div>
        <h2 className="text-sm font-bold text-gray-900">コンテンツ形式（EL-C2）</h2>
        <p className="text-xs text-gray-500 mt-1">
          現在: <span className="font-medium text-gray-700">{FORMAT_LABELS[contentFormat]}</span>
        </p>
      </div>

      {message && (
        <p className={`text-xs ${message.type === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
      )}

      {packageInfo && contentFormat !== 'native' && (
        <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600 space-y-1">
          {packageInfo.package_type === 'scorm_12' && (
            <>
              <div>ファイル: {packageInfo.original_filename ?? '—'}</div>
              <div>起動パス: {packageInfo.launch_path}</div>
            </>
          )}
          {packageInfo.package_type === 'xapi_launch' && <div>URL: {packageInfo.launch_path}</div>}
          <div>登録: {new Date(packageInfo.uploaded_at).toLocaleString('ja-JP')}</div>
        </div>
      )}

      <div className="space-y-3 border-t border-gray-100 pt-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">SCORM 1.2 ZIP アップロード</label>
          <input ref={fileRef} type="file" accept=".zip,application/zip" className="text-xs w-full" />
          <button
            type="button"
            disabled={isPending}
            onClick={handleScormUpload}
            className="mt-2 px-3 py-1.5 text-xs rounded-lg bg-[#FD7601] text-white disabled:opacity-50"
          >
            {isPending ? 'アップロード中…' : 'SCORM を登録'}
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">xAPI 外部起動 URL</label>
          <input
            value={xapiUrl}
            onChange={e => setXapiUrl(e.target.value)}
            placeholder="https://example.com/launch"
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={handleXapiSave}
            className="mt-2 px-3 py-1.5 text-xs rounded-lg border border-[#FD7601] text-[#FD7601] disabled:opacity-50"
          >
            xAPI URL を保存
          </button>
        </div>

        {contentFormat !== 'native' && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-red-600 underline"
          >
            自社スライド形式に戻す
          </button>
        )}
      </div>
    </section>
  )
}
