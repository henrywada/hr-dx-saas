'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechRecognitionResultLike = {
  isFinal: boolean
  0: { transcript: string }
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike> & {
    length: number
  }
}

type SpeechRecognitionErrorEventLike = {
  error: string
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isSpeechToTextSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null
}

function appendTranscript(base: string, addition: string): string {
  const trimmedAddition = addition.trim()
  if (!trimmedAddition) return base
  if (!base) return trimmedAddition
  const needsSpace = !/\s$/.test(base)
  return needsSpace ? `${base} ${trimmedAddition}` : `${base}${trimmedAddition}`
}

export type UseSpeechToTextOptions = {
  lang?: string
  /** フィールド全体の値（確定済みテキスト + 中間結果）を受け取る */
  onTranscript: (text: string) => void
  /** 音声認識開始時点のフィールド値のスナップショット */
  getBaseText: () => string
}

export function useSpeechToText({
  lang = 'ja-JP',
  onTranscript,
  getBaseText,
}: UseSpeechToTextOptions) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const wantListeningRef = useRef(false)
  const baseTextRef = useRef('')
  const finalChunkRef = useRef('')
  const onTranscriptRef = useRef(onTranscript)
  const getBaseTextRef = useRef(getBaseText)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    getBaseTextRef.current = getBaseText
  }, [getBaseText])

  useEffect(() => {
    setSupported(isSpeechToTextSupported())
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const stop = useCallback(() => {
    wantListeningRef.current = false
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (recognition) {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      try {
        recognition.stop()
      } catch {
        // 既に停止済み
      }
    }
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor()
    if (!Ctor) {
      setError(
        'このブラウザでは音声入力に対応していません。Chrome / Edge / Safari でお試しください。'
      )
      return
    }

    setError(null)
    stop()

    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true

    baseTextRef.current = getBaseTextRef.current()
    finalChunkRef.current = ''
    wantListeningRef.current = true
    recognitionRef.current = recognition

    recognition.onresult = event => {
      let interim = ''
      let newlyFinal = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const piece = result[0]?.transcript ?? ''
        if (result.isFinal) {
          newlyFinal += piece
        } else {
          interim += piece
        }
      }
      if (newlyFinal) {
        finalChunkRef.current = appendTranscript(finalChunkRef.current, newlyFinal)
      }
      const combined = appendTranscript(baseTextRef.current, finalChunkRef.current)
      const withInterim = interim.trim() ? appendTranscript(combined, interim) : combined
      onTranscriptRef.current(withInterim)
    }

    recognition.onerror = event => {
      if (event.error === 'aborted' || event.error === 'no-speech') {
        return
      }
      if (event.error === 'not-allowed') {
        setError('マイクの使用が拒否されました。ブラウザの設定で許可してください。')
      } else if (event.error === 'network') {
        setError('音声認識にネットワークが必要です。接続を確認してください。')
      } else {
        setError('音声入力でエラーが発生しました。もう一度お試しください。')
      }
      wantListeningRef.current = false
      setListening(false)
    }

    recognition.onend = () => {
      if (wantListeningRef.current && recognitionRef.current === recognition) {
        try {
          recognition.start()
          return
        } catch {
          setError('音声入力を再開できませんでした。もう一度マイクボタンを押してください。')
        }
      }
      wantListeningRef.current = false
      recognitionRef.current = null
      setListening(false)
    }

    try {
      recognition.start()
      setListening(true)
    } catch {
      setError('音声入力を開始できませんでした。')
      wantListeningRef.current = false
      recognitionRef.current = null
      setListening(false)
    }
  }, [lang, stop])

  const toggle = useCallback(() => {
    if (listening) {
      stop()
    } else {
      start()
    }
  }, [listening, start, stop])

  useEffect(() => {
    return () => {
      wantListeningRef.current = false
      const recognition = recognitionRef.current
      recognitionRef.current = null
      if (recognition) {
        recognition.onresult = null
        recognition.onerror = null
        recognition.onend = null
        try {
          recognition.abort()
        } catch {
          // 無視
        }
      }
    }
  }, [])

  return {
    supported,
    listening,
    error,
    clearError,
    start,
    stop,
    toggle,
  }
}
