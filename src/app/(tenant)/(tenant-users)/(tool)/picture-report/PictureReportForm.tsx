'use client'

// 画像送信フォーム（dx-sensor の SendPictureForm.tsx を移植。
// Client側の直接Supabase呼び出しは、Task 8 の sendPicture Server Action 呼び出しへ置き換えている）
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, Mic, MicOff, Send, Tag } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyTiltReading,
  captureHandheldFrame,
  mountFromDeviceTilt,
  type MountOrientation,
} from '@/lib/picture-report/captureFrameFromVideo'
import {
  DEFAULT_PICTURE_PRIORITY,
  PICTURE_PRIORITIES,
  PICTURE_PRIORITY_LABELS,
  type PicturePriority,
} from '@/lib/picture-report/priority'
import { useSpeechToText } from '@/lib/picture-report/useSpeechToText'
import { sendPicture } from '@/features/picture-report/actions'
import { APP_ROUTES } from '@/config/routes'
import type { AlbumItem, PictureSendSubject } from '@/features/picture-report/types'
import { SubjectManageModal } from './SubjectManageModal'

interface PictureReportFormProps {
  userEmail: string
  isManager: boolean
  initialSubjects: PictureSendSubject[]
  initialRecentSends: AlbumItem[]
}

type CameraState = 'idle' | 'starting' | 'ready' | 'denied' | 'unsupported' | 'error'
type SendStatus = 'idle' | 'sending' | 'done' | 'error'

const OTHER_SUBJECT_VALUE = '__other__'

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

async function requestMotionPermission(): Promise<void> {
  try {
    const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>
    }
    if (typeof DOE.requestPermission === 'function') {
      await DOE.requestPermission()
    }
  } catch {
    // 権限拒否時はシャッターが画面回転にフォールバックする
  }
}

export function PictureReportForm({
  userEmail,
  isManager,
  initialSubjects,
  initialRecentSends,
}: PictureReportFormProps) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const tiltMountRef = useRef<MountOrientation | null>(null)
  const tiltListenFromRef = useRef(0)
  const landscapeStreakRef = useRef(0)
  const onDeviceOrientationRef = useRef((event: DeviceOrientationEvent) => {
    if (Date.now() < tiltListenFromRef.current) return
    const reading = mountFromDeviceTilt(event.gamma, event.beta)
    const next = applyTiltReading(reading, landscapeStreakRef.current, tiltMountRef.current)
    landscapeStreakRef.current = next.landscapeStreak
    tiltMountRef.current = next.tilt
  })

  const [subjects, setSubjects] = useState<PictureSendSubject[]>(initialSubjects)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [adHocSubject, setAdHocSubject] = useState('')
  const [bodyText, setBodyText] = useState('')
  const bodyTextRef = useRef(bodyText)
  const getBodyText = useCallback(() => bodyTextRef.current, [])
  const [priority, setPriority] = useState<PicturePriority>(DEFAULT_PICTURE_PRIORITY)

  const {
    supported: speechSupported,
    listening: speechListening,
    error: speechError,
    clearError: clearSpeechError,
    stop: stopSpeech,
    toggle: toggleSpeech,
  } = useSpeechToText({
    onTranscript: setBodyText,
    getBaseText: getBodyText,
  })

  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [sendStatus, setSendStatus] = useState<SendStatus>('idle')
  const [sendError, setSendError] = useState<string | null>(null)

  const isOtherSubject = selectedSubjectId === OTHER_SUBJECT_VALUE

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }, [])

  const setPreviewFromBlob = useCallback(
    (blob: Blob) => {
      revokePreviewUrl()
      const url = URL.createObjectURL(blob)
      previewUrlRef.current = url
      setPreviewBlob(blob)
      setPreviewUrl(url)
    },
    [revokePreviewUrl]
  )

  const clearPreview = useCallback(() => {
    revokePreviewUrl()
    setPreviewBlob(null)
    setPreviewUrl(null)
  }, [revokePreviewUrl])

  const stopCamera = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', onDeviceOrientationRef.current)
    }
    tiltMountRef.current = null
    landscapeStreakRef.current = 0
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    bodyTextRef.current = bodyText
  }, [bodyText])

  useEffect(() => {
    return () => {
      stopCamera()
      revokePreviewUrl()
    }
  }, [stopCamera, revokePreviewUrl])

  useEffect(() => {
    if (sendStatus === 'sending' && speechListening) {
      stopSpeech()
    }
  }, [sendStatus, speechListening, stopSpeech])

  const startCamera = useCallback(async () => {
    setCameraState('starting')
    setCameraError(null)
    clearPreview()
    stopCamera()

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported')
      setCameraError(
        'このブラウザではカメラAPIを利用できません。HTTPSで開いているか確認してください。'
      )
      return
    }

    try {
      await requestMotionPermission()
      tiltMountRef.current = null
      landscapeStreakRef.current = 0
      tiltListenFromRef.current = Date.now() + 300
      if (typeof window !== 'undefined') {
        window.addEventListener('deviceorientation', onDeviceOrientationRef.current)
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })

      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }
      setCameraState('ready')
    } catch (err) {
      stopCamera()
      console.error('getUserMedia failed', err)
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraState('denied')
        setCameraError('カメラの使用が拒否されました。ブラウザの設定で許可してください。')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraState('error')
        setCameraError('利用可能なカメラが見つかりませんでした。')
      } else {
        setCameraState('error')
        setCameraError(err instanceof Error ? err.message : 'カメラの起動に失敗しました')
      }
    }
  }, [clearPreview, stopCamera])

  function handleShutter() {
    const video = videoRef.current
    if (!video || cameraState !== 'ready') return

    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) {
      setSendError('映像の準備ができていません。少し待ってから再度お試しください。')
      return
    }

    let canvas: HTMLCanvasElement
    try {
      canvas = captureHandheldFrame(video, tiltMountRef.current)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : '画像の生成に失敗しました。')
      return
    }
    canvas.toBlob(
      blob => {
        if (!blob) {
          setSendError('画像の生成に失敗しました。')
          return
        }
        setPreviewFromBlob(blob)
        stopCamera()
        setCameraState('idle')
      },
      'image/jpeg',
      0.92
    )
  }

  function resolveSubject(): { subjectId: string | null; subjectText: string } | null {
    if (!selectedSubjectId) {
      setSendError('件名を選択してください。')
      return null
    }

    if (isOtherSubject) {
      const trimmed = adHocSubject.trim()
      if (!trimmed) {
        setSendError('件名を入力してください。')
        return null
      }
      return { subjectId: null, subjectText: trimmed }
    }

    const subject = subjects.find(s => s.id === selectedSubjectId)
    if (!subject) {
      setSendError('選択した件名が見つかりません。再選択してください。')
      return null
    }

    return { subjectId: subject.id, subjectText: subject.label }
  }

  async function handleSend() {
    setSendError(null)

    if (!previewBlob) {
      setSendError('送信する画像がありません。撮影してください。')
      return
    }

    const subject = resolveSubject()
    if (!subject) return

    setSendStatus('sending')

    const formData = new FormData()
    formData.set('image', previewBlob, 'capture.jpg')
    formData.set('subjectId', subject.subjectId ?? '')
    formData.set('subjectText', subject.subjectText)
    formData.set('bodyText', bodyText)
    formData.set('priority', priority)

    const result = await sendPicture(formData)

    // 注意: `!result.success` ではなく `=== false` で判定している。
    // discriminated union（{success:true} | {success:false; error}）に対する
    // `!` による否定narrowingが本プロジェクトのTypeScript環境で正しく機能しないため
    // （`result.success === false` は正しくnarrowingされる）。
    if (result.success === false) {
      setSendStatus('error')
      setSendError(result.error)
      return
    }

    setSendStatus('done')
    setSelectedSubjectId('')
    setAdHocSubject('')
    stopSpeech()
    setBodyText('')
    setPriority(DEFAULT_PICTURE_PRIORITY)
    clearPreview()
    stopCamera()
    setCameraState('idle')
    router.refresh()
  }

  const showLiveCamera = cameraState === 'starting' || cameraState === 'ready'

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 p-6 pb-12">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-gray-900">画像送信</h1>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <Link
            href={APP_ROUTES.TENANT.TOOL_PICTURE_REPORT_ALBUM}
            className="font-medium text-primary transition-colors hover:text-gray-900"
          >
            アルバムを見る
          </Link>
          <Link
            href={APP_ROUTES.TENANT.PORTAL}
            className="font-medium text-primary transition-colors hover:text-gray-900"
          >
            ←戻る
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-900">件名</span>
            {isManager && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-md border border-gray-200 bg-white p-1.5 text-primary transition hover:border-primary/50 hover:bg-orange-50"
                aria-label="件名マスタ管理"
                title="件名マスタ管理"
              >
                <Tag className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}
          </span>
          <select
            value={selectedSubjectId}
            onChange={e => {
              setSelectedSubjectId(e.target.value)
              setSendError(null)
            }}
            disabled={sendStatus === 'sending'}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            <option value="">選択してください</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.label}
              </option>
            ))}
            <option value={OTHER_SUBJECT_VALUE}>（その他・都度入力）</option>
          </select>
        </label>

        {isOtherSubject && (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-900">件名（都度入力）</span>
            <input
              type="text"
              value={adHocSubject}
              onChange={e => setAdHocSubject(e.target.value)}
              placeholder="例: ○○について"
              disabled={sendStatus === 'sending'}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </label>
        )}

        <div className="block space-y-1.5">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-900">本文</span>
            {speechSupported && (
              <button
                type="button"
                onClick={() => {
                  clearSpeechError()
                  toggleSpeech()
                }}
                disabled={sendStatus === 'sending'}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                  speechListening
                    ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-gray-200 bg-white text-primary hover:border-primary/50 hover:bg-orange-50'
                }`}
                aria-label={speechListening ? '音声入力を停止' : '音声入力を開始'}
                title={speechListening ? '音声入力を停止' : '音声入力'}
              >
                <span>音声入力→</span>
                {speechListening ? (
                  <MicOff className="h-4 w-4" strokeWidth={1.75} />
                ) : (
                  <Mic className="h-4 w-4" strokeWidth={1.75} />
                )}
              </button>
            )}
          </span>
          <textarea
            value={bodyText}
            onChange={e => {
              if (speechListening) stopSpeech()
              setBodyText(e.target.value)
            }}
            rows={4}
            placeholder="メモや報告内容を入力"
            disabled={sendStatus === 'sending'}
            className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          {speechListening && (
            <p className="text-xs text-primary">音声入力中… もう一度マイクを押すと停止します</p>
          )}
          {speechError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
              {speechError}
            </p>
          )}
        </div>
      </div>

      <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <legend className="float-left mr-1 w-auto p-0 text-sm font-medium text-gray-900">
          優先度：
        </legend>
        {PICTURE_PRIORITIES.map(value => (
          <label
            key={value}
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-gray-900"
          >
            <input
              type="radio"
              name="picture-priority"
              value={value}
              checked={priority === value}
              onChange={() => setPriority(value)}
              disabled={sendStatus === 'sending'}
              className="accent-primary"
            />
            <span>{PICTURE_PRIORITY_LABELS[value]}</span>
          </label>
        ))}
      </fieldset>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => void startCamera()}
          disabled={cameraState === 'starting' || sendStatus === 'sending'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition hover:border-primary/50 disabled:opacity-50"
        >
          <Camera className="h-4 w-4 text-primary" strokeWidth={1.75} />
          {cameraState === 'starting' ? 'カメラ起動中...' : '画像撮影'}
        </button>

        {(showLiveCamera || previewUrl) && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-black">
            <div className="relative aspect-[3/4] w-full bg-black">
              {showLiveCamera && (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`h-full w-full object-cover ${cameraState === 'ready' ? 'opacity-100' : 'opacity-0'}`}
                />
              )}
              {previewUrl && !showLiveCamera && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="撮影プレビュー"
                  className="h-full w-full object-contain"
                />
              )}
              {showLiveCamera && cameraState === 'starting' && (
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
                  <p className="text-sm text-white/90">カメラを起動しています...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {cameraState === 'ready' && (
          <button
            type="button"
            onClick={handleShutter}
            className="w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            シャッター
          </button>
        )}

        {(cameraState === 'denied' || cameraState === 'unsupported' || cameraState === 'error') && (
          <>
            {cameraError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{cameraError}</p>
            )}
            <button
              type="button"
              onClick={() => void startCamera()}
              className="w-full rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:border-primary/50"
            >
              カメラを再試行
            </button>
          </>
        )}

        {previewUrl && (
          <button
            type="button"
            onClick={() => {
              clearPreview()
              void startCamera()
            }}
            disabled={sendStatus === 'sending'}
            className="w-full rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 transition hover:border-primary/50 disabled:opacity-50"
          >
            撮り直す
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={sendStatus === 'sending' || !previewBlob}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send className="h-4 w-4" strokeWidth={1.75} />
        {sendStatus === 'sending' ? '送信中...' : '送信'}
      </button>

      {sendStatus === 'done' && (
        <p className="rounded-md bg-orange-50 px-3 py-2 text-sm text-primary">
          送信が完了しました。
        </p>
      )}

      {(sendStatus === 'error' || sendError) && sendStatus !== 'done' && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {sendError ?? 'エラーが発生しました。もう一度お試しください。'}
        </p>
      )}

      <section className="border-t border-gray-200 pt-6">
        <h2 className="text-sm font-bold text-gray-900">直近の送信</h2>
        <p className="mt-1 text-xs text-gray-500">
          最新 {initialRecentSends.length} 件（自分の送信のみ）
        </p>

        {initialRecentSends.length === 0 && (
          <p className="mt-4 text-sm text-gray-500">まだ送信がありません。</p>
        )}

        <ul className="mt-4 space-y-3">
          {initialRecentSends.map(send => (
            <li key={send.id} className="flex gap-3 rounded-md border border-gray-200 bg-white p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                {send.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={send.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-500">
                    画像なし
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">
                  {formatTimestamp(send.created_at)}
                  <span className="ml-2">優先度：{PICTURE_PRIORITY_LABELS[send.priority]}</span>
                </p>
                <p className="mt-0.5 truncate text-sm font-medium text-gray-900">
                  {send.subject_text}
                </p>
                {send.body_text && (
                  <p className="mt-0.5 text-xs text-gray-500">{truncate(send.body_text, 60)}</p>
                )}
                <p className="mt-1 text-[11px] text-gray-500">{userEmail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {isManager && (
        <SubjectManageModal
          open={modalOpen}
          subjects={subjects}
          onClose={() => setModalOpen(false)}
          onSubjectsChanged={() => {
            router.refresh()
            setSubjects(prev => prev)
          }}
        />
      )}
    </div>
  )
}
